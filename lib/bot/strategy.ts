import type { BotProfile, Segment } from "@/lib/types"
import { findCheckout } from "@/lib/scoring"

/**
 * What the bot aims at. No scoring rules live here — whether a dart busts
 * is /lib/scoring's business (spec 0006 note 4).
 */
export function chooseTarget(
  score: number,
  dartsRemaining: 1 | 2 | 3,
  _profile: BotProfile
): Segment {
  const route = findCheckout(score, dartsRemaining)
  if (route) return route[0]

  // No route. Above 170 (or on the big odd scores): keep scoring at T20.
  if (score > 100) return { segment: 20, ring: "T" }

  // Below 100 with no route: leave a double. Aim the single that leaves an
  // even number of 40 or less, preferring the classic leaves.
  for (const leave of [40, 32, 36, 24, 20, 16, 28, 12, 8, 4, 2, 38, 34, 30, 26, 22, 18, 14, 10, 6]) {
    const single = score - leave
    if (single >= 1 && single <= 20) return { segment: single, ring: "S" }
  }
  // No single leaves a two-dart-friendly even number (e.g. 99 with one
  // dart): take an odd treble to fix the parity, biggest first.
  for (const t of [19, 17, 15, 13, 11, 9, 7, 5, 3, 1]) {
    const leave = score - t * 3
    if (leave >= 2 && leave % 2 === 0) return { segment: t, ring: "T" }
  }
  // Nothing tidy (very low odd scores): chip a single 1.
  return { segment: 1, ring: "S" }
}

/** Doubles are thrown worse than trebles by every player: pick the sigma for the aim. */
export function sigmaFor(target: Segment, profile: BotProfile): number {
  const scoring = profile.scoringSigmaMm ?? 40
  const doubles = profile.doubleSigmaMm ?? scoring * 1.5
  return target.ring === "D" ? doubles : scoring
}
