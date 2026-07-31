import { and, asc, desc, eq, inArray, isNull, sql as rawSql } from "drizzle-orm"
import { randomUUID } from "crypto"
import { getDb, tables } from "@/lib/db"
import type {
  BotProfile,
  Dart,
  DartInput,
  Game,
  GameMode,
  GameState,
  Leg,
  Metrics,
  Player,
  PracticeConfig,
  PracticeGameDefinition,
  PracticeGameKey,
  ResultMetrics,
  Ring,
  Session,
} from "@/lib/types"
import {
  annotateGame,
  computeStats,
  deriveGameState,
  isLegalSegment,
  scoreOf,
  type DeriveConfig,
} from "@/lib/scoring"
import { dartTargetFor, derivePracticeState, isPracticeKey } from "@/lib/practice"
import { HttpError } from "./errors"

/**
 * Phase 2 service layer: the same contract the MSW handlers mock, served
 * from Neon via Drizzle. Every score is still derived by replaying the
 * dart log through the pure engines — the database stores events, not
 * results (ADR 0003; the results table remains a non-authoritative cache).
 */

/** Reuse an open session under three hours old; close stale ones. */
const SESSION_STALE_MS = 3 * 60 * 60 * 1000

type Db = ReturnType<typeof getDb>

const stripSeq = (row: typeof tables.darts.$inferSelect): Dart => {
  const { seq: _seq, ...dart } = row
  return dart as Dart
}

async function getGameRow(db: Db, gameId: string): Promise<Game> {
  const rows = await db.select().from(tables.games).where(eq(tables.games.id, gameId))
  if (rows.length === 0) throw new HttpError(404, "Game not found")
  return rows[0] as Game
}

async function getGameDarts(db: Db, gameId: string): Promise<Dart[]> {
  const rows = await db
    .select({ dart: tables.darts })
    .from(tables.darts)
    .innerJoin(tables.visits, eq(tables.darts.visitId, tables.visits.id))
    .innerJoin(tables.legs, eq(tables.visits.legId, tables.legs.id))
    .where(eq(tables.legs.gameId, gameId))
    .orderBy(asc(tables.darts.seq))
  return rows.map((r) => stripSeq(r.dart))
}

function deriveConfigFor(game: Game): DeriveConfig {
  const cfg = game.config as { startingScore?: number; legsToWin?: number }
  return {
    startingScore: cfg.startingScore ?? 501,
    legsToWin: cfg.legsToWin ?? 1,
    players: game.participantPlayerIds,
  }
}

function buildGameState(game: Game, darts: Dart[]): GameState {
  const state = deriveGameState(darts, deriveConfigFor(game))
  if (isPracticeKey(game.mode)) {
    state.practice = derivePracticeState(
      darts,
      game.mode as PracticeGameKey,
      game.config as PracticeConfig
    )
    if (state.practice.complete) state.gameComplete = true
  }
  return state
}

function toResultMetrics(m: Metrics, gameScore: number | null): ResultMetrics {
  const round2 = (n: number) => Math.round(n * 100) / 100
  return {
    threeDartAverage: round2(m.threeDartAverage),
    firstNineAverage: round2(m.firstNineAverage),
    dartsThrown: m.dartsThrown,
    checkoutPct: m.checkoutPct === null ? null : round2(m.checkoutPct),
    doublesAttempted: m.doublesAttempted,
    doublesHit: m.doublesHit,
    bestVisit: m.bestVisit,
    count180: m.count180,
    count140plus: m.count140plus,
    count100plus: m.count100plus,
    gameScore,
  }
}

async function ensureSession(db: Db, playerId: string): Promise<string> {
  const open = await db
    .select()
    .from(tables.sessions)
    .where(and(eq(tables.sessions.playerId, playerId), isNull(tables.sessions.endedAt)))
    .orderBy(desc(tables.sessions.startedAt))
  const now = Date.now()
  for (const session of open) {
    if (now - Date.parse(session.startedAt) < SESSION_STALE_MS) return session.id
    await db
      .update(tables.sessions)
      .set({ endedAt: new Date().toISOString() })
      .where(eq(tables.sessions.id, session.id))
  }
  const id = `session-${randomUUID()}`
  await db.insert(tables.sessions).values({
    id,
    playerId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    note: null,
  })
  return id
}

async function reconcileGame(db: Db, game: Game, darts: Dart[]): Promise<void> {
  if (isPracticeKey(game.mode)) return
  const annotated = annotateGame(darts, deriveConfigFor(game))
  const legRows = await db.select().from(tables.legs).where(eq(tables.legs.gameId, game.id))
  for (const leg of annotated) {
    const row = legRows.find((l) => l.index === leg.index)
    if (row && row.winnerPlayerId !== leg.winnerPlayerId) {
      await db
        .update(tables.legs)
        .set({ winnerPlayerId: leg.winnerPlayerId })
        .where(eq(tables.legs.id, row.id))
    }
  }
}

async function finaliseGame(db: Db, game: Game, darts: Dart[], state: GameState): Promise<void> {
  const endedAt = new Date().toISOString()
  await db.update(tables.games).set({ endedAt }).where(eq(tables.games.id, game.id))
  for (const playerId of game.participantPlayerIds) {
    const metrics = computeStats(darts, playerId, deriveConfigFor(game))
    await db.insert(tables.results).values({
      id: `result-${randomUUID()}`,
      gameId: game.id,
      playerId,
      metrics: toResultMetrics(metrics, state.practice?.finalScore ?? null),
      computedAt: endedAt,
    })
  }
}

// ── public service surface ─────────────────────────────────────────────────

export async function createGame(body: {
  mode: GameMode
  config: Record<string, unknown>
  participantPlayerIds: string[]
}): Promise<{ game: Game; gameState: GameState }> {
  const db = getDb()
  if (!body.participantPlayerIds?.length) {
    throw new HttpError(400, "participantPlayerIds is required")
  }
  const playerRows = await db
    .select()
    .from(tables.players)
    .where(inArray(tables.players.id, body.participantPlayerIds))
  for (const id of body.participantPlayerIds) {
    if (!playerRows.some((p) => p.id === id)) throw new HttpError(400, `Unknown player ${id}`)
  }
  const human = body.participantPlayerIds.find(
    (id) => !playerRows.find((p) => p.id === id)?.isBot
  )
  const sessionId = await ensureSession(db, human ?? body.participantPlayerIds[0])

  const config = { ...body.config }
  if (isPracticeKey(body.mode) && typeof config.rngSeed !== "number") {
    config.rngSeed = Math.floor(Math.random() * 2 ** 31)
  }

  const game: Game = {
    id: `game-${randomUUID()}`,
    sessionId,
    mode: body.mode,
    config: config as Game["config"],
    participantPlayerIds: body.participantPlayerIds,
    startedAt: new Date().toISOString(),
    endedAt: null,
    abandoned: false,
  }
  await db.insert(tables.games).values(game)
  await db.insert(tables.legs).values({
    id: `leg-${randomUUID()}`,
    gameId: game.id,
    index: 0,
    startingScore:
      body.mode === "x01"
        ? ((config.startingScore as number) ?? 501)
        : body.mode === "bobs-27"
          ? 27
          : null,
    startingPlayerId: body.participantPlayerIds[0],
    winnerPlayerId: null,
  })
  return { game, gameState: buildGameState(game, []) }
}

export async function getGameBundle(gameId: string) {
  const db = getDb()
  const game = await getGameRow(db, gameId)
  const darts = await getGameDarts(db, gameId)
  const playerRows = await db
    .select()
    .from(tables.players)
    .where(inArray(tables.players.id, game.participantPlayerIds))
  const players = game.participantPlayerIds
    .map((id) => playerRows.find((p) => p.id === id))
    .filter(Boolean) as Player[]
  const profileIds = players.filter((p) => p.isBot).map((p) => p.botProfileId!)
  const botProfiles =
    profileIds.length > 0
      ? ((await db
          .select()
          .from(tables.botProfiles)
          .where(inArray(tables.botProfiles.id, profileIds))) as BotProfile[])
      : []
  return { game, darts, gameState: buildGameState(game, darts), players, botProfiles }
}

export async function addDart(
  gameId: string,
  body: DartInput
): Promise<{ dart: Dart; gameState: GameState }> {
  const db = getDb()
  const game = await getGameRow(db, gameId)
  if (game.endedAt) throw new HttpError(409, "The game is already complete")
  if (!isLegalSegment(body.segment, body.ring)) {
    throw new HttpError(400, `Illegal segment ${body.segment} ${body.ring}`)
  }

  const darts = await getGameDarts(db, gameId)
  const preState = buildGameState(game, darts)
  if (preState.gameComplete) throw new HttpError(409, "The game is already complete")

  let visitId: string
  let dartIndex: number
  let target = { targetSegment: body.targetSegment, targetRing: body.targetRing }

  if (isPracticeKey(game.mode)) {
    const practice = derivePracticeState(
      darts,
      game.mode as PracticeGameKey,
      game.config as PracticeConfig
    )
    target = dartTargetFor(practice)
    const legRows = await db.select().from(tables.legs).where(eq(tables.legs.gameId, gameId))
    if (darts.length % 3 === 0) {
      visitId = `visit-${randomUUID()}`
      await db.insert(tables.visits).values({
        id: visitId,
        legId: legRows[0].id,
        playerId: game.participantPlayerIds[0],
        index: darts.length / 3,
        bust: false,
      })
    } else {
      visitId = darts[darts.length - 1].visitId
    }
    dartIndex = darts.length % 3
  } else {
    const cfg = deriveConfigFor(game)
    const legIndex = preState.legComplete ? preState.legIndex + 1 : preState.legIndex
    const legRows = await db.select().from(tables.legs).where(eq(tables.legs.gameId, gameId))
    let legRow = legRows.find((l) => l.index === legIndex)
    if (!legRow) {
      const newLeg = {
        id: `leg-${randomUUID()}`,
        gameId,
        index: legIndex,
        startingScore: cfg.startingScore,
        startingPlayerId: cfg.players[legIndex % cfg.players.length],
        winnerPlayerId: null,
      }
      await db.insert(tables.legs).values(newLeg)
      legRow = newLeg
    }
    if (!preState.legComplete && preState.currentVisit.length > 0) {
      visitId = preState.currentVisit[0].visitId
      dartIndex = preState.currentVisit.length
    } else {
      const playerId = preState.legComplete
        ? cfg.players[legIndex % cfg.players.length]
        : preState.currentPlayerId
      const priorVisits = await db
        .select({ count: rawSql<number>`count(*)::int` })
        .from(tables.visits)
        .where(and(eq(tables.visits.legId, legRow.id), eq(tables.visits.playerId, playerId)))
      visitId = `visit-${randomUUID()}`
      await db.insert(tables.visits).values({
        id: visitId,
        legId: legRow.id,
        playerId,
        index: priorVisits[0]?.count ?? 0,
        bust: false,
      })
      dartIndex = 0
    }
  }

  const dart: Dart = {
    id: `dart-${randomUUID()}`,
    visitId,
    index: dartIndex as 0 | 1 | 2,
    segment: body.segment,
    ring: body.ring as Ring,
    score: scoreOf({ segment: body.segment, ring: body.ring }),
    targetSegment: target.targetSegment,
    targetRing: target.targetRing,
    thrownAt: new Date().toISOString(),
    latencyMs: body.latencyMs ?? null,
  }
  await db.insert(tables.darts).values(dart)

  const newDarts = [...darts, dart]
  const state = buildGameState(game, newDarts)

  if (state.lastVisit?.bust && state.lastVisit.darts.some((d) => d.id === dart.id)) {
    await db.update(tables.visits).set({ bust: true }).where(eq(tables.visits.id, visitId))
  }
  await reconcileGame(db, game, newDarts)
  if (state.gameComplete) await finaliseGame(db, game, newDarts, state)

  return { dart, gameState: state }
}

export async function undoLastDart(gameId: string): Promise<{ gameState: GameState }> {
  const db = getDb()
  const game = await getGameRow(db, gameId)
  if (game.endedAt) throw new HttpError(409, "The game has ended")
  const darts = await getGameDarts(db, gameId)
  if (darts.length === 0) throw new HttpError(409, "No darts to undo")

  const last = darts[darts.length - 1]
  await db.delete(tables.darts).where(eq(tables.darts.id, last.id))

  const remaining = await db
    .select()
    .from(tables.darts)
    .where(eq(tables.darts.visitId, last.visitId))
  if (remaining.length === 0) {
    const visitRows = await db
      .select()
      .from(tables.visits)
      .where(eq(tables.visits.id, last.visitId))
    await db.delete(tables.visits).where(eq(tables.visits.id, last.visitId))
    const visit = visitRows[0]
    if (visit) {
      const legVisits = await db
        .select()
        .from(tables.visits)
        .where(eq(tables.visits.legId, visit.legId))
      if (legVisits.length === 0) {
        const legRows = await db.select().from(tables.legs).where(eq(tables.legs.id, visit.legId))
        if (legRows[0] && legRows[0].index > 0) {
          await db.delete(tables.legs).where(eq(tables.legs.id, visit.legId))
        }
      }
    }
  } else {
    // The undone dart may have been the one that busted the visit.
    await db.update(tables.visits).set({ bust: false }).where(eq(tables.visits.id, last.visitId))
  }

  const newDarts = darts.slice(0, -1)
  await reconcileGame(db, game, newDarts)
  return { gameState: buildGameState(game, newDarts) }
}

export async function startNextLeg(gameId: string): Promise<{ leg: Leg; gameState: GameState }> {
  const db = getDb()
  const game = await getGameRow(db, gameId)
  if (game.endedAt) throw new HttpError(409, "The game is already complete")
  const cfg = deriveConfigFor(game)
  const legRows = await db.select().from(tables.legs).where(eq(tables.legs.gameId, gameId))
  const index = legRows.length
  const leg: Leg = {
    id: `leg-${randomUUID()}`,
    gameId,
    index,
    startingScore: cfg.startingScore,
    startingPlayerId: cfg.players[index % cfg.players.length],
    winnerPlayerId: null,
  }
  await db.insert(tables.legs).values(leg)
  const darts = await getGameDarts(db, gameId)
  return { leg, gameState: buildGameState(game, darts) }
}

export async function abandonGame(gameId: string): Promise<{ ok: boolean }> {
  const db = getDb()
  const game = await getGameRow(db, gameId)
  if (game.endedAt) throw new HttpError(409, "The game is already complete")
  await db.update(tables.games).set({ abandoned: true }).where(eq(tables.games.id, gameId))
  return { ok: true }
}

export async function listBotProfiles(): Promise<{ profiles: BotProfile[] }> {
  const db = getDb()
  return { profiles: (await db.select().from(tables.botProfiles)) as BotProfile[] }
}

export async function listPlayers(): Promise<{ players: Player[] }> {
  const db = getDb()
  return { players: (await db.select().from(tables.players)) as Player[] }
}

export async function practiceGames(playerId: string) {
  const db = getDb()
  const definitions = (await db
    .select()
    .from(tables.practiceGameDefinitions)) as PracticeGameDefinition[]
  const gameRows = (await db.select().from(tables.games)).filter(
    (g) => g.mode !== "x01" && g.endedAt && !g.abandoned
  ) as Game[]
  const resultRows = await db.select().from(tables.results)

  const personalBests: Record<string, { score: number; achievedAt: string } | null> = {}
  for (const def of definitions) {
    let best: { score: number; achievedAt: string } | null = null
    for (const game of gameRows.filter((g) => g.mode === def.key)) {
      const result = resultRows.find((r) => r.gameId === game.id && r.playerId === playerId)
      const score = (result?.metrics as ResultMetrics | undefined)?.gameScore
      if (score === null || score === undefined) continue
      const better =
        best === null ||
        (def.personalBestDirection === "lower-is-better" ? score < best.score : score > best.score)
      if (better) best = { score, achievedAt: game.endedAt! }
    }
    personalBests[def.key] = best
  }
  return { definitions, personalBests }
}

// ── stats and history ──────────────────────────────────────────────────────

const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

export interface StatsFilters {
  from: string | null
  to: string | null
  includeBots: boolean
  includeTwoPlayer: boolean
  source: "practice" | "all"
  playerId: string
}

export async function stats(f: StatsFilters) {
  const db = getDb()
  const playerRows = (await db.select().from(tables.players)) as Player[]
  const sessionRows = (await db.select().from(tables.sessions)) as Session[]
  const allGames = (await db.select().from(tables.games)) as Game[]

  const isBot = (id: string) => playerRows.find((p) => p.id === id)?.isBot ?? false
  // Filtering happens on the game list before any dart log is read —
  // never on computed metrics.
  const games = allGames
    .filter((g) => g.participantPlayerIds.includes(f.playerId))
    .filter((g) => {
      const hasBot = g.participantPlayerIds.some(isBot)
      const humans = g.participantPlayerIds.filter((id) => !isBot(id))
      if (!f.includeBots && hasBot) return false
      if (!f.includeTwoPlayer && humans.length > 1) return false
      const session = sessionRows.find((s) => s.id === g.sessionId)
      const date = session?.startedAt ?? g.startedAt
      if (f.from && date < f.from) return false
      if (f.to && date > f.to) return false
      return true
    })

  const dartsByGame = new Map<string, Dart[]>()
  for (const game of games) dartsByGame.set(game.id, await getGameDarts(db, game.id))

  const x01Games = games.filter((g) => g.mode === "x01")
  const practiceGameRows = games.filter((g) => g.mode !== "x01")

  const bySession = new Map<string, Game[]>()
  for (const g of x01Games) bySession.set(g.sessionId, [...(bySession.get(g.sessionId) ?? []), g])

  const metricsFor = (game: Game) =>
    computeStats(dartsByGame.get(game.id) ?? [], f.playerId, deriveConfigFor(game))

  const trend: Array<{
    sessionId: string
    date: string
    threeDartAverage: number
    legCount: number
  }> = []
  const legCounts = new Map<string, number>()
  const legRows = await db.select().from(tables.legs)
  for (const [sessionId, sessionGames] of bySession) {
    const session = sessionRows.find((s) => s.id === sessionId)
    if (!session) continue
    let scored = 0
    let thrown = 0
    let legCount = 0
    for (const game of sessionGames) {
      const m = metricsFor(game)
      scored += (m.threeDartAverage / 3) * m.dartsThrown
      thrown += m.dartsThrown
      legCount += legRows.filter((l) => l.gameId === game.id).length
    }
    if (thrown === 0) continue
    legCounts.set(sessionId, legCount)
    trend.push({
      sessionId,
      date: session.startedAt,
      threeDartAverage: Math.round((scored / thrown) * 3 * 100) / 100,
      legCount,
    })
  }
  trend.sort((a, b) => (a.date < b.date ? -1 : 1))

  const rolling = (slice: typeof trend) => {
    let scored = 0
    let thrown = 0
    for (const point of slice) {
      for (const game of bySession.get(point.sessionId) ?? []) {
        const m = metricsFor(game)
        scored += (m.threeDartAverage / 3) * m.dartsThrown
        thrown += m.dartsThrown
      }
    }
    return thrown > 0 ? (scored / thrown) * 3 : null
  }
  const headlineAvg = rolling(trend.slice(-10))
  const previousAvg = rolling(trend.slice(-20, -10))

  const bySegment: Record<string, { attempts: number; hits: number }> = {}
  let attemptsAreInferred = false
  const addGame = (game: Game) => {
    const m = metricsFor(game)
    if (m.checkoutPctIsInferred && m.doublesAttempted > 0) attemptsAreInferred = true
    for (const [key, v] of Object.entries(m.doublesBySegment)) {
      bySegment[key] ??= { attempts: 0, hits: 0 }
      bySegment[key].attempts += v.attempts
      bySegment[key].hits += v.hits
    }
  }
  for (const game of practiceGameRows) addGame(game)
  if (f.source === "all") for (const game of x01Games) addGame(game)

  const doubles = [...BOARD_ORDER, 25].map((segment) => {
    const cell = bySegment[String(segment)] ?? { attempts: 0, hits: 0 }
    return {
      segment,
      ring: "D" as const,
      attempts: cell.attempts,
      hits: cell.hits,
      rate: cell.attempts >= 5 ? Math.round((cell.hits / cell.attempts) * 1000) / 10 : null,
    }
  })

  let count180 = 0
  let count140plus = 0
  let count100plus = 0
  let bestLegDarts: number | null = null
  let bestCheckout: number | null = null
  for (const game of x01Games) {
    const m = metricsFor(game)
    count180 += m.count180
    count140plus += m.count140plus
    count100plus += m.count100plus
    if (m.bestLegInDarts !== null && (bestLegDarts === null || m.bestLegInDarts < bestLegDarts))
      bestLegDarts = m.bestLegInDarts
    if (m.bestCheckout !== null && (bestCheckout === null || m.bestCheckout > bestCheckout))
      bestCheckout = m.bestCheckout
  }

  return {
    headline: {
      threeDartAverage: headlineAvg === null ? null : Math.round(headlineAvg * 100) / 100,
      sessionCount: trend.slice(-10).length,
      deltaVsPrevious:
        headlineAvg !== null && previousAvg !== null
          ? Math.round((headlineAvg - previousAvg) * 100) / 100
          : null,
    },
    trend,
    doubles,
    counts: { count180, count140plus, count100plus, bestLegDarts, bestCheckout },
    attemptsAreInferred,
  }
}

export async function listSessions(limit: number, cursor: number, playerId: string) {
  const db = getDb()
  const all = (
    (await db
      .select()
      .from(tables.sessions)
      .where(eq(tables.sessions.playerId, playerId))) as Session[]
  ).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
  const page = all.slice(cursor, cursor + limit)

  const sessions = []
  for (const session of page) {
    const games = (await db
      .select()
      .from(tables.games)
      .where(eq(tables.games.sessionId, session.id))) as Game[]
    let scored = 0
    let thrown = 0
    for (const game of games.filter((g) => g.mode === "x01")) {
      const m = computeStats(await getGameDarts(db, game.id), playerId, deriveConfigFor(game))
      scored += (m.threeDartAverage / 3) * m.dartsThrown
      thrown += m.dartsThrown
    }
    const modes = [...new Set(games.map((g) => (g.mode === "x01" ? "501" : g.mode)))]
    const resultRows = await db.select().from(tables.results)
    const legRows = await db.select().from(tables.legs)
    sessions.push({
      ...session,
      gameCount: games.length,
      threeDartAverage: thrown > 0 ? Math.round((scored / thrown) * 3 * 100) / 100 : null,
      summary: modes.join(", ") || "No games",
      games: games.map((g) => ({
        id: g.id,
        mode: g.mode,
        endedAt: g.endedAt,
        abandoned: g.abandoned,
        participantPlayerIds: g.participantPlayerIds,
        winnerPlayerId:
          legRows.filter((l) => l.gameId === g.id).find((l) => l.winnerPlayerId)
            ?.winnerPlayerId ?? null,
        metrics:
          (resultRows.find((r) => r.gameId === g.id && r.playerId === playerId)
            ?.metrics as ResultMetrics | undefined) ?? null,
      })),
    })
  }

  return {
    sessions,
    nextCursor: cursor + limit < all.length ? String(cursor + limit) : null,
  }
}

export async function replay(gameId: string) {
  const db = getDb()
  const game = await getGameRow(db, gameId)
  const darts = await getGameDarts(db, gameId)
  const annotated = annotateGame(darts, deriveConfigFor(game))
  const playerRows = await db
    .select()
    .from(tables.players)
    .where(inArray(tables.players.id, game.participantPlayerIds))
  const visits = annotated.flatMap((leg) =>
    leg.visits.map((v) => ({
      visit: { legIndex: leg.index, playerId: v.playerId, index: v.visitIndex, bust: v.bust },
      darts: v.darts.map((ad) => ad.dart),
      visitScore: v.scored,
      remainingAfter: v.scoreAfter,
      bust: v.bust,
      checkout: v.checkout,
    }))
  )
  return {
    game,
    players: game.participantPlayerIds.map((id) => playerRows.find((p) => p.id === id) ?? null),
    visits,
  }
}

export async function usage() {
  const db = getDb()
  const [players, sessions, games, darts] = await Promise.all([
    db.select({ n: rawSql<number>`count(*)::int` }).from(tables.players),
    db.select({ n: rawSql<number>`count(*)::int` }).from(tables.sessions),
    db.select({ n: rawSql<number>`count(*)::int` }).from(tables.games),
    db.select({ n: rawSql<number>`count(*)::int` }).from(tables.darts),
  ])
  return {
    players: players[0].n,
    sessions: sessions[0].n,
    games: games[0].n,
    darts: darts[0].n,
  }
}
