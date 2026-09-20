import { describe, expect, test } from "vitest"
import { jdcReport, nextGrade, PART_MAXIMUMS, TOTAL_DARTS } from "@/lib/practice"
import { throwDarts } from "@/tests/helpers/darts"

const missRound = "MISS MISS MISS"
const part1Blank = Array.from({ length: 6 }, () => missRound).join(" ")
const part2Blank = Array.from({ length: 21 }, () => "MISS").join(" ")
const part3Blank = part1Blank

describe("jdcReport", () => {
  test("splits the score into its three parts", () => {
    // Part 1: shanghai the 10 (60 + 100), nothing else.
    // Part 2: D1 and the bull.
    // Part 3: three treble 15s.
    const part1 = `10 D10 T10 ${Array.from({ length: 5 }, () => missRound).join(" ")}`
    const part2 = ["D1", ...Array.from({ length: 19 }, () => "MISS"), "BULL"].join(" ")
    const part3 = `T15 T15 T15 ${Array.from({ length: 5 }, () => missRound).join(" ")}`
    const report = jdcReport(throwDarts(`${part1} ${part2} ${part3}`))

    expect(report.parts).toEqual([160, 150, 135])
    expect(report.score).toBe(445)
    expect(report.grade).toBe("Yellow")
    expect(report.complete).toBe(true)
    expect(report.dartsThrown).toBe(TOTAL_DARTS)
  })

  test("counts shanghais and doubles hit", () => {
    const part1 = `10 D10 T10 11 D11 T11 ${Array.from({ length: 4 }, () => missRound).join(" ")}`
    const part2 = ["D1", "D2", ...Array.from({ length: 18 }, () => "MISS"), "BULL"].join(" ")
    const report = jdcReport(throwDarts(`${part1} ${part2} ${part3Blank}`))

    expect(report.shanghais).toBe(2)
    expect(report.doublesHit).toBe(3)
    expect(report.rounds.filter((r) => r.shanghai).map((r) => r.number)).toEqual([10, 11])
  })

  test("reports which doubles were hit, in target order", () => {
    const part2 = ["MISS", "D2", ...Array.from({ length: 18 }, () => "MISS"), "MISS"].join(" ")
    const report = jdcReport(throwDarts(`${part1Blank} ${part2} ${part3Blank}`))

    expect(report.doubles).toHaveLength(21)
    expect(report.doubles[0]).toEqual({ target: 1, hit: false, thrown: true })
    expect(report.doubles[1]).toEqual({ target: 2, hit: true, thrown: true })
    expect(report.doubles[20]).toEqual({ target: 25, hit: false, thrown: true })
  })

  test("the outer bull does not count as the part 2 double", () => {
    const part2 = [...Array.from({ length: 20 }, () => "MISS"), "25"].join(" ")
    const report = jdcReport(throwDarts(`${part1Blank} ${part2} ${part3Blank}`))
    expect(report.doubles[20].hit).toBe(false)
    expect(report.parts[1]).toBe(0)
  })

  test("the running total matches the engine dart by dart", () => {
    const report = jdcReport(throwDarts(`10 D10 T10 ${Array.from({ length: 5 }, () => missRound).join(" ")}`))
    // Points bank when the round closes, so the first two darts show zero.
    expect(report.cumulative.slice(0, 3)).toEqual([0, 0, 160])
    expect(report.cumulative).toHaveLength(18)
  })

  test("handles a part-thrown attempt without inventing a score", () => {
    const report = jdcReport(throwDarts("10 D10 T10 11"))
    expect(report.complete).toBe(false)
    expect(report.dartsThrown).toBe(4)
    expect(report.score).toBe(160)
    expect(report.doubles.every((d) => !d.thrown)).toBe(true)
  })

  test("ignores darts thrown past the 57th", () => {
    const all = Array.from({ length: 60 }, () => "MISS").join(" ")
    expect(jdcReport(throwDarts(all)).dartsThrown).toBe(TOTAL_DARTS)
  })

  test("part maximums assume a shanghai on every number and every double hit", () => {
    // Part 1 is 10-15: six numbers at 6n + 100.
    expect(PART_MAXIMUMS[0]).toBe([10, 11, 12, 13, 14, 15].reduce((s, n) => s + n * 6 + 100, 0))
    expect(PART_MAXIMUMS[1]).toBe(20 * 50 + 100)
    expect(PART_MAXIMUMS[2]).toBe([15, 16, 17, 18, 19, 20].reduce((s, n) => s + n * 6 + 100, 0))
    expect(PART_MAXIMUMS[0] + PART_MAXIMUMS[1] + PART_MAXIMUMS[2]).toBe(3380)
  })
})

describe("nextGrade", () => {
  test("names the belt above the score and the points to it", () => {
    expect(nextGrade(0)).toEqual({ name: "Purple", pointsAway: 150 })
    expect(nextGrade(488)).toEqual({ name: "Blue", pointsAway: 112 })
    expect(nextGrade(849)).toEqual({ name: "Black", pointsAway: 1 })
  })

  test("returns null on Black — there is nothing above it", () => {
    expect(nextGrade(850)).toBeNull()
    expect(nextGrade(1200)).toBeNull()
  })
})
