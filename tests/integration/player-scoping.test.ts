import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest"
import { setupServer } from "msw/node"
import { handlers } from "@/mocks/handlers"
import { resetStore } from "@/mocks/data/store"
import { createGame, createPlayer, throwDart } from "@/lib/api/games"
import { getPracticeGames } from "@/lib/api/practice"
import { getSessions, getStats } from "@/lib/api/stats"
import { getTraining, recordTrainingBlock, startTrainingSession } from "@/lib/api/training"
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
        : (() => {
            const m = label.match(/^([SDT])?(\d+)$/)!
            return { segment: Number(m[2]), ring: (m[1] ?? "S") as Ring }
          })()
  return { ...seg, targetSegment: null, targetRing: null, latencyMs: null }
}

/**
 * Profiles are only worth having if a child's darts stay theirs (spec 0012).
 * These cover the seams where a leak would be invisible on screen.
 */
describe("the whole app scopes to the current player", () => {
  test("history shows only that player's sessions", async () => {
    const [tom, maisie] = await Promise.all([
      getSessions(50, undefined, "player-tom"),
      getSessions(50, undefined, "player-maisie"),
    ])

    expect(tom.sessions.length).toBeGreaterThan(0)
    expect(maisie.sessions.length).toBeGreaterThan(0)
    const tomIds = new Set(tom.sessions.map((s) => s.id))
    expect(maisie.sessions.every((s) => !tomIds.has(s.id))).toBe(true)
  })

  test("stats are the player's own, and a fresh player has none", async () => {
    const { player } = await createPlayer("Rosie")
    const [tom, rosie] = await Promise.all([
      getStats({ playerId: "player-tom" }),
      getStats({ playerId: player.id }),
    ])

    expect(tom.headline.sessionCount).toBeGreaterThan(0)
    expect(rosie.headline.sessionCount).toBe(0)
    expect(rosie.headline.threeDartAverage).toBeNull()
    expect(rosie.doubles.every((d) => d.attempts === 0)).toBe(true)
  })

  test("personal bests do not carry over from another player", async () => {
    const { player } = await createPlayer("Rosie")
    const [tom, rosie] = await Promise.all([
      getPracticeGames("player-tom"),
      getPracticeGames(player.id),
    ])

    expect(Object.values(tom.personalBests).some((b) => b !== null)).toBe(true)
    expect(Object.values(rosie.personalBests).every((b) => b === null)).toBe(true)
    // The drill list itself is product content, identical for everyone.
    expect(rosie.definitions).toEqual(tom.definitions)
  })

  test("each player walks their own training queue", async () => {
    const alfie = await startTrainingSession("player-alfie")
    expect(alfie.session.playerId).toBe("player-alfie")

    // Tom's queue is untouched by Alfie starting his.
    const tom = await getTraining("player-tom")
    expect(tom.active).toBeNull()
    expect(tom.completedCount).toBe(0)

    const alfieSummary = await getTraining("player-alfie")
    expect(alfieSummary.active?.id).toBe(alfie.session.id)
  })

  test("completing a session advances only that player's count", async () => {
    const { session, template } = await startTrainingSession("player-alfie")
    for (let i = 0; i < template.blocks.length; i++) {
      await recordTrainingBlock(session.id, i, null)
    }

    const [alfie, tom] = await Promise.all([
      getTraining("player-alfie"),
      getTraining("player-tom"),
    ])
    expect(alfie.completedCount).toBe(1)
    expect(alfie.nextSession?.index).toBe(1)
    expect(tom.completedCount).toBe(0)
    expect(tom.nextSession?.index).toBe(0)
  })

  test("a game thrown by one player lands only in their history and stats", async () => {
    const [statsBefore, tomBefore, alfieBefore] = await Promise.all([
      getStats({ playerId: "player-tom" }),
      getSessions(50, undefined, "player-tom"),
      getSessions(50, undefined, "player-alfie"),
    ])

    const { game } = await createGame("scoring-drill", {}, ["player-alfie"])
    for (let i = 0; i < 12; i++) await throwDart(game.id, input("T20"))

    const [statsAfter, tomAfter, alfieAfter] = await Promise.all([
      getStats({ playerId: "player-tom" }),
      getSessions(50, undefined, "player-tom"),
      getSessions(50, undefined, "player-alfie"),
    ])

    // Alfie's drill reaches Alfie and nobody else. (A practice drill does not
    // move the headline average, which is the x01 trend — so the assertion
    // is on the game landing in his history, and on Tom's figures standing
    // still.)
    const alfieGames = alfieAfter.sessions.flatMap((s) => s.games.map((g) => g.id))
    const tomGames = tomAfter.sessions.flatMap((s) => s.games.map((g) => g.id))
    expect(alfieGames).toContain(game.id)
    expect(tomGames).not.toContain(game.id)

    expect(tomAfter.sessions.length).toBe(tomBefore.sessions.length)
    expect(alfieAfter.sessions.length).toBe(alfieBefore.sessions.length + 1)
    expect(statsAfter.counts).toEqual(statsBefore.counts)
    expect(statsAfter.headline).toEqual(statsBefore.headline)
  })
})

/**
 * Regressions from the Codex review on PR #6. Each one is a way a player's
 * darts could end up on someone else's record — the exact failure profiles
 * exist to prevent.
 */
describe("a game can never carry the same player twice", () => {
  test("duplicate participants are refused", async () => {
    await expect(
      createGame("x01", { startingScore: 501, legsToWin: 1 }, [
        "player-guest",
        "player-guest",
      ])
    ).rejects.toMatchObject({ status: 400 })
  })

  test("a bot and a human, or two different humans, are still fine", async () => {
    await expect(
      createGame("x01", { startingScore: 501, legsToWin: 1 }, ["player-tom", "player-guest"])
    ).resolves.toBeTruthy()
    await expect(
      createGame("x01", { startingScore: 501, legsToWin: 1 }, ["player-tom", "bot-county"])
    ).resolves.toBeTruthy()
  })
})

describe("a training block belongs to the session's owner", () => {
  test("the game is recorded against the owner, not whoever is selected", async () => {
    // Alfie starts a session…
    const { session, template } = await startTrainingSession("player-alfie")
    expect(session.playerId).toBe("player-alfie")

    // …and the block's game is created for Alfie. The runner reads the owner
    // off the session, so switching profile in between cannot redirect it.
    const { game } = await createGame(template.blocks[0].mode, template.blocks[0].config, [
      session.playerId,
    ])
    await recordTrainingBlock(session.id, 0, game.id)

    const [alfie, maisie] = await Promise.all([
      getSessions(50, undefined, "player-alfie"),
      getSessions(50, undefined, "player-maisie"),
    ])
    const alfieGames = alfie.sessions.flatMap((s) => s.games.map((g) => g.id))
    const maisieGames = maisie.sessions.flatMap((s) => s.games.map((g) => g.id))
    expect(alfieGames).toContain(game.id)
    expect(maisieGames).not.toContain(game.id)

    // And it advanced Alfie's queue, nobody else's.
    const alfieTraining = await getTraining("player-alfie")
    expect(alfieTraining.active?.blockGameIds[0]).toBe(game.id)
    expect((await getTraining("player-maisie")).active).toBeNull()
  })
})
