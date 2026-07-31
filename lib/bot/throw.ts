import type { Segment } from "@/lib/types"
import type { Rng } from "@/lib/utils/rng"
import { centreOf, segmentAt } from "./board-geometry"

/** Sample a standard normal via Box-Muller from the injected rng. */
function gaussian(rng: Rng): number {
  let u = 0
  while (u === 0) u = rng()
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * The whole throw model: a 2D Gaussian centred on the aim point with
 * standard deviation sigmaMm in both axes, resolved back to a segment.
 * Aiming at T20 with realistic scatter misses into 5 and 1 for free,
 * because that is where those beds physically are.
 */
export function simulateThrow(target: Segment, sigmaMm: number, rng: Rng): Segment {
  const centre = centreOf(target)
  const x = centre.x + gaussian(rng) * sigmaMm
  const y = centre.y + gaussian(rng) * sigmaMm
  return segmentAt(x, y)
}
