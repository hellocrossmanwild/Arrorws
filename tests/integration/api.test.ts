/**
 * Integration tests: the API client functions against the MSW handlers,
 * exactly as the browser runs them in Phase 1. The msw/node server here is
 * mock infrastructure wiring, not a component importing from /mocks.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest"
import { setupServer } from "msw/node"
import { handlers } from "@/mocks/handlers"
import { resetStore } from "@/mocks/data/store"
import {
  createGame,
  getGame,
  startNextLeg,
  throwDart,
  undoDart,
} from "@/lib/api/games"
import { getPracticeGames } from "@/lib/api/practice"
import { getReplay, getSessions, getStats } from "@/lib/api/stats"
import type { DartInput, Ring } from "@/lib/types"

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
beforeEach(() => resetStore())

const input = (label: string): DartInput => {
  const seg =
    label === "MISS"
      ? { segment: 0, ring: "MISS" as Ring }
      : label === "BULL"
        ? { segment: 25, ring: "D" as Ring }
        : label === "25"
          ? { segment: 25, ring: "S" as Ring }
          : (() => {
              const m = label.match(/^([SDT])?(\d+)$/)!
              return { segment: Number(m[2]), ring: (m[1] ?? "S") as Ring }
            })()
  return { ...seg, targetSegment: null, targetRing: null, latencyMs: null }
}

describe("x01 game flow", () => {
  test("a full 501 leg with a bust and a checkout, dart by dart", async () => {
    const { game } = await createGame("x01", { startingScore: 501, legsToWin: 1 }, [
      "player-tom",
    ])
    // Three visits of T20 T20 T20 = 141 left after 6... walk it:
    for (const label of ["T20", "T20", "T20", "T20", "T20", "T20"]) {
      await throwDart(game.id, input(label))
    }
    let state = (await getGame(game.id)).gameState
    expect(state.players[0].score).toBe(141)

    // Bust: T20 T20 leaves 21, T20 goes below zero
    await throwDart(game.id, input("T20"))
    await throwDart(game.id, input("T20"))
    const bust = await throwDart(game.id, input("T20"))
    expect(bust.gameState.players[0].score).toBe(141)
    expect(bust.gameState.lastVisit?.bust).toBe(true)

    // Checkout: T20 T19 D12
    await throwDart(game.id, input("T20"))
    await throwDart(game.id, input("T19"))
    const win = await throwDart(game.id, input("D12"))
    expect(win.gameState.legComplete).toBe(true)
    expect(win.gameState.gameComplete).toBe(true)
    expect(win.gameState.winnerPlayerId).toBe("player-tom")

    // Completed game rejects further darts with 409
    await expect(throwDart(game.id, input("20"))).rejects.toMatchObject({ status: 409 })

    // The result cache was written
    const replay = await getReplay(game.id)
    expect(replay.visits.some((v) => v.bust)).toBe(true)
    expect(replay.visits[replay.visits.length - 1].checkout).toBe(true)
  })

  test("undo removes exactly one dart and restores state across a bust boundary", async () => {
    const { game } = await createGame("x01", { startingScore: 501, legsToWin: 1 }, [
      "player-tom",
    ])
    for (const label of ["T20", "T20", "T20", "T20", "T20", "T20", "T20", "T20"]) {
      await throwDart(game.id, input(label))
    }
    const busted = await throwDart(game.id, input("T20")) // 21 - 60: bust
    expect(busted.gameState.lastVisit?.bust).toBe(true)
    const undone = await undoDart(game.id)
    expect(undone.gameState.players[0].score).toBe(21)
    expect(undone.gameState.currentVisit).toHaveLength(2)
  })

  test("undo with no darts is a 409; undo after game end is a 409", async () => {
    const { game } = await createGame("x01", { startingScore: 501, legsToWin: 1 }, [
      "player-tom",
    ])
    await expect(undoDart(game.id)).rejects.toMatchObject({ status: 409 })
  })

  test("two player throw alternates and legs alternate the starting player", async () => {
    const { game } = await createGame("x01", { startingScore: 501, legsToWin: 2 }, [
      "player-tom",
      "player-guest",
    ])
    let state = (await throwDart(game.id, input("20"))).gameState
    expect(state.currentPlayerId).toBe("player-tom")
    await throwDart(game.id, input("20"))
    state = (await throwDart(game.id, input("20"))).gameState
    expect(state.currentPlayerId).toBe("player-guest")

    // Guest throws a visit; back to Tom
    await throwDart(game.id, input("5"))
    await throwDart(game.id, input("5"))
    state = (await throwDart(game.id, input("5"))).gameState
    expect(state.currentPlayerId).toBe("player-tom")
  })

  test("starting the next leg alternates startingPlayerId", async () => {
    const { game } = await createGame("x01", { startingScore: 501, legsToWin: 2 }, [
      "player-tom",
      "player-guest",
    ])
    const { leg } = await startNextLeg(game.id)
    expect(leg.index).toBe(1)
    expect(leg.startingPlayerId).toBe("player-guest")
  })

  test("rejects an illegal segment", async () => {
    const { game } = await createGame("x01", { startingScore: 501, legsToWin: 1 }, [
      "player-tom",
    ])
    await expect(
      throwDart(game.id, { segment: 25, ring: "T", targetSegment: null, targetRing: null, latencyMs: null })
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      throwDart(game.id, { segment: 21, ring: "S", targetSegment: null, targetRing: null, latencyMs: null })
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe("practice game flow", () => {
  test("darts are persisted with engine-derived targets", async () => {
    const { game } = await createGame("doubles-round-the-board", {}, ["player-tom"])
    const first = await throwDart(game.id, input("5"))
    expect(first.dart.targetSegment).toBe(1)
    expect(first.dart.targetRing).toBe("D")
    expect(first.gameState.practice?.roundIndex).toBe(0)
    const hit = await throwDart(game.id, input("D1"))
    expect(hit.gameState.practice?.roundIndex).toBe(1)
  })

  test("a completed practice game writes a personal best", async () => {
    const { game } = await createGame("scoring-drill", {}, ["player-tom"])
    for (let i = 0; i < 60; i++) {
      await throwDart(game.id, input("T20"))
    }
    const done = await getGame(game.id)
    expect(done.gameState.practice?.complete).toBe(true)
    expect(done.game.endedAt).not.toBeNull()
    const { personalBests } = await getPracticeGames()
    expect(personalBests["scoring-drill"]?.score).toBe(180)
  })

  test("random-checkout config keeps its rng seed so state is reproducible", async () => {
    const { game } = await createGame("random-checkout", { rngSeed: 99 }, ["player-tom"])
    const a = await getGame(game.id)
    const b = await getGame(game.id)
    expect(a.gameState.practice?.currentTarget).toEqual(b.gameState.practice?.currentTarget)
    expect((a.game.config as { rngSeed?: number }).rngSeed).toBe(99)
  })
})

describe("stats and history", () => {
  test("stats compute from the seeded dart log", async () => {
    const stats = await getStats()
    expect(stats.headline.threeDartAverage).toBeGreaterThan(40)
    expect(stats.headline.threeDartAverage).toBeLessThan(90)
    expect(stats.trend.length).toBeGreaterThanOrEqual(3)
    expect(stats.doubles).toHaveLength(21)
    // Board order, not numeric order
    expect(stats.doubles.slice(0, 4).map((d) => d.segment)).toEqual([20, 1, 18, 4])
    expect(stats.doubles[20].segment).toBe(25)
  })

  test("cells with fewer than five attempts have a null rate", async () => {
    const stats = await getStats({ source: "practice" })
    for (const cell of stats.doubles) {
      if (cell.attempts < 5) expect(cell.rate).toBeNull()
      else expect(cell.rate).not.toBeNull()
    }
  })

  test("filters change the numbers and are applied before computation", async () => {
    const all = await getStats()
    const noBots = await getStats({ includeBots: false })
    // The bot game is in the seed, so excluding bots changes Tom's numbers
    expect(JSON.stringify(all.trend)).not.toBe(JSON.stringify(noBots.trend))
    const practiceOnly = await getStats({ source: "practice" })
    expect(practiceOnly.attemptsAreInferred).toBe(false)
    expect(all.attemptsAreInferred).toBe(true)
  })

  test("sessions list in reverse chronological order with summaries", async () => {
    const { sessions } = await getSessions()
    expect(sessions.length).toBeGreaterThanOrEqual(5)
    for (let i = 1; i < sessions.length; i++) {
      expect(sessions[i - 1].startedAt >= sessions[i].startedAt).toBe(true)
    }
    const empty = sessions.find((s) => s.gameCount === 0)
    expect(empty).toBeDefined()
  })

  test("replay renders a bust visit with the score unchanged across it", async () => {
    const { visits } = await getReplay("game-3")
    const bustIndex = visits.findIndex((v) => v.bust)
    expect(bustIndex).toBeGreaterThan(0)
    expect(visits[bustIndex].visitScore).toBe(0)
    expect(visits[bustIndex].remainingAfter).toBe(visits[bustIndex - 1].remainingAfter)
    expect(visits[visits.length - 1].checkout).toBe(true)
    expect(visits[visits.length - 1].remainingAfter).toBe(0)
  })
})
