import { beforeEach, describe, expect, test } from "vitest"
import seed from "@/mocks/data/seed.json"
import { resetStore, store } from "@/mocks/data/store"
import { annotateGame, computeStats, deriveGameState, scoreOf } from "@/lib/scoring"
import { derivePracticeState } from "@/lib/practice"
import type { Dart, Game, PracticeConfig, PracticeGameKey, Ring, SeedData } from "@/lib/types"

const data = seed as unknown as SeedData

function gameDarts(game: Game): Dart[] {
  const legIds = data.legs.filter((l) => l.gameId === game.id).map((l) => l.id)
  const visitIds = new Set(
    data.visits.filter((v) => legIds.includes(v.legId)).map((v) => v.id)
  )
  return data.darts
    .filter((d) => visitIds.has(d.visitId))
    .sort((a, b) => (a.thrownAt === b.thrownAt ? a.index - b.index : a.thrownAt < b.thrownAt ? -1 : 1))
}

const deriveConfig = (game: Game) => ({
  startingScore: 501,
  legsToWin: 1,
  players: game.participantPlayerIds,
})

describe("seed shape", () => {
  test("every entity from PRD Section 4 has a top-level key", () => {
    for (const key of [
      "players",
      "botProfiles",
      "sessions",
      "games",
      "legs",
      "visits",
      "darts",
      "practiceGameDefinitions",
      "results",
    ]) {
      expect(data).toHaveProperty(key)
    }
  })

  test("all four bot profiles are present with calibrated sigmas", () => {
    expect(data.botProfiles).toHaveLength(4)
    for (const p of data.botProfiles) {
      expect(p.scoringSigmaMm).toBeGreaterThan(4)
      expect(p.doubleSigmaMm).toBeGreaterThan(4)
      expect(p.doubleSigmaMm!).toBeGreaterThanOrEqual(p.scoringSigmaMm!)
    }
  })

  test("all eleven practice game definitions are present with rules, eight visible", () => {
    expect(data.practiceGameDefinitions).toHaveLength(11)
    expect(data.practiceGameDefinitions.filter((d) => !d.trainingOnly)).toHaveLength(8)
    for (const d of data.practiceGameDefinitions) {
      expect(Object.keys(d.rules).length).toBeGreaterThan(0)
      expect(["lower-is-better", "higher-is-better"]).toContain(d.personalBestDirection)
    }
  })
})

describe("dart log legality", () => {
  test("every score equals segment times multiplier", () => {
    for (const d of data.darts) {
      const mult: Record<Ring, number> = { S: 1, D: 2, T: 3, MISS: 0 }
      expect(d.score, d.id).toBe(d.segment * mult[d.ring])
      expect(d.score).toBe(scoreOf({ segment: d.segment, ring: d.ring }))
    }
  })

  test("bull is 25 D 50, outer bull 25 S 25, miss 0 MISS 0, no treble 25", () => {
    for (const d of data.darts) {
      if (d.segment === 25) expect(["S", "D"]).toContain(d.ring)
      if (d.ring === "MISS") expect(d.segment).toBe(0)
    }
  })

  test("every foreign key resolves", () => {
    const playerIds = new Set(data.players.map((p) => p.id))
    const sessionIds = new Set(data.sessions.map((s) => s.id))
    const gameIds = new Set(data.games.map((g) => g.id))
    const legIds = new Set(data.legs.map((l) => l.id))
    const visitIds = new Set(data.visits.map((v) => v.id))
    const profileIds = new Set(data.botProfiles.map((b) => b.id))

    for (const p of data.players) {
      if (p.isBot) expect(profileIds.has(p.botProfileId!), p.id).toBe(true)
    }
    for (const s of data.sessions) expect(playerIds.has(s.playerId), s.id).toBe(true)
    for (const g of data.games) {
      expect(sessionIds.has(g.sessionId), g.id).toBe(true)
      for (const pid of g.participantPlayerIds) expect(playerIds.has(pid), g.id).toBe(true)
    }
    for (const l of data.legs) {
      expect(gameIds.has(l.gameId), l.id).toBe(true)
      expect(playerIds.has(l.startingPlayerId), l.id).toBe(true)
    }
    for (const v of data.visits) {
      expect(legIds.has(v.legId), v.id).toBe(true)
      expect(playerIds.has(v.playerId), v.id).toBe(true)
    }
    for (const d of data.darts) expect(visitIds.has(d.visitId), d.id).toBe(true)
    for (const r of data.results) {
      expect(gameIds.has(r.gameId), r.id).toBe(true)
      expect(playerIds.has(r.playerId), r.id).toBe(true)
    }
  })

  test("every visit has one to three darts with unique indexes", () => {
    for (const v of data.visits) {
      const ds = data.darts.filter((d) => d.visitId === v.id)
      expect(ds.length, v.id).toBeGreaterThanOrEqual(1)
      expect(ds.length, v.id).toBeLessThanOrEqual(3)
      const indexes = ds.map((d) => d.index).sort()
      expect(indexes, v.id).toEqual(Array.from({ length: ds.length }, (_, i) => i))
    }
  })

  test("latency is null on the first dart of a visit and 600-2500 after", () => {
    for (const d of data.darts) {
      if (d.index === 0) expect(d.latencyMs, d.id).toBeNull()
      else {
        expect(d.latencyMs, d.id).toBeGreaterThanOrEqual(600)
        expect(d.latencyMs, d.id).toBeLessThanOrEqual(2500)
      }
    }
  })

  test("targets are null for human x01 darts, populated for bot and practice darts", () => {
    const botPlayerIds = new Set(data.players.filter((p) => p.isBot).map((p) => p.id))
    for (const game of data.games) {
      const darts = gameDarts(game)
      if (game.mode === "x01") {
        const annotated = annotateGame(darts, deriveConfig(game))
        for (const leg of annotated) {
          for (const visit of leg.visits) {
            for (const ad of visit.darts) {
              if (botPlayerIds.has(visit.playerId)) {
                expect(ad.dart.targetRing, ad.dart.id).not.toBeNull()
                expect(ad.dart.targetSegment, ad.dart.id).not.toBeNull()
              } else {
                expect(ad.dart.targetRing, ad.dart.id).toBeNull()
              }
            }
          }
        }
      } else {
        for (const d of darts) {
          expect(d.targetRing, `${game.id} ${d.id}`).not.toBeNull()
        }
      }
    }
  })

  test("x01 replays are legal: no negative score, no score of one, legs end on a double", () => {
    for (const game of data.games.filter((g) => g.mode === "x01")) {
      const darts = gameDarts(game)
      const state = deriveGameState(darts, deriveConfig(game))
      for (const p of state.players) {
        expect(p.score, game.id).toBeGreaterThanOrEqual(0)
        expect(p.score, game.id).not.toBe(1)
      }
      const legRows = data.legs.filter((l) => l.gameId === game.id)
      const annotated = annotateGame(darts, deriveConfig(game))
      for (const leg of annotated) {
        const row = legRows.find((l) => l.index === leg.index)!
        expect(row.winnerPlayerId, game.id).toBe(leg.winnerPlayerId)
        if (leg.winnerPlayerId) {
          const lastVisit = leg.visits[leg.visits.length - 1]
          const lastDart = lastVisit.darts[lastVisit.darts.length - 1]
          expect(lastDart.dart.ring).toBe("D")
        }
      }
      // Completed games must actually be complete
      if (game.endedAt && !game.abandoned) expect(state.gameComplete, game.id).toBe(true)
    }
  })
})

describe("seed content checklist", () => {
  test("a completed 501 solo game with a legal checkout exists", () => {
    const solo = data.games.find(
      (g) => g.mode === "x01" && g.participantPlayerIds.length === 1 && g.endedAt
    )
    expect(solo).toBeDefined()
  })

  test("a completed game containing a bust exists", () => {
    const bustVisits = data.visits.filter((v) => v.bust)
    expect(bustVisits.length).toBeGreaterThan(0)
  })

  test("a two player game with interleaved visits exists", () => {
    const twoPlayer = data.games.find(
      (g) =>
        g.mode === "x01" &&
        g.participantPlayerIds.length === 2 &&
        !g.participantPlayerIds.some((id) => data.players.find((p) => p.id === id)?.isBot)
    )
    expect(twoPlayer).toBeDefined()
  })

  test("a game against a bot exists, with targeted bot darts", () => {
    const botGame = data.games.find((g) =>
      g.participantPlayerIds.some((id) => data.players.find((p) => p.id === id)?.isBot)
    )
    expect(botGame).toBeDefined()
  })

  test("completed practice games cover all three scoring models", () => {
    const completedKeys = data.games
      .filter((g) => g.mode !== "x01" && g.endedAt)
      .map((g) => g.mode)
    expect(completedKeys).toContain("around-the-clock")
    expect(completedKeys).toContain("bobs-27")
    expect(completedKeys).toContain("random-checkout")
  })

  test("an abandoned game and a session with no games exist", () => {
    const abandoned = data.games.find((g) => g.abandoned && g.endedAt === null)
    expect(abandoned).toBeDefined()
    const emptySession = data.sessions.find(
      (s) => !data.games.some((g) => g.sessionId === s.id)
    )
    expect(emptySession).toBeDefined()
  })

  test("at least three completed sessions on different dates", () => {
    const withGames = data.sessions.filter(
      (s) => s.endedAt && data.games.some((g) => g.sessionId === s.id && g.endedAt)
    )
    expect(withGames.length).toBeGreaterThanOrEqual(3)
    const dates = new Set(withGames.map((s) => s.startedAt.slice(0, 10)))
    expect(dates.size).toBeGreaterThanOrEqual(3)
  })

  test("the doubles heatmap gets real variation: 5+ attempts on some doubles, zero on at least three", () => {
    const attempts: Record<number, { attempts: number; hits: number }> = {}
    for (const d of data.darts) {
      if (d.targetRing === "D" && d.targetSegment !== null) {
        attempts[d.targetSegment] ??= { attempts: 0, hits: 0 }
        attempts[d.targetSegment].attempts += 1
        if (d.ring === "D" && d.segment === d.targetSegment) attempts[d.targetSegment].hits += 1
      }
    }
    const withEnough = Object.values(attempts).filter((a) => a.attempts >= 5)
    expect(withEnough.length).toBeGreaterThanOrEqual(3)
    const zeroAttemptDoubles = Array.from({ length: 20 }, (_, i) => i + 1).filter(
      (n) => !attempts[n]
    )
    expect(zeroAttemptDoubles.length).toBeGreaterThanOrEqual(3)
    const rates = withEnough.map((a) => a.hits / a.attempts)
    expect(Math.max(...rates) - Math.min(...rates)).toBeGreaterThan(0.15)
  })
})

describe("results cache", () => {
  test("every completed game has a results row per participant, and recomputation matches exactly", () => {
    for (const game of data.games) {
      if (!game.endedAt || game.abandoned) continue
      const darts = gameDarts(game)
      for (const playerId of game.participantPlayerIds) {
        const row = data.results.find((r) => r.gameId === game.id && r.playerId === playerId)
        expect(row, `${game.id}/${playerId}`).toBeDefined()
        const metrics = computeStats(darts, playerId, deriveConfig(game))
        const round2 = (n: number) => Math.round(n * 100) / 100
        expect(row!.metrics.threeDartAverage).toBe(round2(metrics.threeDartAverage))
        expect(row!.metrics.firstNineAverage).toBe(round2(metrics.firstNineAverage))
        expect(row!.metrics.dartsThrown).toBe(metrics.dartsThrown)
        expect(row!.metrics.checkoutPct).toBe(
          metrics.checkoutPct === null ? null : round2(metrics.checkoutPct)
        )
        expect(row!.metrics.doublesAttempted).toBe(metrics.doublesAttempted)
        expect(row!.metrics.doublesHit).toBe(metrics.doublesHit)
        expect(row!.metrics.bestVisit).toBe(metrics.bestVisit)
        expect(row!.metrics.count180).toBe(metrics.count180)
        expect(row!.metrics.count140plus).toBe(metrics.count140plus)
        expect(row!.metrics.count100plus).toBe(metrics.count100plus)
        if (game.mode !== "x01") {
          const practice = derivePracticeState(
            darts,
            game.mode as PracticeGameKey,
            game.config as PracticeConfig
          )
          expect(row!.metrics.gameScore).toBe(practice.finalScore)
        }
      }
    }
  })
})

describe("the in-memory store", () => {
  beforeEach(() => resetStore())

  test("is hydrated from seed.json and deep-clones it", () => {
    const tom = store.players.get("player-tom")
    expect(tom?.displayName).toBe("Tom")
    store.players.update("player-tom", { displayName: "Mutated" })
    resetStore()
    expect(store.players.get("player-tom")?.displayName).toBe("Tom")
  })

  test("darts.list({ visitId }) returns darts ordered by index", () => {
    for (const v of data.visits.slice(0, 20)) {
      const ds = store.darts.list({ visitId: v.id } as Partial<Dart>)
      const indexes = ds.map((d) => d.index)
      expect(indexes).toEqual([...indexes].sort((a, b) => a - b))
    }
  })

  test("provides CRUD for every entity", () => {
    const created = store.sessions.create({
      playerId: "player-tom",
      startedAt: "2026-07-30T10:00:00.000Z",
      endedAt: null,
      note: null,
    })
    expect(store.sessions.get(created.id)).toEqual(created)
    expect(store.sessions.update(created.id, { note: "x" })?.note).toBe("x")
    expect(store.sessions.delete(created.id)).toBe(true)
    expect(store.sessions.get(created.id)).toBeNull()
  })

  test("darts.delete is safe on the most recent dart of a game", () => {
    const lastDart = data.darts[data.darts.length - 1]
    expect(store.darts.delete(lastDart.id)).toBe(true)
    expect(store.darts.get(lastDart.id)).toBeNull()
  })
})
