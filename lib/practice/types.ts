import type { Dart, PracticeGameKey, PracticeState, PracticeTarget, Ring } from "@/lib/types"
import type { Rng } from "@/lib/utils/rng"
import { findCheckout, labelOf } from "@/lib/scoring"

export type { PracticeState, PracticeTarget }
export type { Rng }

/**
 * A practice game engine. Same purity rules as /lib/scoring: state in,
 * state out, randomness injected, time irrelevant. Engines may carry
 * internal fields beyond PracticeState; they cast internally.
 */
export interface PracticeEngine {
  key: PracticeGameKey
  initial(config: unknown, rng: Rng): PracticeState
  onDart(state: PracticeState, dart: Dart): PracticeState
  targetFor(state: PracticeState): PracticeTarget | null
}

/** Does a landed dart satisfy a target? (Score targets are judged by their engine, not here.) */
export function matchesTarget(dart: Dart, target: PracticeTarget): boolean {
  switch (target.type) {
    case "segment":
      if (target.ring === null) {
        return dart.segment === target.segment && dart.ring !== "MISS"
      }
      return dart.segment === target.segment && dart.ring === target.ring
    case "anyRing":
      return dart.ring === target.ring
    case "score":
      return false
  }
}

export function labelForTarget(target: PracticeTarget | null): string {
  if (!target) return ""
  switch (target.type) {
    case "segment": {
      if (target.ring === null) return String(target.segment === 25 ? 25 : target.segment)
      return labelOf({ segment: target.segment, ring: target.ring })
    }
    case "anyRing":
      return target.ring === "D" ? "Any double" : "Any treble"
    case "score":
      return `Score ${target.score}`
  }
}

/**
 * Resolve the target of the next dart into the (targetSegment, targetRing)
 * pair written onto the dart record. This is the entire point of the
 * practice suite — it is what makes the doubles heatmap real rather than
 * inferred (spec 0005).
 */
export function dartTargetFor(
  state: PracticeState
): { targetSegment: number | null; targetRing: Ring | null } {
  const target = state.currentTarget
  if (!target) return { targetSegment: null, targetRing: null }
  if (state.aimHint) return state.aimHint
  switch (target.type) {
    case "segment":
      // Aiming at "any ring of n" means aiming at the fat single.
      return { targetSegment: target.segment, targetRing: target.ring ?? "S" }
    case "anyRing":
      return { targetSegment: null, targetRing: target.ring }
    case "score": {
      const remaining = state.attemptRemaining ?? target.score
      const dartsLeft = state.attemptDartsLeft ?? 3
      const route = findCheckout(remaining, clampDarts(dartsLeft))
      if (route && route.length > 0) {
        return { targetSegment: route[0].segment, targetRing: route[0].ring }
      }
      // No route from here (e.g. 39 with one dart): the player still aims —
      // a single that leaves an even number of 40 or less, else a big 20.
      for (const leave of [40, 32, 36, 24, 20, 16, 12, 8, 4, 2]) {
        const single = remaining - leave
        if (single >= 1 && single <= 20) return { targetSegment: single, targetRing: "S" }
      }
      return remaining > 60
        ? { targetSegment: 20, targetRing: "T" }
        : { targetSegment: 1, targetRing: "S" }
    }
  }
}

function clampDarts(n: number): 1 | 2 | 3 {
  return n <= 1 ? 1 : n === 2 ? 2 : 3
}
