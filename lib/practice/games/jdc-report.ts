import type { Dart } from "@/lib/types"
import {
  JDC_GRADES,
  PART1,
  PART2_TARGETS,
  PART3,
  gradeForJdcScore,
  jdcChallenge,
} from "./jdc-challenge"

/**
 * The per-attempt breakdown of a JDC Challenge, derived by replaying the
 * dart log through the engine (ADR 0003). Nothing here is stored: fix the
 * engine and every past attempt re-scores itself.
 *
 * Pure — darts in, report out. No clock, no randomness, no I/O.
 */

/** Dart index at which each part starts, and the dart count of each. */
export const PART_DARTS = [PART1.length * 3, PART2_TARGETS.length, PART3.length * 3] as const
export const TOTAL_DARTS = PART_DARTS[0] + PART_DARTS[1] + PART_DARTS[2] // 57
const PART2_START = PART_DARTS[0]
const PART3_START = PART_DARTS[0] + PART_DARTS[1]

export const PART_NAMES = [
  `Shanghai ${PART1[0]}-${PART1[PART1.length - 1]}`,
  "Doubles",
  `Shanghai ${PART3[0]}-${PART3[PART3.length - 1]}`,
] as const

/** The most a part can yield: a shanghai on every number, every double hit. */
export const PART_MAXIMUMS: [number, number, number] = [
  PART1.reduce((sum, n) => sum + n * 6 + 100, 0),
  (PART2_TARGETS.length - 1) * 50 + 100,
  PART3.reduce((sum, n) => sum + n * 6 + 100, 0),
]

export interface JdcDoubleResult {
  /** 1-20, or 25 for the bull. */
  target: number
  hit: boolean
  /** False while the attempt has not reached this dart yet. */
  thrown: boolean
}

export interface JdcRound {
  /** The number being thrown at (10-15 in part 1, 15-20 in part 3). */
  number: number
  part: 0 | 2
  points: number
  shanghai: boolean
  complete: boolean
}

export interface JdcReport {
  score: number
  grade: string
  complete: boolean
  dartsThrown: number
  /** Points banked in each of the three parts. */
  parts: [number, number, number]
  rounds: JdcRound[]
  doubles: JdcDoubleResult[]
  shanghais: number
  /** Doubles hit in part 2, the bull included. Out of 21. */
  doublesHit: number
  /** Running total after each dart. Index i is the score after i+1 darts. */
  cumulative: number[]
}

/**
 * Replay a JDC attempt. Accepts a partial log — an abandoned or in-flight
 * attempt reports what has been thrown so far, with `complete` false.
 */
export function jdcReport(darts: Dart[]): JdcReport {
  const thrown = darts.slice(0, TOTAL_DARTS)

  // The score comes from the engine, one dart at a time, so the report can
  // never disagree with what the player watched on the board.
  let state = jdcChallenge.initial({}, () => 0)
  const cumulative: number[] = []
  for (const dart of thrown) {
    state = jdcChallenge.onDart(state, dart)
    cumulative.push(state.score)
  }

  const at = (i: number) => (i <= 0 ? 0 : (cumulative[Math.min(i, cumulative.length) - 1] ?? 0))
  const parts: [number, number, number] = [
    at(PART2_START),
    at(PART3_START) - at(PART2_START),
    at(TOTAL_DARTS) - at(PART3_START),
  ]

  const rounds = roundsOf(thrown)
  const doubles = doublesOf(thrown)
  return {
    score: state.score,
    grade: gradeForJdcScore(state.score),
    complete: thrown.length >= TOTAL_DARTS,
    dartsThrown: thrown.length,
    parts,
    rounds,
    doubles,
    shanghais: rounds.filter((r) => r.shanghai).length,
    doublesHit: doubles.filter((d) => d.hit).length,
    cumulative,
  }
}

/** The twelve shanghai rounds of parts 1 and 3, in order. */
function roundsOf(darts: Dart[]): JdcRound[] {
  const rounds: JdcRound[] = []
  const walk = (numbers: number[], offset: number, part: 0 | 2) => {
    numbers.forEach((number, i) => {
      const visit = darts.slice(offset + i * 3, offset + i * 3 + 3)
      const hits = visit.filter((d) => d.segment === number && d.ring !== "MISS")
      const rings = new Set(hits.map((d) => d.ring))
      const shanghai = rings.has("S") && rings.has("D") && rings.has("T")
      const points = hits.reduce((sum, d) => sum + d.score, 0)
      rounds.push({
        number,
        part,
        points: points + (shanghai ? 100 : 0),
        shanghai,
        complete: visit.length === 3,
      })
    })
  }
  walk(PART1, 0, 0)
  walk(PART3, PART3_START, 2)
  return rounds
}

/** Part 2, target by target — the row that feeds the doubles strip. */
function doublesOf(darts: Dart[]): JdcDoubleResult[] {
  return PART2_TARGETS.map((target, i) => {
    const segment = target.type === "segment" ? target.segment : 0
    const dart = darts[PART2_START + i]
    return {
      target: segment,
      hit: Boolean(dart && dart.ring === "D" && dart.segment === segment),
      thrown: Boolean(dart),
    }
  })
}

/** The belt above `score`, and how far away it is. Null once on Black. */
export function nextGrade(score: number): { name: string; pointsAway: number } | null {
  const next = JDC_GRADES.find((g) => score < g.min)
  return next ? { name: next.name, pointsAway: next.min - score } : null
}
