import { describe, expect, test } from "vitest"
import { findCheckout, labelOf } from "@/lib/scoring"

const labels = (score: number, darts: 1 | 2 | 3) =>
  findCheckout(score, darts)?.map(labelOf) ?? null

describe("findCheckout", () => {
  test("170 in 3 is T20 T20 BULL", () => {
    expect(labels(170, 3)).toEqual(["T20", "T20", "BULL"])
  })

  test("96 in 3 is T20 D18", () => {
    expect(labels(96, 3)).toEqual(["T20", "D18"])
  })

  test("2 in 1 is D1", () => {
    expect(labels(2, 1)).toEqual(["D1"])
  })

  test("60 is 20 then D20, never a treble-first route", () => {
    expect(labels(60, 3)).toEqual(["20", "D20"])
    expect(labels(60, 2)).toEqual(["20", "D20"])
  })

  test("exactly the impossible three-dart scores return null", () => {
    const impossible = [169, 168, 166, 165, 163, 162, 159]
    for (const score of impossible) {
      expect(findCheckout(score, 3), `expected ${score} to be impossible`).toBeNull()
    }
    for (let score = 2; score <= 170; score++) {
      if (impossible.includes(score)) continue
      expect(findCheckout(score, 3), `expected ${score} to be checkable`).not.toBeNull()
    }
  })

  test("scores above 170 and below 2 return null", () => {
    expect(findCheckout(171, 3)).toBeNull()
    expect(findCheckout(501, 3)).toBeNull()
    expect(findCheckout(1, 3)).toBeNull()
    expect(findCheckout(0, 3)).toBeNull()
  })

  test("one dart finishes exist only for even 2-40 and 50", () => {
    for (let score = 1; score <= 170; score++) {
      const route = findCheckout(score, 1)
      const finishable = score === 50 || (score >= 2 && score <= 40 && score % 2 === 0)
      if (finishable) {
        expect(route, `expected ${score} finishable in 1`).not.toBeNull()
        expect(route).toHaveLength(1)
      } else {
        expect(route, `expected ${score} not finishable in 1`).toBeNull()
      }
    }
  })

  test("every returned route sums to the score and ends on a double", () => {
    for (let score = 2; score <= 170; score++) {
      for (const darts of [1, 2, 3] as const) {
        const route = findCheckout(score, darts)
        if (!route) continue
        const total = route.reduce(
          (sum, s) => sum + s.segment * (s.ring === "T" ? 3 : s.ring === "D" ? 2 : 1),
          0
        )
        expect(total).toBe(score)
        expect(route.length).toBeLessThanOrEqual(darts)
        const last = route[route.length - 1]
        expect(last.ring).toBe("D")
      }
    }
  })

  test("preference order picks the player's double: 40 is D20, 32 is D16", () => {
    expect(labels(40, 1)).toEqual(["D20"])
    expect(labels(32, 1)).toEqual(["D16"])
    expect(labels(100, 3)).toEqual(["T20", "D20"])
  })
})
