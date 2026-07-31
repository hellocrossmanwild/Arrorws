import type {
  Dart,
  Game,
  GameState,
  Metrics,
  PracticeConfig,
  PracticeGameKey,
  ResultMetrics,
  X01Config,
} from "@/lib/types"
import { computeStats, deriveGameState, type DeriveConfig } from "@/lib/scoring"
import { derivePracticeState, isPracticeKey } from "@/lib/practice"
import { store } from "../data/store"

export function getGameDarts(gameId: string): Dart[] {
  const legIds = store.legs.list({ gameId } as { gameId: string }).map((l) => l.id)
  const visitIds = new Set(
    legIds.flatMap((legId) => store.visits.list({ legId } as { legId: string }).map((v) => v.id))
  )
  return store.darts
    .list()
    .filter((d) => visitIds.has(d.visitId))
    .sort((a, b) =>
      a.thrownAt === b.thrownAt ? a.index - b.index : a.thrownAt < b.thrownAt ? -1 : 1
    )
}

export function deriveConfigFor(game: Game): DeriveConfig {
  const cfg = game.config as Partial<X01Config>
  return {
    startingScore: cfg.startingScore ?? 501,
    legsToWin: cfg.legsToWin ?? 1,
    players: game.participantPlayerIds,
  }
}

/** The full derived state for any mode; practice modes gain the practice field. */
export function buildGameState(game: Game, darts?: Dart[]): GameState {
  const log = darts ?? getGameDarts(game.id)
  const state = deriveGameState(log, deriveConfigFor(game))
  if (isPracticeKey(game.mode)) {
    state.practice = derivePracticeState(
      log,
      game.mode as PracticeGameKey,
      game.config as PracticeConfig
    )
    if (state.practice.complete) state.gameComplete = true
  }
  return state
}

export function toResultMetrics(m: Metrics, gameScore: number | null): ResultMetrics {
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

/** When a game completes: stamp endedAt and write the derived results cache. */
export function finaliseGame(game: Game, darts: Dart[], state: GameState): void {
  store.games.update(game.id, { endedAt: new Date().toISOString() })
  for (const playerId of game.participantPlayerIds) {
    const metrics = computeStats(darts, playerId, deriveConfigFor(game))
    store.results.create({
      gameId: game.id,
      playerId,
      metrics: toResultMetrics(metrics, state.practice?.finalScore ?? null),
      computedAt: new Date().toISOString(),
    })
  }
}

/** Reuse an open session under three hours old; close stale ones. Matches lib/server/service.ts. */
const SESSION_STALE_MS = 3 * 60 * 60 * 1000

export function ensureSession(playerId: string): string {
  const open = store.sessions
    .list({ playerId } as { playerId: string })
    .filter((s) => s.endedAt === null)
  const now = Date.now()
  for (const session of open) {
    if (now - Date.parse(session.startedAt) < SESSION_STALE_MS) return session.id
    store.sessions.update(session.id, { endedAt: new Date().toISOString() })
  }
  return store.sessions.create({
    playerId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    note: null,
  }).id
}
