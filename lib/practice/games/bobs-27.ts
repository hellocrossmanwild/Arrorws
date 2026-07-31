import type { Dart, PracticeState } from "@/lib/types"
import type { PracticeEngine } from "../types"
import { labelForTarget } from "../types"

interface Bobs27State extends PracticeState {
  roundDarts: number
  roundHasHit: boolean
}

/**
 * Bob's 27. Starting score 27, twenty rounds, round n targets Dn.
 * Each dart that hits Dn adds 2n. If all three darts of a round miss,
 * subtract 2n. Below zero at any point is elimination, ending the game
 * immediately with the score at the point of elimination.
 * A perfect run with every double hit once scores 447.
 */
export const bobs27: PracticeEngine = {
  key: "bobs-27",

  initial() {
    return withDerived({
      currentTarget: null,
      targetLabel: "",
      roundIndex: 0,
      dartsThrown: 0,
      score: 27,
      progressLabel: "",
      complete: false,
      eliminated: false,
      finalScore: null,
      roundDarts: 0,
      roundHasHit: false,
    })
  },

  onDart(state, dart: Dart) {
    const s = state as Bobs27State
    if (s.complete) return s
    const n = s.roundIndex + 1
    const hit = dart.ring === "D" && dart.segment === n

    let score = s.score
    let roundHasHit = s.roundHasHit
    if (hit) {
      score += 2 * n
      roundHasHit = true
    }

    let roundDarts = s.roundDarts + 1
    let roundIndex = s.roundIndex
    let eliminated = s.eliminated
    let complete = false

    if (roundDarts === 3) {
      // The miss penalty applies only after all three darts of the round.
      if (!roundHasHit) {
        score -= 2 * n
        if (score < 0) {
          eliminated = true
          complete = true
        }
      }
      if (!complete) {
        roundIndex += 1
        if (roundIndex >= 20) complete = true
      }
      roundDarts = 0
      roundHasHit = false
    }

    return withDerived({
      ...s,
      score,
      roundIndex,
      roundDarts,
      roundHasHit,
      eliminated,
      complete,
      dartsThrown: s.dartsThrown + 1,
      finalScore: complete ? score : null,
    })
  },

  targetFor(state) {
    return state.currentTarget
  },
}

function withDerived(s: Bobs27State): Bobs27State {
  const target = s.complete
    ? null
    : ({ type: "segment", segment: s.roundIndex + 1, ring: "D" } as const)
  return {
    ...s,
    currentTarget: target,
    targetLabel: labelForTarget(target),
    progressLabel: `Round ${Math.min(s.roundIndex + 1, 20)} of 20`,
  }
}
