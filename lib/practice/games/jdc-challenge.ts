import type { Dart, PracticeState, PracticeTarget, Ring } from "@/lib/types"
import type { PracticeEngine } from "../types"
import { labelForTarget } from "../types"

/**
 * The JDC Challenge (ADR 0007): the Junior Darts Corporation's graded
 * assessment routine, used fortnightly as the programme's fitness test.
 *
 * Part 1: Shanghai 10-15 — three darts per number; hits score face value,
 *         single + double + treble of the number in one round scores 100.
 * Part 2: one dart at every double D1-D20 then bull — 50 points per
 *         double hit, 100 for the bull.
 * Part 3: Shanghai 15-20, as part 1.
 *
 * 57 darts total. Grades: White 0-149, Purple -299, Yellow -449,
 * Green -599, Blue -699, Red -849, Black 850+.
 */

const PART1 = [10, 11, 12, 13, 14, 15]
const PART3 = [15, 16, 17, 18, 19, 20]
const PART2_TARGETS: PracticeTarget[] = [
  ...Array.from({ length: 20 }, (_, i): PracticeTarget => ({
    type: "segment",
    segment: i + 1,
    ring: "D",
  })),
  { type: "segment", segment: 25, ring: "D" },
]

export const JDC_GRADES = [
  { name: "White", min: 0 },
  { name: "Purple", min: 150 },
  { name: "Yellow", min: 300 },
  { name: "Green", min: 450 },
  { name: "Blue", min: 600 },
  { name: "Red", min: 700 },
  { name: "Black", min: 850 },
] as const

export function gradeForJdcScore(score: number): string {
  let grade = JDC_GRADES[0].name as string
  for (const g of JDC_GRADES) {
    if (score >= g.min) grade = g.name
  }
  return grade
}

interface JdcState extends PracticeState {
  part: 0 | 1 | 2
  partRound: number
  roundDarts: number
  roundPoints: number
  ringsHit: Ring[]
}

export const jdcChallenge: PracticeEngine = {
  key: "jdc-challenge",

  initial() {
    return withDerived({
      currentTarget: null,
      targetLabel: "",
      roundIndex: 0,
      dartsThrown: 0,
      score: 0,
      progressLabel: "",
      complete: false,
      eliminated: false,
      finalScore: null,
      part: 0,
      partRound: 0,
      roundDarts: 0,
      roundPoints: 0,
      ringsHit: [],
    })
  },

  onDart(state, dart: Dart) {
    const s = state as JdcState
    if (s.complete) return s

    let { part, partRound, roundDarts, roundPoints, ringsHit, score } = s

    if (part === 1) {
      // One dart per double.
      const target = PART2_TARGETS[partRound]
      if (
        target.type === "segment" &&
        dart.ring === "D" &&
        dart.segment === target.segment
      ) {
        score += target.segment === 25 ? 100 : 50
      }
      partRound += 1
      if (partRound >= PART2_TARGETS.length) {
        part = 2
        partRound = 0
      }
    } else {
      const numbers = part === 0 ? PART1 : PART3
      const n = numbers[partRound]
      const hit = dart.segment === n && dart.ring !== "MISS"
      if (hit) {
        roundPoints += dart.score
        if (!ringsHit.includes(dart.ring)) ringsHit = [...ringsHit, dart.ring]
      }
      roundDarts += 1
      if (roundDarts === 3) {
        const shanghai =
          ringsHit.includes("S") && ringsHit.includes("D") && ringsHit.includes("T")
        score += shanghai ? 100 : roundPoints
        roundDarts = 0
        roundPoints = 0
        ringsHit = []
        partRound += 1
        if (partRound >= numbers.length) {
          part = (part + 1) as 1 | 2
          partRound = 0
        }
      }
    }

    const dartsThrown = s.dartsThrown + 1
    const complete = dartsThrown >= 57
    return withDerived({
      ...s,
      part: (complete ? 2 : part) as 0 | 1 | 2,
      partRound,
      roundDarts,
      roundPoints,
      ringsHit,
      score,
      dartsThrown,
      roundIndex: partRound,
      complete,
      finalScore: complete ? score : null,
    })
  },

  targetFor(state) {
    return state.currentTarget
  },
}

function withDerived(s: JdcState): JdcState {
  let target: PracticeTarget | null = null
  let progressLabel = ""
  if (!s.complete) {
    if (s.part === 1) {
      target = PART2_TARGETS[s.partRound]
      progressLabel = `Part 2 · double ${s.partRound + 1} of 21`
    } else {
      const numbers = s.part === 0 ? PART1 : PART3
      target = { type: "segment", segment: numbers[s.partRound], ring: null }
      progressLabel = `Part ${s.part === 0 ? 1 : 3} · ${numbers[s.partRound]}s`
    }
  } else {
    progressLabel = gradeForJdcScore(s.score)
  }
  return {
    ...s,
    currentTarget: target,
    targetLabel: labelForTarget(target),
    progressLabel,
  }
}
