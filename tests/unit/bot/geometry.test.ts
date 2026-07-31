import { describe, expect, test } from "vitest"
import { centreOf, segmentAt, SEGMENT_ORDER, simulateThrow } from "@/lib/bot"
import { SEGMENTS } from "@/lib/scoring"
import { makeRng } from "@/lib/utils/rng"

describe("board geometry", () => {
  test("segmentAt(0, 105) is treble 20 and segmentAt(0, 166) is double 20", () => {
    expect(segmentAt(0, 105)).toEqual({ segment: 20, ring: "T" })
    expect(segmentAt(0, 166)).toEqual({ segment: 20, ring: "D" })
  })

  test("the centre of every scoring region resolves back to itself", () => {
    for (const seg of SEGMENTS) {
      if (seg.ring === "MISS") continue
      const { x, y } = centreOf(seg)
      expect(segmentAt(x, y), `centre of ${seg.ring}${seg.segment}`).toEqual(seg)
    }
  })

  test("beyond 170mm is a miss", () => {
    expect(segmentAt(0, 171)).toEqual({ segment: 0, ring: "MISS" })
    expect(segmentAt(200, 0)).toEqual({ segment: 0, ring: "MISS" })
  })

  test("bull and outer bull radii", () => {
    expect(segmentAt(0, 3)).toEqual({ segment: 25, ring: "D" })
    expect(segmentAt(0, 10)).toEqual({ segment: 25, ring: "S" })
  })

  test("walking the perimeter in one-degree steps yields the board order", () => {
    // At a single-ring radius, sweep 360°: the sequence of segments must
    // follow SEGMENT_ORDER with 20 centred on vertical. Catches the
    // half-a-bed-out rotation bug immediately (spec 0006 note 1).
    const r = 130
    const seen: number[] = []
    for (let deg = -8; deg < 352; deg += 1) {
      const rad = (deg * Math.PI) / 180
      const seg = segmentAt(r * Math.sin(rad), r * Math.cos(rad))
      if (seen[seen.length - 1] !== seg.segment) seen.push(seg.segment)
    }
    expect(seen.slice(0, 20)).toEqual([...SEGMENT_ORDER])
  })

  test("neighbour check: 20 sits between 5 and 1", () => {
    // 10 degrees either side of vertical at single radius
    const r = 130
    const left = segmentAt(r * Math.sin((-10 * Math.PI) / 180), r * Math.cos((-10 * Math.PI) / 180))
    const right = segmentAt(r * Math.sin((10 * Math.PI) / 180), r * Math.cos((10 * Math.PI) / 180))
    expect(left.segment).toBe(5)
    expect(right.segment).toBe(1)
  })
})

describe("simulateThrow", () => {
  test("deterministic given a fixed rng seed", () => {
    const a = simulateThrow({ segment: 20, ring: "T" }, 15, makeRng(123))
    const b = simulateThrow({ segment: 20, ring: "T" }, 15, makeRng(123))
    expect(a).toEqual(b)
  })

  test("aiming at T20 with mid-range sigma misses predominantly into 5 and 1", () => {
    const rng = makeRng(77)
    const neighbours: Record<number, number> = {}
    for (let i = 0; i < 20_000; i++) {
      const landed = simulateThrow({ segment: 20, ring: "T" }, 18, rng)
      if (landed.segment !== 20 && landed.segment !== 0) {
        neighbours[landed.segment] = (neighbours[landed.segment] ?? 0) + 1
      }
    }
    const into5and1 = (neighbours[5] ?? 0) + (neighbours[1] ?? 0)
    const elsewhere = Object.entries(neighbours)
      .filter(([k]) => k !== "5" && k !== "1")
      .reduce((sum, [, v]) => sum + v, 0)
    expect(into5and1).toBeGreaterThan(elsewhere)
  })
})
