import { http, HttpResponse } from "msw"
import type { Dart, Game, Session } from "@/lib/types"
import { annotateGame, computeStats } from "@/lib/scoring"
import { store } from "../data/store"
import { deriveConfigFor, getGameDarts } from "./helpers"

/** Board order for the doubles heatmap, plus bull. */
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

interface StatsFilters {
  from: string | null
  to: string | null
  includeBots: boolean
  includeTwoPlayer: boolean
  source: "practice" | "all"
  playerId: string
}

function parseFilters(url: URL): StatsFilters {
  return {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    includeBots: url.searchParams.get("includeBots") !== "false",
    includeTwoPlayer: url.searchParams.get("includeTwoPlayer") !== "false",
    source: url.searchParams.get("source") === "practice" ? "practice" : "all",
    playerId: url.searchParams.get("playerId") ?? "player-tom",
  }
}

function gamePassesFilters(game: Game, f: StatsFilters): boolean {
  const hasBot = game.participantPlayerIds.some((id) => store.players.get(id)?.isBot)
  const humans = game.participantPlayerIds.filter((id) => !store.players.get(id)?.isBot)
  if (!f.includeBots && hasBot) return false
  if (!f.includeTwoPlayer && humans.length > 1) return false
  const session = store.sessions.get(game.sessionId)
  const date = session?.startedAt ?? game.startedAt
  if (f.from && date < f.from) return false
  if (f.to && date > f.to) return false
  return true
}

/** Filtering happens on the dart log before metrics are computed — never on computed metrics. */
function filteredGames(f: StatsFilters): Game[] {
  return store.games
    .list()
    .filter((g) => g.participantPlayerIds.includes(f.playerId))
    .filter((g) => gamePassesFilters(g, f))
}

export const statsHandlers = [
  http.get("/api/stats", ({ request }) => {
    const f = parseFilters(new URL(request.url))
    const games = filteredGames(f)
    const x01Games = games.filter((g) => g.mode === "x01")
    const practiceGames = games.filter((g) => g.mode !== "x01")

    // ── trend: per session, from that session's x01 dart logs ────────────
    const bySession = new Map<string, Game[]>()
    for (const g of x01Games) {
      bySession.set(g.sessionId, [...(bySession.get(g.sessionId) ?? []), g])
    }
    const trend: Array<{
      sessionId: string
      date: string
      threeDartAverage: number
      legCount: number
    }> = []
    for (const [sessionId, sessionGames] of bySession) {
      const session = store.sessions.get(sessionId)
      if (!session) continue
      let scored = 0
      let thrown = 0
      let legCount = 0
      for (const game of sessionGames) {
        const metrics = computeStats(getGameDarts(game.id), f.playerId, deriveConfigFor(game))
        // Recombine from totals so averages are never averaged.
        scored += (metrics.threeDartAverage / 3) * metrics.dartsThrown
        thrown += metrics.dartsThrown
        legCount += store.legs.list({ gameId: game.id } as { gameId: string }).length
      }
      if (thrown === 0) continue
      trend.push({
        sessionId,
        date: session.startedAt,
        threeDartAverage: Math.round((scored / thrown) * 3 * 100) / 100,
        legCount,
      })
    }
    trend.sort((a, b) => (a.date < b.date ? -1 : 1))

    // ── headline: rolling average across the last 10 sessions ────────────
    const rolling = (slice: typeof trend) => {
      if (slice.length === 0) return null
      // Weighted by darts is unavailable here without re-walking; recompute:
      let scored = 0
      let thrown = 0
      for (const point of slice) {
        const sessionGames = bySession.get(point.sessionId) ?? []
        for (const game of sessionGames) {
          const m = computeStats(getGameDarts(game.id), f.playerId, deriveConfigFor(game))
          scored += (m.threeDartAverage / 3) * m.dartsThrown
          thrown += m.dartsThrown
        }
      }
      return thrown > 0 ? (scored / thrown) * 3 : null
    }
    const last10 = trend.slice(-10)
    const previous10 = trend.slice(-20, -10)
    const headlineAvg = rolling(last10)
    const previousAvg = rolling(previous10)

    // ── the doubles heatmap ──────────────────────────────────────────────
    const bySegment: Record<string, { attempts: number; hits: number }> = {}
    let attemptsAreInferred = false
    const addDarts = (darts: Dart[], game: Game) => {
      const m = computeStats(darts, f.playerId, deriveConfigFor(game))
      if (m.checkoutPctIsInferred && m.doublesAttempted > 0) attemptsAreInferred = true
      for (const [key, v] of Object.entries(m.doublesBySegment)) {
        bySegment[key] ??= { attempts: 0, hits: 0 }
        bySegment[key].attempts += v.attempts
        bySegment[key].hits += v.hits
      }
    }
    for (const game of practiceGames) addDarts(getGameDarts(game.id), game)
    if (f.source === "all") for (const game of x01Games) addDarts(getGameDarts(game.id), game)

    const doubles = [...BOARD_ORDER, 25].map((segment) => {
      const cell = bySegment[String(segment)] ?? { attempts: 0, hits: 0 }
      return {
        segment,
        ring: "D" as const,
        attempts: cell.attempts,
        hits: cell.hits,
        // Below the confidence threshold of five the rate is withheld.
        rate: cell.attempts >= 5 ? Math.round((cell.hits / cell.attempts) * 1000) / 10 : null,
      }
    })

    // ── counts, from x01 logs ────────────────────────────────────────────
    let count180 = 0
    let count140plus = 0
    let count100plus = 0
    let bestLegDarts: number | null = null
    let bestCheckout: number | null = null
    for (const game of x01Games) {
      const m = computeStats(getGameDarts(game.id), f.playerId, deriveConfigFor(game))
      count180 += m.count180
      count140plus += m.count140plus
      count100plus += m.count100plus
      if (m.bestLegInDarts !== null && (bestLegDarts === null || m.bestLegInDarts < bestLegDarts))
        bestLegDarts = m.bestLegInDarts
      if (m.bestCheckout !== null && (bestCheckout === null || m.bestCheckout > bestCheckout))
        bestCheckout = m.bestCheckout
    }

    return HttpResponse.json({
      headline: {
        threeDartAverage: headlineAvg === null ? null : Math.round(headlineAvg * 100) / 100,
        sessionCount: last10.length,
        deltaVsPrevious:
          headlineAvg !== null && previousAvg !== null
            ? Math.round((headlineAvg - previousAvg) * 100) / 100
            : null,
      },
      trend,
      doubles,
      counts: { count180, count140plus, count100plus, bestLegDarts, bestCheckout },
      attemptsAreInferred,
    })
  }),

  http.get("/api/sessions", ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get("limit") ?? 20)
    const cursor = Number(url.searchParams.get("cursor") ?? 0)
    const playerId = url.searchParams.get("playerId") ?? "player-tom"

    const all = store.sessions
      .list({ playerId } as Partial<Session>)
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    const page = all.slice(cursor, cursor + limit)

    const sessions = page.map((session) => {
      const games = store.games.list({ sessionId: session.id } as { sessionId: string })
      let scored = 0
      let thrown = 0
      for (const game of games.filter((g) => g.mode === "x01")) {
        const m = computeStats(getGameDarts(game.id), playerId, deriveConfigFor(game))
        scored += (m.threeDartAverage / 3) * m.dartsThrown
        thrown += m.dartsThrown
      }
      const modes = [...new Set(games.map((g) => (g.mode === "x01" ? "501" : g.mode)))]
      return {
        ...session,
        gameCount: games.length,
        threeDartAverage: thrown > 0 ? Math.round((scored / thrown) * 3 * 100) / 100 : null,
        summary: modes.join(", ") || "No games",
        games: games.map((g) => {
          const result = store.results
            .list({ gameId: g.id } as { gameId: string })
            .find((r) => r.playerId === playerId)
          return {
            id: g.id,
            mode: g.mode,
            endedAt: g.endedAt,
            abandoned: g.abandoned,
            participantPlayerIds: g.participantPlayerIds,
            winnerPlayerId:
              store.legs
                .list({ gameId: g.id } as { gameId: string })
                .find((l) => l.winnerPlayerId)?.winnerPlayerId ?? null,
            metrics: result?.metrics ?? null,
          }
        }),
      }
    })

    return HttpResponse.json({
      sessions,
      nextCursor: cursor + limit < all.length ? String(cursor + limit) : null,
    })
  }),

  http.get("/api/games/:gameId/replay", ({ params }) => {
    const game = store.games.get(params.gameId as string)
    if (!game) return HttpResponse.json({ message: "Game not found" }, { status: 404 })
    const darts = getGameDarts(game.id)
    const annotated = annotateGame(darts, deriveConfigFor(game))
    const visits = annotated.flatMap((leg) =>
      leg.visits.map((v) => ({
        visit: {
          legIndex: leg.index,
          playerId: v.playerId,
          index: v.visitIndex,
          bust: v.bust,
        },
        darts: v.darts.map((ad) => ad.dart),
        visitScore: v.scored,
        remainingAfter: v.scoreAfter,
        bust: v.bust,
        checkout: v.checkout,
      }))
    )
    const players = game.participantPlayerIds.map((id) => store.players.get(id))
    return HttpResponse.json({ game, players, visits })
  }),

  http.get("/api/admin/usage", () => {
    return HttpResponse.json({
      players: store.players.list().length,
      sessions: store.sessions.list().length,
      games: store.games.list().length,
      darts: store.darts.list().length,
    })
  }),
]
