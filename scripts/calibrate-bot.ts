/**
 * Bot sigma calibration (spec 0006). For each profile:
 *   1. Calibrate doubleSigmaMm so the per-attempt double hit rate lands in
 *      the profile's expected checkout band.
 *   2. Binary search scoringSigmaMm until the measured three-dart average
 *      over simulated legs is within 0.5 of targetAverage.
 *   3. Verify over 10,000 legs and print the values to commit.
 *
 * Run with: pnpm bot:calibrate
 * Commit the output into lib/bot/calibration.ts, then regenerate the seed.
 */
import { playVisit } from "../lib/bot"
import { applyDartToScore, scoreOf } from "../lib/scoring"
import { simulateThrow } from "../lib/bot"
import { makeRng, type Rng } from "../lib/utils/rng"
import type { BotProfile } from "../lib/types"

interface Target {
  id: string
  name: string
  targetAverage: number
  checkoutBand: [number, number]
}

const TARGETS: Target[] = [
  { id: "pub", name: "Pub player", targetAverage: 45, checkoutBand: [8, 12] },
  { id: "county", name: "County", targetAverage: 75, checkoutBand: [25, 30] },
  { id: "tour-card", name: "Tour card", targetAverage: 95, checkoutBand: [38, 45] },
  { id: "elite", name: "Elite", targetAverage: 105, checkoutBand: [45, 50] },
]

function measureDoubleHitRate(sigma: number, rng: Rng, throws: number): number {
  let hits = 0
  for (let i = 0; i < throws; i++) {
    const landed = simulateThrow({ segment: 16, ring: "D" }, sigma, rng)
    if (landed.ring === "D" && landed.segment === 16) hits++
  }
  return (hits / throws) * 100
}

function calibrateDoubleSigma(bandMid: number, rng: Rng): number {
  let lo = 1
  let hi = 80
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const rate = measureDoubleHitRate(mid, rng, 40_000)
    if (rate > bandMid) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function simulateLegs(
  profile: BotProfile,
  legs: number,
  rng: Rng
): { average: number; checkoutPct: number } {
  let totalDarts = 0
  let attempts = 0
  let won = 0
  for (let leg = 0; leg < legs; leg++) {
    let score = 501
    let safety = 0
    while (score > 0 && safety++ < 400) {
      const visitStart = score
      const visit = playVisit(score, profile, rng)
      for (const t of visit) {
        totalDarts++
        if (t.target.ring === "D") attempts++
        const { next, bust, won: legWon } = applyDartToScore(score, t.landed)
        if (bust) {
          score = visitStart
          break
        }
        score = next
        if (legWon) {
          won++
          break
        }
      }
      void scoreOf
    }
  }
  return {
    average: (501 * won * 3) / totalDarts,
    checkoutPct: attempts > 0 ? (won / attempts) * 100 : 0,
  }
}

function calibrateScoringSigma(profile: BotProfile, rng: Rng): number {
  let lo = 1
  let hi = 90
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2
    const { average } = simulateLegs({ ...profile, scoringSigmaMm: mid }, 1500, rng)
    if (average > profile.targetAverage) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

const results: Array<{
  id: string
  scoringSigmaMm: number
  doubleSigmaMm: number
  measuredAverage: number
  measuredCheckoutPct: number
}> = []

for (const t of TARGETS) {
  const rng = makeRng(0xd00b1e5 + t.targetAverage)
  const bandMid = (t.checkoutBand[0] + t.checkoutBand[1]) / 2
  const doubleSigma = calibrateDoubleSigma(bandMid, rng)
  const profile: BotProfile = {
    id: t.id,
    name: t.name,
    targetAverage: t.targetAverage,
    scoringSigmaMm: null,
    doubleSigmaMm: doubleSigma,
    description: "",
  }
  const scoringSigma = calibrateScoringSigma(profile, rng)
  const final = simulateLegs(
    { ...profile, scoringSigmaMm: scoringSigma, doubleSigmaMm: doubleSigma },
    10_000,
    rng
  )
  results.push({
    id: t.id,
    scoringSigmaMm: Math.round(scoringSigma * 100) / 100,
    doubleSigmaMm: Math.round(doubleSigma * 100) / 100,
    measuredAverage: Math.round(final.average * 100) / 100,
    measuredCheckoutPct: Math.round(final.checkoutPct * 100) / 100,
  })
  console.log(
    `${t.name.padEnd(12)} scoringSigma=${scoringSigma.toFixed(2)}mm doubleSigma=${doubleSigma.toFixed(2)}mm ` +
      `-> avg ${final.average.toFixed(2)} (target ${t.targetAverage}), checkout ${final.checkoutPct.toFixed(1)}% (band ${t.checkoutBand[0]}-${t.checkoutBand[1]})`
  )
}

console.log("\n// lib/bot/calibration.ts content:\n")
console.log(JSON.stringify(results, null, 2))
