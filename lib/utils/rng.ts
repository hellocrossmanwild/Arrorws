/**
 * Injected pseudo-random generation. The pure engines never call
 * Math.random — randomness always arrives as an Rng so behaviour is
 * reproducible in tests (CLAUDE.md, the three pure engines).
 */
export type Rng = () => number

/** mulberry32: small, fast, seedable. Good enough for throw scatter and drill targets. */
export function makeRng(s: number): Rng {
  let seed = s >>> 0
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
