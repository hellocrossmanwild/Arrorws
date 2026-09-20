import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest"
import { setupServer } from "msw/node"
import { handlers } from "@/mocks/handlers"
import { resetStore } from "@/mocks/data/store"
import { getJdc } from "@/lib/api/jdc"
import { createGame, throwDart } from "@/lib/api/games"
import { recordTrainingBlock, startTrainingSession } from "@/lib/api/training"
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

describe("GET /api/jdc", () => {
  test("serves the seeded record: five attempts, best sets the belt", async () => {
    const summary = await getJdc()

    expect(summary.attempts).toHaveLength(5)
    // Oldest first, so the trend chart reads left to right.
    const dates = summary.attempts.map((a) => a.endedAt)
    expect([...dates].sort()).toEqual(dates)

    expect(summary.best).not.toBeNull()
    const highest = Math.max(...summary.attempts.map((a) => a.score))
    expect(summary.best!.score).toBe(highest)
    expect(summary.belt?.name).toBe(summary.best!.grade)
    expect(summary.belts.filter((b) => b.current)).toHaveLength(1)
  })

  test("seeded attempts are ad-hoc, and an assessment block marks one", async () => {
    const before = await getJdc()
    expect(before.attempts.every((a) => !a.fromProgramme)).toBe(true)

    // Recording a JDC game against a training block is what makes it an
    // assessment; the flag is derived from the planner, never stored.
    const { session } = await startTrainingSession()
    await recordTrainingBlock(session.id, 0, before.latest!.gameId)

    const after = await getJdc()
    const marked = after.attempts.filter((a) => a.fromProgramme)
    expect(marked.map((a) => a.gameId)).toEqual([before.latest!.gameId])
  })

  test("every attempt carries its three part totals, summing to its score", async () => {
    const summary = await getJdc()
    for (const attempt of summary.attempts) {
      expect(attempt.parts).toHaveLength(3)
      expect(attempt.parts[0] + attempt.parts[1] + attempt.parts[2]).toBe(attempt.score)
      expect(attempt.doublesHit).toBeLessThanOrEqual(21)
    }
  })

  test("part bests are at least as good as any single attempt", async () => {
    const summary = await getJdc()
    for (const attempt of summary.attempts) {
      for (const i of [0, 1, 2]) {
        expect(summary.partBests[i]).toBeGreaterThanOrEqual(attempt.parts[i])
      }
    }
  })

  test("an ad-hoc attempt thrown now joins the record and can take the belt", async () => {
    const before = await getJdc()

    const { game } = await createGame("jdc-challenge", {}, ["player-tom"])
    // A near-perfect run: shanghai every number, every double, the bull.
    const labels = [
      ...[10, 11, 12, 13, 14, 15].flatMap((n) => [`${n}`, `D${n}`, `T${n}`]),
      ...Array.from({ length: 20 }, (_, i) => `D${i + 1}`),
      "BULL",
      ...[15, 16, 17, 18, 19, 20].flatMap((n) => [`${n}`, `D${n}`, `T${n}`]),
    ]
    for (const label of labels) await throwDart(game.id, input(label))

    const after = await getJdc()
    expect(after.attempts).toHaveLength(before.attempts.length + 1)

    const latest = after.latest!
    expect(latest.gameId).toBe(game.id)
    expect(latest.fromProgramme).toBe(false)
    expect(latest.score).toBe(3380) // the theoretical maximum
    expect(latest.shanghais).toBe(12)
    expect(latest.doublesHit).toBe(21)

    // Ad-hoc or not, the best attempt sets the belt.
    expect(after.best!.gameId).toBe(game.id)
    expect(after.belt?.name).toBe("Black")
    expect(after.nextBelt).toBeNull()
  })
})
