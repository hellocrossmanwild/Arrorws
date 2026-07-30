export type Ring = "S" | "D" | "T" | "MISS"

/** A board segment: what a dart can hit, or be aimed at. */
export interface Segment {
  segment: number // 1-20, 25 for the bull area, 0 for a miss
  ring: Ring
}

export interface Dart {
  id: string
  visitId: string
  index: 0 | 1 | 2
  segment: number // 1-20, 25 for the bull area, 0 for a miss
  ring: Ring
  score: number // must equal segment * multiplier(ring)
  targetSegment: number | null
  targetRing: Ring | null
  thrownAt: string // ISO 8601
  latencyMs: number | null
}

/** The input shape for recording a dart. Everything else is derived or assigned server-side. */
export interface DartInput {
  segment: number
  ring: Ring
  targetSegment: number | null
  targetRing: Ring | null
  latencyMs: number | null
}
