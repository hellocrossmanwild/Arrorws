import type { Dart, PracticeConfig, PracticeState } from "@/lib/types"
import type { PracticeEngine } from "../types"
import { labelForTarget } from "../types"

const CYCLE = [20, 19, 18]

interface SwitchingState extends PracticeState {
  rounds: number
  roundDarts: number
}

/**
 * Target switching (ADR 0007): the warm-up discipline drill. N rounds of
 * three darts, the target cycling 20 -> 19 -> 18. Any ring of the round's
 * number scores its face value. Trains the switch, not the treble.
 */
export const targetSwitching: PracticeEngine = {
  key: "target-switching",

  initial(config) {
    const rounds = (config as PracticeConfig & { rounds?: number } | null)?.rounds ?? 6
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
      rounds: typeof rounds === "number" && rounds > 0 ? rounds : 6,
      roundDarts: 0,
    })
  },

  onDart(state, dart: Dart) {
    const s = state as SwitchingState
    if (s.complete) return s
    const n = CYCLE[s.roundIndex % CYCLE.length]
    const score = s.score + (dart.segment === n && dart.ring !== "MISS" ? dart.score : 0)
    let roundDarts = s.roundDarts + 1
    let roundIndex = s.roundIndex
    if (roundDarts === 3) {
      roundDarts = 0
      roundIndex += 1
    }
    const complete = roundIndex >= s.rounds
    return withDerived({
      ...s,
      score,
      roundDarts,
      roundIndex,
      complete,
      dartsThrown: s.dartsThrown + 1,
      finalScore: complete ? score : null,
    })
  },

  targetFor(state) {
    return state.currentTarget
  },
}

function withDerived(s: SwitchingState): SwitchingState {
  const target = s.complete
    ? null
    : ({ type: "segment", segment: CYCLE[s.roundIndex % CYCLE.length], ring: null } as const)
  return {
    ...s,
    currentTarget: target,
    targetLabel: labelForTarget(target),
    progressLabel: `Round ${Math.min(s.roundIndex + 1, s.rounds)} of ${s.rounds}`,
  }
}
