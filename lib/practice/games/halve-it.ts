import type { Dart, PracticeState, PracticeTarget } from "@/lib/types"
import type { PracticeEngine } from "../types"
import { labelForTarget, matchesTarget } from "../types"

const ROUNDS: PracticeTarget[] = [
  { type: "segment", segment: 20, ring: null },
  { type: "segment", segment: 19, ring: null },
  { type: "segment", segment: 18, ring: null },
  { type: "anyRing", ring: "D" },
  { type: "score", score: 41 },
  { type: "anyRing", ring: "T" },
  { type: "segment", segment: 25, ring: "D" },
]

interface HalveItState extends PracticeState {
  roundDarts: number
  roundHit: boolean
  roundTotal: number
}

/**
 * Halve it. Seven rounds: 20, 19, 18, any double, 41, any treble, bull.
 * Satisfying darts add their real value; a round with no satisfying dart
 * halves the score, rounded down. The 41 round is satisfied by the
 * three-dart total, not by any single dart.
 */
export const halveIt: PracticeEngine = {
  key: "halve-it",

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
      roundDarts: 0,
      roundHit: false,
      roundTotal: 0,
    })
  },

  onDart(state, dart: Dart) {
    const s = state as HalveItState
    if (s.complete) return s
    const target = ROUNDS[s.roundIndex]
    const isScoreRound = target.type === "score"

    let score = s.score
    let roundHit = s.roundHit
    const roundTotal = s.roundTotal + dart.score

    if (!isScoreRound && matchesTarget(dart, target)) {
      score += dart.score
      roundHit = true
    }

    let roundDarts = s.roundDarts + 1
    let roundIndex = s.roundIndex
    let complete = false

    if (roundDarts === 3) {
      if (isScoreRound) {
        // Satisfied by scoring exactly 41 with the three darts combined.
        if (roundTotal === target.score) score += target.score
        else score = Math.floor(score / 2)
      } else if (!roundHit) {
        score = Math.floor(score / 2)
      }
      roundIndex += 1
      roundDarts = 0
      roundHit = false
      if (roundIndex >= ROUNDS.length) complete = true
    }

    return withDerived({
      ...s,
      score,
      roundIndex,
      roundDarts,
      roundHit,
      roundTotal: roundDarts === 0 ? 0 : roundTotal,
      complete,
      dartsThrown: s.dartsThrown + 1,
      finalScore: complete ? score : null,
    })
  },

  targetFor(state) {
    return state.currentTarget
  },
}

function withDerived(s: HalveItState): HalveItState {
  const target = s.complete ? null : ROUNDS[s.roundIndex]
  // The 41 round: aim the fat 20 until the remainder fits a single.
  let aimHint: HalveItState["aimHint"]
  if (target?.type === "score") {
    const remaining = target.score - s.roundTotal
    aimHint =
      remaining >= 1 && remaining <= 20
        ? { targetSegment: remaining, targetRing: "S" }
        : { targetSegment: 20, targetRing: "S" }
  }
  return {
    ...s,
    currentTarget: target,
    targetLabel: labelForTarget(target),
    aimHint,
    progressLabel: `Round ${Math.min(s.roundIndex + 1, ROUNDS.length)} of ${ROUNDS.length}`,
  }
}
