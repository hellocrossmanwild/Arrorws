import type { Ring, Segment } from "@/lib/types"

export const MISS: Segment = { segment: 0, ring: "MISS" }
export const OUTER_BULL: Segment = { segment: 25, ring: "S" }
export const BULL: Segment = { segment: 25, ring: "D" }

function multiplierOf(ring: Ring): number {
  switch (ring) {
    case "S":
      return 1
    case "D":
      return 2
    case "T":
      return 3
    case "MISS":
      return 0
  }
}

/** Every legal segment: singles, doubles and trebles 1-20, outer bull, bull, miss. */
export const SEGMENTS: Segment[] = [
  ...(["S", "D", "T"] as const).flatMap((ring) =>
    Array.from({ length: 20 }, (_, i) => ({ segment: i + 1, ring: ring as Ring }))
  ),
  OUTER_BULL,
  BULL,
  MISS,
]

export function scoreOf(segment: Segment): number {
  if (segment.ring === "MISS") return 0
  return segment.segment * multiplierOf(segment.ring)
}

/**
 * True for D rings and for bull. Bull counts as a double for checkout
 * purposes — the single most commonly mis-implemented rule in darts software.
 */
export function isDouble(segment: Segment): boolean {
  return segment.ring === "D"
}

export function labelOf(segment: Segment): string {
  if (segment.ring === "MISS") return "MISS"
  if (segment.segment === 25) return segment.ring === "D" ? "BULL" : "25"
  if (segment.ring === "S") return String(segment.segment)
  return `${segment.ring}${segment.segment}`
}

export function isLegalSegment(segment: number, ring: Ring): boolean {
  if (ring === "MISS") return segment === 0
  if (segment === 25) return ring === "S" || ring === "D" // no treble 25
  return segment >= 1 && segment <= 20
}

/**
 * Apply one dart to a remaining score under x01 double-out rules.
 * The one place the bust conditions live — the bot and the fold both use it.
 */
export function applyDartToScore(
  score: number,
  segment: Segment
): { next: number; bust: boolean; won: boolean } {
  const next = score - scoreOf(segment)
  // The three bust conditions are one branch, not three (spec 0003 note 2).
  const bust = next < 0 || next === 1 || (next === 0 && !isDouble(segment))
  if (bust) return { next: score, bust: true, won: false }
  return { next, bust: false, won: next === 0 }
}
