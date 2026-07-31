import { describe, expect, test } from "vitest"
import { derivePracticeState, gradeForJdcScore } from "@/lib/practice"
import { throwDarts } from "@/tests/helpers/darts"

const replay = (
  key: Parameters<typeof derivePracticeState>[1],
  labels: string,
  config: Record<string, unknown> = {}
) => derivePracticeState(throwDarts(labels), key, config)

describe("jdc-challenge", () => {
  const missRound = "MISS MISS MISS"

  test("part 1 scores face-value hits on the round's number when the round closes", () => {
    // 10 + 30 hit, the 5 misses; no shanghai (no double): 40
    expect(replay("jdc-challenge", "10 T10 5").score).toBe(40)
    // Mid-round the points are not yet banked
    expect(replay("jdc-challenge", "10 T10").score).toBe(0)
  })

  test("single, double and treble of the number in one round scores 100", () => {
    const s = replay("jdc-challenge", "10 D10 T10")
    expect(s.score).toBe(100)
  })

  test("part transitions land on the right targets", () => {
    const part1 = Array.from({ length: 6 }, () => missRound).join(" ")
    const atPart2 = replay("jdc-challenge", part1)
    expect(atPart2.currentTarget).toEqual({ type: "segment", segment: 1, ring: "D" })

    const part2 = Array.from({ length: 21 }, () => "MISS").join(" ")
    const atPart3 = replay("jdc-challenge", `${part1} ${part2}`)
    expect(atPart3.currentTarget).toEqual({ type: "segment", segment: 15, ring: null })
  })

  test("part 2 scores 50 per double and 100 for the bull", () => {
    const part1 = Array.from({ length: 6 }, () => missRound).join(" ")
    // Hit D1, miss 19 doubles, hit bull on the last part-2 dart
    const part2 = ["D1", ...Array.from({ length: 19 }, () => "MISS"), "BULL"].join(" ")
    const s = replay("jdc-challenge", `${part1} ${part2}`)
    expect(s.score).toBe(50 + 100)
  })

  test("completes after exactly 57 darts with the grade in the progress label", () => {
    const all = Array.from({ length: 57 }, () => "MISS").join(" ")
    const s = replay("jdc-challenge", all)
    expect(s.complete).toBe(true)
    expect(s.dartsThrown).toBe(57)
    expect(s.finalScore).toBe(0)
    expect(s.progressLabel).toBe("White")
    const more = replay("jdc-challenge", `${all} T20`)
    expect(more.dartsThrown).toBe(57)
  })

  test("grade thresholds are exact", () => {
    expect(gradeForJdcScore(0)).toBe("White")
    expect(gradeForJdcScore(149)).toBe("White")
    expect(gradeForJdcScore(150)).toBe("Purple")
    expect(gradeForJdcScore(300)).toBe("Yellow")
    expect(gradeForJdcScore(450)).toBe("Green")
    expect(gradeForJdcScore(600)).toBe("Blue")
    expect(gradeForJdcScore(700)).toBe("Red")
    expect(gradeForJdcScore(849)).toBe("Red")
    expect(gradeForJdcScore(850)).toBe("Black")
  })
})

describe("target-switching", () => {
  test("target cycles 20, 19, 18 and only the round's number scores", () => {
    let s = replay("target-switching", "")
    expect(s.currentTarget).toEqual({ type: "segment", segment: 20, ring: null })
    s = replay("target-switching", "T20 19 MISS")
    expect(s.score).toBe(60) // the 19 was thrown in the 20s round
    expect(s.currentTarget).toEqual({ type: "segment", segment: 19, ring: null })
    s = replay("target-switching", "T20 19 MISS 19 19 19")
    expect(s.score).toBe(60 + 57)
    expect(s.currentTarget).toEqual({ type: "segment", segment: 18, ring: null })
  })

  test("completes after rounds * 3 darts", () => {
    const labels = Array.from({ length: 18 }, () => "20").join(" ")
    const s = replay("target-switching", labels, { rounds: 6 })
    expect(s.complete).toBe(true)
    // Rounds on 20: rounds 1 and 4 -> 6 darts x 20 = 120
    expect(s.finalScore).toBe(120)
  })
})

describe("pressure-doubles", () => {
  test("advances only after the required clean hits, in order", () => {
    let s = replay("pressure-doubles", "")
    expect(s.currentTarget).toEqual({ type: "segment", segment: 16, ring: "D" })
    s = replay("pressure-doubles", "D16 MISS D16")
    expect(s.currentTarget).toEqual({ type: "segment", segment: 20, ring: "D" })
    expect(s.roundIndex).toBe(1)
  })

  test("score is darts taken and lower is better", () => {
    const perfect = "D16 D16 D20 D20 D18 D18 D10 D10"
    const s = replay("pressure-doubles", perfect)
    expect(s.complete).toBe(true)
    expect(s.finalScore).toBe(8)
    const sloppy = replay("pressure-doubles", `MISS MISS ${perfect}`)
    expect(sloppy.finalScore).toBe(10)
  })

  test("config controls the doubles list and hits required", () => {
    const s = replay("pressure-doubles", "D5 D7", { doubles: [5, 7], hitsRequired: 1 })
    expect(s.complete).toBe(true)
    expect(s.finalScore).toBe(2)
  })
})
