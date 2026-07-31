import { describe, expect, test } from "vitest"
import { derivePracticeState, hudFor } from "@/lib/practice"
import type { PracticeGameKey } from "@/lib/types"
import { throwDarts } from "@/tests/helpers/darts"

/** Replay a label string through an engine and build its HUD (spec 0010). */
const hud = (key: PracticeGameKey, labels: string, config = {}, extras = {}) => {
  const darts = throwDarts(labels)
  const state = derivePracticeState(darts, key, config)
  return hudFor(key, state, { darts, ...extras })
}

const chip = (h: ReturnType<typeof hud>, label: string) =>
  h.chips.find((c) => c.label === label)?.value

describe("around the clock / doubles round the board", () => {
  test("the hero is the dart count, never a 'Score'", () => {
    const h = hud("around-the-clock", "1 2 5 5 3")
    expect(h.hero).toMatchObject({ label: "Darts", value: "5" })
    expect(h.chips.map((c) => c.label)).not.toContain("Score")
  })

  test("progress and pace track targets completed", () => {
    const h = hud("around-the-clock", "1 2 5 5 3")
    expect(h.progress).toEqual({ done: 3, total: 22 })
    expect(chip(h, "Per target")).toBe("1.7") // 5 darts / 3 targets
    expect(h.eyebrow).toBe("4 of 22")
  })

  test("no pace chip before the first target falls", () => {
    const h = hud("doubles-round-the-board", "5 5")
    expect(chip(h, "Per target")).toBeUndefined()
    expect(h.progress).toEqual({ done: 0, total: 21 })
  })
})

describe("bobs-27", () => {
  test("score is the hero with the round's miss penalty as the stake line", () => {
    const h = hud("bobs-27", "D1 MISS MISS") // 27 + 2 = 29, on to round 2
    expect(h.hero).toMatchObject({ label: "Score", value: "29" })
    expect(h.hero.tone).toBeUndefined()
    expect(h.sub).toBe("Miss all three −4")
    expect(h.progress).toEqual({ done: 1, total: 20 })
  })

  test("turns dangerous when a blank round would eliminate", () => {
    // Four blank rounds: 27 -> 25 -> 21 -> 15 -> 7; round five's penalty is 10.
    const h = hud("bobs-27", Array(12).fill("MISS").join(" "))
    expect(h.hero).toMatchObject({ value: "7", tone: "danger" })
    expect(h.sub).toBe("A blank round ends it · −10")
  })
})

describe("shanghai", () => {
  test("points hero with S/D/T pips lighting as rings land this round", () => {
    const h = hud("shanghai", "1 D1") // round 1: single and double hit
    expect(h.hero).toMatchObject({ label: "Points", value: "3" })
    expect(h.pips?.pips).toEqual([
      { label: "S", on: true },
      { label: "D", on: true },
      { label: "T", on: false },
    ])
  })

  test("pips reset when the round rolls over", () => {
    const h = hud("shanghai", "1 1 1") // round 1 done, on to the 2s
    expect(h.pips?.pips.every((p) => !p.on)).toBe(true)
    expect(h.progress).toEqual({ done: 1, total: 20 })
  })
})

describe("halve-it", () => {
  test("shows what a blank round halves to", () => {
    const h = hud("halve-it", "20") // 20 points on the 20s round
    expect(h.hero).toMatchObject({ label: "Points", value: "20" })
    expect(h.sub).toBe("A blank halves to 10")
  })

  test("the 41 round tracks the three-dart total", () => {
    // Three rounds of 3 darts pass 20/19/18, the double round, then 41.
    const labels = "20 20 20 19 19 19 18 18 18 D5 D5 D5 15 10"
    const h = hud("halve-it", labels)
    expect(h.sub).toBe("Three-dart total 25 · needs exactly 41")
  })
})

describe("checkout-ladder", () => {
  test("best taken out is the hero, with lives and the attempt as chips", () => {
    const h = hud("checkout-ladder", "MISS MISS MISS") // one failed attempt at 41
    expect(h.hero).toMatchObject({ label: "Best", value: "—" })
    expect(h.pips?.pips.map((p) => p.on)).toEqual([true, true, false])
    expect(chip(h, "To go")).toBe("41")
    expect(chip(h, "Darts left")).toBe("3")
  })

  test("last life turns the hero red", () => {
    const h = hud("checkout-ladder", Array(6).fill("MISS").join(" "))
    expect(h.hero.tone).toBe("danger")
    expect(h.pips?.pips.map((p) => p.on)).toEqual([true, false, false])
  })

  test("a success counts and restores the lives", () => {
    const h = hud("checkout-ladder", "MISS MISS MISS 9 D16") // fail once, then 41 out
    expect(h.hero).toMatchObject({ label: "Best", value: "41" })
    expect(h.eyebrow).toBe("1 taken out")
    expect(h.pips?.pips.every((p) => p.on)).toBe(true)
  })
})

describe("random-checkout", () => {
  test("taken-out count is the hero with the live attempt as chips", () => {
    const h = hud("random-checkout", "MISS", { rngSeed: 7 })
    expect(h.hero.label).toBe("Taken out")
    expect(h.eyebrow).toBe("Checkout 1 of 20")
    expect(chip(h, "Darts left")).toBe("2")
    expect(h.progress).toEqual({ done: 0, total: 20 })
  })
})

describe("scoring-drill", () => {
  test("the running three-dart average is the hero", () => {
    const h = hud("scoring-drill", "T20 20 5")
    expect(h.hero).toMatchObject({ label: "3-dart avg", value: "85.0" })
    expect(chip(h, "T20 rate")).toBe("33.3%")
    expect(chip(h, "Last visit")).toBe("85")
  })

  test("no last-visit chip before a visit completes", () => {
    const h = hud("scoring-drill", "T20 20")
    expect(chip(h, "Last visit")).toBeUndefined()
  })
})

describe("jdc-challenge", () => {
  test("points hero with the provisional grade as the stake line", () => {
    const h = hud("jdc-challenge", "")
    expect(h.hero).toMatchObject({ label: "Points", value: "0" })
    expect(h.sub).toBe("On for White")
    expect(chip(h, "Darts")).toBe("0 of 57")
    expect(h.progress).toEqual({ done: 0, total: 57 })
  })
})

describe("target-switching", () => {
  test("points hero and round progress", () => {
    const h = hud("target-switching", "20 20 20")
    expect(h.hero).toMatchObject({ label: "Points", value: "60" })
    expect(h.progress).toEqual({ done: 1, total: 6 })
  })
})

describe("pressure-doubles", () => {
  test("darts hero, hit pips, and doubles cleared", () => {
    const h = hud("pressure-doubles", "MISS D16")
    expect(h.hero).toMatchObject({ label: "Darts", value: "2" })
    expect(h.eyebrow).toBe("Double 1 of 4")
    expect(h.pips?.pips.map((p) => p.on)).toEqual([true, false])
    expect(chip(h, "Cleared")).toBe("0 of 4")
  })

  test("two clean hits clear the double and reset the pips", () => {
    const h = hud("pressure-doubles", "D16 D16")
    expect(chip(h, "Cleared")).toBe("1 of 4")
    expect(h.pips?.pips.every((p) => !p.on)).toBe(true)
  })
})

describe("the PB chip", () => {
  test("appears when a personal best is supplied and there is room", () => {
    const h = hud("around-the-clock", "1", {}, { personalBest: 41 })
    expect(chip(h, "PB")).toBe("41")
  })

  test("never crowds past three chips", () => {
    const h = hud("scoring-drill", "T20 20 5", {}, { personalBest: 92 })
    expect(h.chips.length).toBeLessThanOrEqual(3)
  })
})
