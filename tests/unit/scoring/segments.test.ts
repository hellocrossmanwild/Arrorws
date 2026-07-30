import { describe, expect, test } from "vitest"
import { SEGMENTS, scoreOf, isDouble, labelOf, applyDartToScore } from "@/lib/scoring"
import { seg } from "@/tests/helpers/darts"

describe("segments", () => {
  test("SEGMENTS covers 60 number segments plus outer bull, bull and miss", () => {
    expect(SEGMENTS).toHaveLength(63)
  })

  test("scoreOf multiplies by the ring", () => {
    expect(scoreOf(seg("20"))).toBe(20)
    expect(scoreOf(seg("D20"))).toBe(40)
    expect(scoreOf(seg("T20"))).toBe(60)
    expect(scoreOf(seg("25"))).toBe(25)
    expect(scoreOf(seg("BULL"))).toBe(50)
    expect(scoreOf(seg("MISS"))).toBe(0)
  })

  test("isDouble returns true for bull", () => {
    expect(isDouble(seg("BULL"))).toBe(true)
    expect(isDouble(seg("D16"))).toBe(true)
    expect(isDouble(seg("25"))).toBe(false)
    expect(isDouble(seg("T20"))).toBe(false)
  })

  test("labelOf produces T20, D16, BULL, 25, MISS", () => {
    expect(labelOf(seg("T20"))).toBe("T20")
    expect(labelOf(seg("D16"))).toBe("D16")
    expect(labelOf(seg("BULL"))).toBe("BULL")
    expect(labelOf(seg("25"))).toBe("25")
    expect(labelOf(seg("MISS"))).toBe("MISS")
    expect(labelOf(seg("5"))).toBe("5")
  })

  describe("applyDartToScore bust conditions", () => {
    test("score below zero busts", () => {
      expect(applyDartToScore(30, seg("T20")).bust).toBe(true)
    })
    test("score of exactly one busts", () => {
      expect(applyDartToScore(21, seg("20")).bust).toBe(true)
    })
    test("score of zero on a non-double busts", () => {
      expect(applyDartToScore(20, seg("20")).bust).toBe(true)
    })
    test("score of zero on a double wins", () => {
      expect(applyDartToScore(40, seg("D20"))).toEqual({ next: 0, bust: false, won: true })
    })
    test("bull checks out 50", () => {
      expect(applyDartToScore(50, seg("BULL")).won).toBe(true)
    })
  })
})
