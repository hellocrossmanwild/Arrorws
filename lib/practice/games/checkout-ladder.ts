import type { Dart, PracticeState } from "@/lib/types"
import type { PracticeEngine } from "../types"
import { labelForTarget } from "../types"
import { applyDartToScore } from "@/lib/scoring"

/** Checkouts no three-dart route can take out. Skipped automatically. */
const IMPOSSIBLE = new Set([159, 162, 163, 165, 166, 168, 169])

function nextCheckout(current: number): number | null {
  let next = current + 1
  while (IMPOSSIBLE.has(next)) next += 1
  return next > 170 ? null : next
}

interface LadderState extends PracticeState {
  currentCheckout: number
  consecutiveFailures: number
}

/**
 * Checkout ladder. Start at 41, three darts to finish exactly on a double.
 * Success advances the target by one (skipping impossible checkouts);
 * failure repeats it; three consecutive failures on the same target ends
 * the game. Score: the highest checkout successfully taken out.
 */
export const checkoutLadder: PracticeEngine = {
  key: "checkout-ladder",

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
      currentCheckout: 41,
      attemptRemaining: 41,
      attemptDartsLeft: 3,
      consecutiveFailures: 0,
    })
  },

  onDart(state, dart: Dart) {
    const s = state as LadderState
    if (s.complete) return s
    const { next, bust, won } = applyDartToScore(s.attemptRemaining ?? s.currentCheckout, {
      segment: dart.segment,
      ring: dart.ring,
    })

    const base = { ...s, dartsThrown: s.dartsThrown + 1 }

    if (won) {
      const upcoming = nextCheckout(s.currentCheckout)
      return withDerived({
        ...base,
        score: s.currentCheckout,
        consecutiveFailures: 0,
        roundIndex: s.roundIndex + 1,
        currentCheckout: upcoming ?? s.currentCheckout,
        attemptRemaining: upcoming ?? undefined,
        attemptDartsLeft: upcoming ? 3 : undefined,
        complete: upcoming === null,
        finalScore: upcoming === null ? s.currentCheckout : null,
      })
    }

    const dartsLeft = (s.attemptDartsLeft ?? 3) - 1
    const failed = bust || dartsLeft === 0
    if (failed) {
      const failures = s.consecutiveFailures + 1
      const out = failures >= 3
      return withDerived({
        ...base,
        consecutiveFailures: failures,
        attemptRemaining: out ? undefined : s.currentCheckout,
        attemptDartsLeft: out ? undefined : 3,
        complete: out,
        finalScore: out ? s.score : null,
      })
    }

    return withDerived({ ...base, attemptRemaining: next, attemptDartsLeft: dartsLeft })
  },

  targetFor(state) {
    return state.currentTarget
  },
}

function withDerived(s: LadderState): LadderState {
  const target = s.complete ? null : ({ type: "score", score: s.currentCheckout } as const)
  return {
    ...s,
    currentTarget: target,
    targetLabel: labelForTarget(target),
    progressLabel: s.score > 0 ? `Best ${s.score}` : "Nothing taken out yet",
  }
}
