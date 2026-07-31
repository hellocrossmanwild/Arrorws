import type { BotProfile, Segment } from "@/lib/types"
import type { Rng } from "@/lib/utils/rng"
import { applyDartToScore } from "@/lib/scoring"
import { chooseTarget, sigmaFor } from "./strategy"
import { simulateThrow } from "./throw"

export { segmentAt, centreOf, RADII, SEGMENT_ORDER } from "./board-geometry"
export { simulateThrow } from "./throw"
export { chooseTarget, sigmaFor } from "./strategy"

export interface BotThrow {
  target: Segment
  landed: Segment
}

/**
 * Throw up to three darts from `score`, stopping on a checkout or a bust.
 * Returns target + landing per dart; the caller records them through the
 * same POST path as a human's darts, so there is no bot-specific scoring
 * code anywhere.
 */
export function playVisit(score: number, profile: BotProfile, rng: Rng): BotThrow[] {
  const throws: BotThrow[] = []
  let remaining = score
  for (let i = 0; i < 3; i++) {
    const dartsRemaining = (3 - i) as 1 | 2 | 3
    const target = chooseTarget(remaining, dartsRemaining, profile)
    const landed = simulateThrow(target, sigmaFor(target, profile), rng)
    throws.push({ target, landed })
    const { next, bust, won } = applyDartToScore(remaining, landed)
    if (bust || won) break
    remaining = next
  }
  return throws
}
