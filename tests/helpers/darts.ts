import type { Dart, Ring, Segment } from "@/lib/types"
import { scoreOf } from "@/lib/scoring"

let counter = 0

/** Build a Dart record from a segment, for tests and generators. */
export function dart(seg: Segment, overrides: Partial<Dart> = {}): Dart {
  counter += 1
  return {
    id: `test-dart-${counter}`,
    visitId: "test-visit",
    index: 0,
    segment: seg.segment,
    ring: seg.ring,
    score: scoreOf(seg),
    targetSegment: null,
    targetRing: null,
    thrownAt: "2026-07-01T18:00:00.000Z",
    latencyMs: null,
    ...overrides,
  }
}

/** Parse "T20", "D16", "20", "25", "BULL", "MISS" into a Segment. */
export function seg(label: string): Segment {
  if (label === "MISS") return { segment: 0, ring: "MISS" }
  if (label === "BULL") return { segment: 25, ring: "D" }
  if (label === "25") return { segment: 25, ring: "S" }
  const m = label.match(/^([SDT])?(\d+)$/)
  if (!m) throw new Error(`Bad segment label: ${label}`)
  const ring: Ring = (m[1] as Ring) ?? "S"
  return { segment: Number(m[2]), ring }
}

/** Parse a space-separated label string into darts: "T20 T20 BULL". */
export function throwDarts(labels: string): Dart[] {
  return labels
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((l) => dart(seg(l)))
}

/** Deterministic PRNG for property tests (mulberry32). */
export function makeRng(s: number): () => number {
  let seed = s >>> 0
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
