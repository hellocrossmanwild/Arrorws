import { describe, expect, test } from "vitest"
import { derivePracticeState, dartTargetFor, getEngine } from "@/lib/practice"
import { makeRng } from "@/lib/utils/rng"
import { findCheckout } from "@/lib/scoring"
import type { Dart } from "@/lib/types"
import { dart, seg, throwDarts } from "@/tests/helpers/darts"

const replay = (key: Parameters<typeof derivePracticeState>[1], labels: string, config = {}) =>
  derivePracticeState(throwDarts(labels), key, config)

describe("around-the-clock", () => {
  test("advances only on a hit of the current number, in any ring", () => {
    let s = replay("around-the-clock", "5 T1")
    expect(s.roundIndex).toBe(1) // miss (5), then T1 counts for target 1
    s = replay("around-the-clock", "1 D2 3 4")
    expect(s.roundIndex).toBe(4)
    expect(s.dartsThrown).toBe(4)
  })

  test("completes after 22 targets and scores darts to complete", () => {
    const labels = [
      ...Array.from({ length: 20 }, (_, i) => String(i + 1)),
      "25",
      "BULL",
    ].join(" ")
    const s = replay("around-the-clock", labels)
    expect(s.complete).toBe(true)
    expect(s.finalScore).toBe(22)
  })

  test("bull does not complete the 25 target early", () => {
    const s = replay(
      "around-the-clock",
      [...Array.from({ length: 20 }, (_, i) => String(i + 1)), "BULL"].join(" ")
    )
    expect(s.complete).toBe(false)
    expect(s.roundIndex).toBe(20) // still on the 25 target
  })
})

describe("doubles-round-the-board", () => {
  test("advances only on the exact double, and bull completes it", () => {
    let s = replay("doubles-round-the-board", "1 T1 D1")
    expect(s.roundIndex).toBe(1)
    const perfect = [
      ...Array.from({ length: 20 }, (_, i) => `D${i + 1}`),
      "BULL",
    ].join(" ")
    s = replay("doubles-round-the-board", perfect)
    expect(s.complete).toBe(true)
    expect(s.finalScore).toBe(21)
  })
})

describe("bobs-27", () => {
  test("a perfect run with every double hit once scores 447", () => {
    const labels = Array.from({ length: 20 }, (_, i) => `D${i + 1} MISS MISS`).join(" ")
    const s = replay("bobs-27", labels)
    expect(s.complete).toBe(true)
    expect(s.eliminated).toBe(false)
    expect(s.finalScore).toBe(447)
  })

  test("subtracts on a three-dart miss", () => {
    const s = replay("bobs-27", "MISS MISS MISS")
    expect(s.score).toBe(27 - 2)
    expect(s.roundIndex).toBe(1)
  })

  test("the miss penalty applies only after all three darts", () => {
    const s = replay("bobs-27", "MISS MISS")
    expect(s.score).toBe(27)
    expect(s.roundIndex).toBe(0)
  })

  test("eliminates below zero and ends immediately with the score at that point", () => {
    // Miss rounds 1-4: 27 -2 -4 -6 -8 = 7. Round 5 miss: 7 - 10 = -3 -> eliminated
    const labels = Array.from({ length: 15 }, () => "MISS").join(" ")
    const s = replay("bobs-27", labels)
    expect(s.eliminated).toBe(true)
    expect(s.complete).toBe(true)
    expect(s.finalScore).toBe(-3)
  })

  test("undo rewinds an elimination (replaying the shorter log)", () => {
    const labels = Array.from({ length: 15 }, () => "MISS")
    const eliminated = replay("bobs-27", labels.join(" "))
    expect(eliminated.eliminated).toBe(true)
    const rewound = replay("bobs-27", labels.slice(0, 14).join(" "))
    expect(rewound.eliminated).toBe(false)
    expect(rewound.complete).toBe(false)
    expect(rewound.score).toBe(7)
  })
})

describe("shanghai", () => {
  test("hits score the segment's real value", () => {
    const s = replay("shanghai", "T1 1 MISS")
    expect(s.score).toBe(4)
    expect(s.roundIndex).toBe(1)
  })

  test("ends immediately on single, double and treble of the round's number", () => {
    const s = replay("shanghai", "1 D1 T1")
    expect(s.complete).toBe(true)
    expect(s.shanghai).toBe(true)
    expect(s.finalScore).toBe(1 + 2 + 3)
  })

  test("three rings across different rounds is not a shanghai", () => {
    const s = replay("shanghai", "1 D1 MISS T2 MISS MISS")
    expect(s.shanghai).toBe(false)
    expect(s.complete).toBe(false)
    expect(s.roundIndex).toBe(2)
  })

  test("a treble in round 7 scores 21", () => {
    const sixRounds = Array.from({ length: 18 }, () => "MISS").join(" ")
    const s = replay("shanghai", `${sixRounds} T7`)
    expect(s.score).toBe(21)
  })
})

describe("halve-it", () => {
  test("halves and rounds down on a missed round", () => {
    // Round 1: three 20s = 60. Round 2 (19s): all missed -> 30. Round 3 (18s): missed -> 15.
    // Round 4 (any double): missed -> 7 (floor of 7.5).
    const s = replay("halve-it", "20 20 20 MISS MISS MISS MISS MISS MISS 5 5 5")
    expect(s.score).toBe(7)
    expect(s.roundIndex).toBe(4)
  })

  test("the 41 round is satisfied by the three-dart total", () => {
    // Reach round 5 (41): rounds 1-4 scoring: 20|19|18|D20
    const prefix = "20 MISS MISS 19 MISS MISS 18 MISS MISS D20 MISS MISS"
    const base = 20 + 19 + 18 + 40
    const hit41 = replay("halve-it", `${prefix} 20 20 1`)
    expect(hit41.score).toBe(base + 41)
    const miss41 = replay("halve-it", `${prefix} 20 20 2`)
    expect(miss41.score).toBe(Math.floor(base / 2))
  })

  test("a single dart of 41-value does not satisfy the 41 round unless the total is 41", () => {
    const prefix = "20 MISS MISS 19 MISS MISS 18 MISS MISS D20 MISS MISS"
    // T20 + MISS + MISS = 60 total: not 41
    const s = replay("halve-it", `${prefix} T20 MISS MISS`)
    expect(s.score).toBe(Math.floor((20 + 19 + 18 + 40) / 2))
  })

  test("completes after seven rounds", () => {
    const s = replay(
      "halve-it",
      "20 20 20 19 19 19 18 18 18 D10 MISS MISS 20 20 1 T5 MISS MISS BULL MISS MISS"
    )
    expect(s.complete).toBe(true)
    // 60 + 57 + 54 + 20 + 41 + 15 + 50
    expect(s.finalScore).toBe(60 + 57 + 54 + 20 + 41 + 15 + 50)
  })
})

describe("checkout-ladder", () => {
  test("starts at 41 and advances on success", () => {
    const s = replay("checkout-ladder", "9 D16")
    expect(s.score).toBe(41)
    expect(s.currentTarget).toEqual({ type: "score", score: 42 })
  })

  test("failure repeats the same target; three consecutive failures end the game", () => {
    const miss = "MISS MISS MISS"
    let s = replay("checkout-ladder", `${miss} ${miss}`)
    expect(s.complete).toBe(false)
    expect(s.currentTarget).toEqual({ type: "score", score: 41 })
    s = replay("checkout-ladder", `${miss} ${miss} ${miss}`)
    expect(s.complete).toBe(true)
    expect(s.finalScore).toBe(0)
  })

  test("a bust ends the attempt as a failure", () => {
    // 41: D20 leaves 1 -> bust -> failure
    const s = replay("checkout-ladder", "D20 D20 D20")
    expect(s.complete).toBe(true)
    expect(s.finalScore).toBe(0)
  })

  test("skips impossible checkouts", () => {
    // Take out 158 -> next should be 160, skipping 159
    const engine = getEngine("checkout-ladder")
    const rng = makeRng(1)
    let state = engine.initial({}, rng)
    // Fast-forward the internal ladder by taking out checkouts from 41... instead,
    // verify the skip table directly via a crafted state replay: take 158 out from a fresh
    // ladder is impossible, so assert on the skip helper through observable behaviour:
    // successive successes from 41 never land on an impossible target.
    const impossible = new Set([159, 162, 163, 165, 166, 168, 169])
    let current = 41
    for (let i = 0; i < 300 && !state.complete; i++) {
      const target = state.currentTarget
      if (!target || target.type !== "score") break
      expect(impossible.has(target.score)).toBe(false)
      expect(target.score).toBeGreaterThanOrEqual(current)
      current = target.score
      // Take it out: use the engine's own suggested route
      const route = findCheckout(target.score, 3)
      expect(route).not.toBeNull()
      for (const segm of route!) {
        state = engine.onDart(state, dart(segm))
      }
    }
    expect(state.complete).toBe(true)
    expect(state.finalScore).toBe(170)
  })
})

describe("random-checkout", () => {
  test("produces only checkable scores and is reproducible for a fixed seed", () => {
    const a = derivePracticeState([], "random-checkout", { rngSeed: 42 })
    const b = derivePracticeState([], "random-checkout", { rngSeed: 42 })
    const c = derivePracticeState([], "random-checkout", { rngSeed: 43 })
    expect(a.currentTarget).toEqual(b.currentTarget)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c))
  })

  test("all twenty targets are solvable in three darts and within 41-170", () => {
    const engine = getEngine("random-checkout")
    const state = engine.initial({ rngSeed: 7 }, makeRng(7))
    const targets = (state as unknown as { targets: number[] }).targets
    expect(targets).toHaveLength(20)
    for (const t of targets) {
      expect(t).toBeGreaterThanOrEqual(41)
      expect(t).toBeLessThanOrEqual(170)
      expect(findCheckout(t, 3)).not.toBeNull()
    }
  })

  test("counts checkouts made out of 20", () => {
    // Whatever the first target is, take it out with its own route, then miss out round 2
    const engine = getEngine("random-checkout")
    let state = engine.initial({ rngSeed: 5 }, makeRng(5))
    const first = state.currentTarget
    expect(first?.type).toBe("score")
    const route = findCheckout((first as { score: number }).score, 3)!
    for (const segm of route) state = engine.onDart(state, dart(segm))
    expect(state.score).toBe(1)
    expect(state.roundIndex).toBe(1)
  })
})

describe("scoring-drill", () => {
  test("ends after exactly sixty darts and reports average and strike rate", () => {
    const labels = Array.from({ length: 60 }, (_, i) => (i % 3 === 0 ? "T20" : "20")).join(" ")
    const s = replay("scoring-drill", labels)
    expect(s.complete).toBe(true)
    // 20 visits of T20 20 20 = 100 each -> total 2000, average 100
    expect(s.finalScore).toBe(100)
    expect(s.strikeRate).toBeCloseTo((20 / 60) * 100, 1)
    const more = replay("scoring-drill", `${labels} T20`)
    expect(more.dartsThrown).toBe(60) // extra darts are ignored once complete
  })
})

describe("targets on darts", () => {
  test("dartTargetFor resolves segment, anyRing and score targets", () => {
    const atc = derivePracticeState([], "around-the-clock", {})
    expect(dartTargetFor(atc)).toEqual({ targetSegment: 1, targetRing: "S" })

    const drtb = derivePracticeState([], "doubles-round-the-board", {})
    expect(dartTargetFor(drtb)).toEqual({ targetSegment: 1, targetRing: "D" })

    const ladder = derivePracticeState([], "checkout-ladder", {})
    // 41 route under the preference order: 1 then D20
    expect(dartTargetFor(ladder)).toEqual({ targetSegment: 1, targetRing: "S" })

    const drill = derivePracticeState([], "scoring-drill", {})
    expect(dartTargetFor(drill)).toEqual({ targetSegment: 20, targetRing: "T" })
  })

  test("every engine is pure: same log, same state", () => {
    const keys = [
      "around-the-clock",
      "doubles-round-the-board",
      "bobs-27",
      "shanghai",
      "halve-it",
      "checkout-ladder",
      "random-checkout",
      "scoring-drill",
    ] as const
    const darts: Dart[] = throwDarts("T20 5 D16 MISS 1 D1 T1 25 BULL 20 19 18")
    for (const key of keys) {
      const a = derivePracticeState(darts, key, { rngSeed: 9 })
      const b = derivePracticeState(darts, key, { rngSeed: 9 })
      expect(a).toEqual(b)
    }
  })

  test("undo rewinds a target advancement (shorter log replays to earlier state)", () => {
    const hit = throwDarts("1 2")
    const s2 = derivePracticeState(hit, "around-the-clock", {})
    expect(s2.roundIndex).toBe(2)
    const s1 = derivePracticeState(hit.slice(0, 1), "around-the-clock", {})
    expect(s1.roundIndex).toBe(1)
  })
})

describe("41 checkout route sanity", () => {
  test("41 is 1 then D20 under the preference order", () => {
    const route = findCheckout(41, 3)!
    expect(route.map((s) => `${s.ring}${s.segment}`)).toEqual(["S1", "D20"])
  })

  test("seg helper", () => {
    expect(seg("D16")).toEqual({ segment: 16, ring: "D" })
  })
})
