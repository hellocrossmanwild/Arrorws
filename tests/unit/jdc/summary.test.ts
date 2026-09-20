import { describe, expect, test } from "vitest"
import type { JdcAttempt } from "@/lib/types"
import { buildJdcSummary } from "@/lib/jdc/summary"

const attempt = (
  gameId: string,
  endedAt: string,
  score: number,
  parts: [number, number, number] = [0, 0, 0],
  fromProgramme = true
): JdcAttempt => ({
  gameId,
  endedAt,
  score,
  grade: "White",
  parts,
  shanghais: 0,
  doublesHit: 0,
  fromProgramme,
})

describe("buildJdcSummary", () => {
  test("is empty and unstarted with no attempts", () => {
    const s = buildJdcSummary([])
    expect(s.best).toBeNull()
    expect(s.latest).toBeNull()
    expect(s.latestDelta).toBeNull()
    expect(s.belt).toBeNull()
    expect(s.nextBelt).toEqual({ name: "Purple", pointsAway: 150 })
    expect(s.belts.every((b) => !b.earned)).toBe(true)
  })

  test("orders attempts oldest first whatever order they arrive in", () => {
    const s = buildJdcSummary([
      attempt("c", "2026-09-01T00:00:00.000Z", 300),
      attempt("a", "2026-07-01T00:00:00.000Z", 100),
      attempt("b", "2026-08-01T00:00:00.000Z", 200),
    ])
    expect(s.attempts.map((a) => a.gameId)).toEqual(["a", "b", "c"])
  })

  test("the belt follows the best attempt, not the latest", () => {
    const s = buildJdcSummary([
      attempt("a", "2026-07-01T00:00:00.000Z", 480), // Green
      attempt("b", "2026-08-01T00:00:00.000Z", 120), // a bad night
    ])
    expect(s.best?.gameId).toBe("a")
    expect(s.latest?.gameId).toBe("b")
    expect(s.belt?.name).toBe("Green")
    // The next belt is measured from the best, not from the bad night.
    expect(s.nextBelt).toEqual({ name: "Blue", pointsAway: 120 })
  })

  test("the delta compares the latest attempt with the one before it", () => {
    expect(buildJdcSummary([attempt("a", "2026-07-01T00:00:00.000Z", 300)]).latestDelta).toBeNull()
    const s = buildJdcSummary([
      attempt("a", "2026-07-01T00:00:00.000Z", 300),
      attempt("b", "2026-08-01T00:00:00.000Z", 265),
    ])
    expect(s.latestDelta).toBe(-35)
  })

  test("a belt is earned at the date it was first reached, not the latest one to clear it", () => {
    const s = buildJdcSummary([
      attempt("a", "2026-07-01T00:00:00.000Z", 160), // first Purple
      attempt("b", "2026-08-01T00:00:00.000Z", 480), // first Yellow and Green
      attempt("c", "2026-09-01T00:00:00.000Z", 500),
    ])
    const by = (name: string) => s.belts.find((b) => b.name === name)!
    expect(by("White").earnedAt).toBe("2026-07-01T00:00:00.000Z")
    expect(by("Purple").earnedAt).toBe("2026-07-01T00:00:00.000Z")
    expect(by("Yellow").earnedAt).toBe("2026-08-01T00:00:00.000Z")
    expect(by("Green").earnedAt).toBe("2026-08-01T00:00:00.000Z")
    expect(by("Blue").earned).toBe(false)
    expect(by("Blue").earnedAt).toBeNull()
  })

  test("exactly one belt is current, and it is the one the best score reaches", () => {
    const s = buildJdcSummary([attempt("a", "2026-07-01T00:00:00.000Z", 700)])
    expect(s.belts.filter((b) => b.current).map((b) => b.name)).toEqual(["Red"])
  })

  test("Black has no belt above it", () => {
    const s = buildJdcSummary([attempt("a", "2026-07-01T00:00:00.000Z", 900)])
    expect(s.belt?.name).toBe("Black")
    expect(s.nextBelt).toBeNull()
  })

  test("part bests are taken per part across every attempt", () => {
    const s = buildJdcSummary([
      attempt("a", "2026-07-01T00:00:00.000Z", 300, [200, 50, 50]),
      attempt("b", "2026-08-01T00:00:00.000Z", 300, [40, 210, 50]),
    ])
    expect(s.partBests).toEqual([200, 210, 50])
  })

  test("ad-hoc attempts count toward the record exactly like assessments", () => {
    const s = buildJdcSummary([
      attempt("a", "2026-07-01T00:00:00.000Z", 200, [0, 0, 0], true),
      attempt("b", "2026-08-01T00:00:00.000Z", 460, [0, 0, 0], false),
    ])
    expect(s.best?.gameId).toBe("b")
    expect(s.belt?.name).toBe("Green")
    expect(s.attempts).toHaveLength(2)
  })
})
