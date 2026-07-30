import type { Segment } from "@/lib/types"
import { BULL, OUTER_BULL, scoreOf } from "./segments"

/**
 * Finishing doubles in the order a player actually wants them (spec 0003).
 * This is a product decision, not an implementation detail.
 */
const FINISHING_DOUBLES: Segment[] = [
  ...[20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 1].map((n) => ({ segment: n, ring: "D" as const })),
  ...[3, 5, 7, 9, 11, 13, 15, 17, 19].map((n) => ({ segment: n, ring: "D" as const })),
  BULL,
]

/** Setup darts: trebles T20 down to T1, then bull, then singles 20 down to 1, then outer bull. */
const SETUP_DARTS: Segment[] = [
  ...Array.from({ length: 20 }, (_, i) => ({ segment: 20 - i, ring: "T" as const })),
  BULL,
  ...Array.from({ length: 20 }, (_, i) => ({ segment: 20 - i, ring: "S" as const })),
  OUTER_BULL,
]

/** Find `count` setup darts summing exactly to `value`, preferring the fixed setup order. */
function setupCombo(value: number, count: number): Segment[] | null {
  if (count === 0) return value === 0 ? [] : null
  for (const s of SETUP_DARTS) {
    const v = scoreOf(s)
    if (v > value - (count - 1) * 1) continue // each remaining dart scores at least 1
    if (count === 1) {
      if (v === value) return [s]
      continue
    }
    const rest = setupCombo(value - v, count - 1)
    if (rest) return [s, ...rest]
  }
  return null
}

/** Find a route of exactly `length` darts ending on a double. */
function routeOfLength(score: number, length: number): Segment[] | null {
  for (const d of FINISHING_DOUBLES) {
    const remainder = score - scoreOf(d)
    if (length === 1) {
      if (remainder === 0) return [d]
      continue
    }
    if (remainder < length - 1) continue
    const setup = setupCombo(remainder, length - 1)
    if (setup) return [...setup, d]
  }
  return null
}

const memo = new Map<string, Segment[] | null>()

/**
 * A route that finishes exactly, ending on a double, or null if there is none.
 * Shorter routes are preferred, and within a length the fixed preference
 * orders make the result deterministic and the route a player would take:
 * 96 is T20 D18, 60 is 20 D20, 170 is T20 T20 BULL.
 */
export function findCheckout(score: number, dartsRemaining: 1 | 2 | 3): Segment[] | null {
  if (score < 2 || score > 170) return null
  const key = `${score}:${dartsRemaining}`
  const cached = memo.get(key)
  if (cached !== undefined) return cached
  let route: Segment[] | null = null
  for (let length = 1; length <= dartsRemaining; length++) {
    route = routeOfLength(score, length)
    if (route) break
  }
  memo.set(key, route)
  return route
}
