import type { Dart, PracticeState } from "@/lib/types"
import type { PracticeEngine, Rng } from "../types"
import { labelForTarget } from "../types"
import { applyDartToScore, findCheckout } from "@/lib/scoring"

const ROUNDS = 20

interface RandomCheckoutState extends PracticeState {
  targets: number[]
  made: number
}

/**
 * Random checkout. Twenty rounds, each a random score between 41 and 170
 * that findCheckout can solve in three darts, drawn up-front from the
 * injected rng so a fixed seed reproduces the same twenty scores.
 * Score: checkouts taken out of 20.
 */
export const randomCheckout: PracticeEngine = {
  key: "random-checkout",

  initial(_config: unknown, rng: Rng) {
    const targets: number[] = []
    while (targets.length < ROUNDS) {
      const candidate = 41 + Math.floor(rng() * 130) // 41..170
      if (findCheckout(candidate, 3)) targets.push(candidate)
    }
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
      made: 0,
      attemptRemaining: targets[0],
      attemptDartsLeft: 3,
    })
  },

  onDart(state, dart: Dart) {
    const s = state as RandomCheckoutState
    if (s.complete) return s
    const { next, bust, won } = applyDartToScore(
      s.attemptRemaining ?? s.targets[s.roundIndex],
      { segment: dart.segment, ring: dart.ring }
    )
    const base = { ...s, dartsThrown: s.dartsThrown + 1 }
    const dartsLeft = (s.attemptDartsLeft ?? 3) - 1

    if (won || bust || dartsLeft === 0) {
      const made = won ? s.made + 1 : s.made
      const roundIndex = s.roundIndex + 1
      const complete = roundIndex >= ROUNDS
      return withDerived({
        ...base,
        made,
        score: made,
        roundIndex,
        complete,
        finalScore: complete ? made : null,
        attemptRemaining: complete ? undefined : s.targets[roundIndex],
        attemptDartsLeft: complete ? undefined : 3,
      })
    }

    return withDerived({ ...base, attemptRemaining: next, attemptDartsLeft: dartsLeft })
  },

  targetFor(state) {
    return state.currentTarget
  },
}

function withDerived(s: RandomCheckoutState): RandomCheckoutState {
  const target = s.complete
    ? null
    : ({ type: "score", score: s.targets[s.roundIndex] } as const)
  return {
    ...s,
    currentTarget: target,
    targetLabel: labelForTarget(target),
    progressLabel: `Checkout ${Math.min(s.roundIndex + 1, ROUNDS)} of ${ROUNDS}`,
  }
}
