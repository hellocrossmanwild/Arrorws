import type { Segment } from "@/lib/types"

/**
 * Standard PDC board dimensions, millimetres from the centre.
 * Segment order clockwise from the top; 20 centred on vertical.
 * Coordinates: x to the right, y upward.
 */
export const RADII = {
  bull: 6.35,
  outerBull: 15.9,
  trebleInner: 99,
  trebleOuter: 107,
  doubleInner: 162,
  doubleOuter: 170,
} as const

export const SEGMENT_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const

/** Cartesian millimetres to the scoring segment, including miss. */
export function segmentAt(x: number, y: number): Segment {
  const r = Math.hypot(x, y)
  if (r > RADII.doubleOuter) return { segment: 0, ring: "MISS" }
  if (r <= RADII.bull) return { segment: 25, ring: "D" }
  if (r <= RADII.outerBull) return { segment: 25, ring: "S" }

  // Angle clockwise from vertical; each segment spans 18°, 20 centred on 0°.
  const degrees = (Math.atan2(x, y) * 180) / Math.PI
  const index = Math.round(degrees / 18)
  const segment = SEGMENT_ORDER[((index % 20) + 20) % 20]

  if (r <= RADII.trebleInner) return { segment, ring: "S" }
  if (r <= RADII.trebleOuter) return { segment, ring: "T" }
  if (r <= RADII.doubleInner) return { segment, ring: "S" }
  return { segment, ring: "D" }
}

/** The aim point for a target: the segment's angle at the radial midpoint of its ring. */
export function centreOf(segment: Segment): { x: number; y: number } {
  if (segment.ring === "MISS") return { x: 0, y: RADII.doubleOuter + 30 }
  if (segment.segment === 25) {
    // Bull: aim dead centre. Outer bull: the ring's radial midpoint, straight up.
    if (segment.ring === "D") return { x: 0, y: 0 }
    return { x: 0, y: (RADII.bull + RADII.outerBull) / 2 }
  }
  const index = SEGMENT_ORDER.indexOf(segment.segment as (typeof SEGMENT_ORDER)[number])
  const radians = (index * 18 * Math.PI) / 180
  const radius =
    segment.ring === "T"
      ? (RADII.trebleInner + RADII.trebleOuter) / 2
      : segment.ring === "D"
        ? (RADII.doubleInner + RADII.doubleOuter) / 2
        : // The fat single between treble and double is the bigger bed.
          (RADII.trebleOuter + RADII.doubleInner) / 2
  return { x: radius * Math.sin(radians), y: radius * Math.cos(radians) }
}
