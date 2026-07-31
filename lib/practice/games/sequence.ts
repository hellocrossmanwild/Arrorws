import type { Dart, PracticeGameKey, PracticeState, PracticeTarget } from "@/lib/types"
import type { PracticeEngine } from "../types"
import { labelForTarget, matchesTarget } from "../types"

interface SequenceState extends PracticeState {
  targets: PracticeTarget[]
}

/**
 * Shared engine for ordered-target games: around the clock and doubles
 * round the board. Advance on a hit; score is total darts to complete.
 */
export function makeSequenceEngine(
  key: PracticeGameKey,
  buildTargets: (config: unknown) => PracticeTarget[]
): PracticeEngine {
  const withDerived = (s: SequenceState): SequenceState => {
    const target = s.roundIndex < s.targets.length ? s.targets[s.roundIndex] : null
    return {
      ...s,
      currentTarget: target,
      targetLabel: labelForTarget(target),
      progressLabel: `${Math.min(s.roundIndex + 1, s.targets.length)} of ${s.targets.length}`,
      complete: s.roundIndex >= s.targets.length,
      finalScore: s.roundIndex >= s.targets.length ? s.dartsThrown : null,
      score: s.dartsThrown,
    }
  }

  return {
    key,
    initial(config) {
      const targets = buildTargets(config)
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
        targets,
      })
    },
    onDart(state, dart: Dart) {
      const s = state as SequenceState
      if (s.complete) return s
      const target = s.targets[s.roundIndex]
      const hit = matchesTarget(dart, target)
      return withDerived({
        ...s,
        dartsThrown: s.dartsThrown + 1,
        roundIndex: hit ? s.roundIndex + 1 : s.roundIndex,
      })
    },
    targetFor(state) {
      return state.currentTarget
    },
  }
}
