import { describe, expect, test } from "vitest"
import { chooseTarget, playVisit } from "@/lib/bot"
import { CALIBRATED_SIGMAS } from "@/lib/bot/calibration"
import { applyDartToScore } from "@/lib/scoring"
import { makeRng } from "@/lib/utils/rng"
import type { BotProfile } from "@/lib/types"

const PROFILES: Array<BotProfile & { checkoutBand: [number, number] }> = [
  { id: "pub", name: "Pub player", targetAverage: 45, description: "", checkoutBand: [8, 12], ...CALIBRATED_SIGMAS["pub"] },
  { id: "county", name: "County", targetAverage: 75, description: "", checkoutBand: [25, 30], ...CALIBRATED_SIGMAS["county"] },
  { id: "tour-card", name: "Tour card", targetAverage: 95, description: "", checkoutBand: [38, 45], ...CALIBRATED_SIGMAS["tour-card"] },
  { id: "elite", name: "Elite", targetAverage: 105, description: "", checkoutBand: [45, 50], ...CALIBRATED_SIGMAS["elite"] },
]

function simulate(profile: BotProfile, legs: number, seed: number) {
  const rng = makeRng(seed)
  let totalDarts = 0
  let attempts = 0
  let won = 0
  let visits = 0
  let count180 = 0
  let busts = 0
  for (let leg = 0; leg < legs; leg++) {
    let score = 501
    let safety = 0
    while (score > 0 && safety++ < 400) {
      const visitStart = score
      const visit = playVisit(score, profile, rng)
      visits++
      let visitScored = 0
      for (const t of visit) {
        totalDarts++
        if (t.target.ring === "D") attempts++
        const { next, bust, won: legWon } = applyDartToScore(score, t.landed)
        if (bust) {
          score = visitStart
          busts++
          visitScored = 0
          break
        }
        visitScored += score - next
        score = next
        if (legWon) {
          won++
          break
        }
      }
      if (visitScored === 180) count180++
    }
  }
  return {
    average: (501 * won * 3) / totalDarts,
    checkoutPct: attempts > 0 ? (won / attempts) * 100 : 0,
    oneEightyPerVisit: count180 / visits,
    busts,
  }
}

describe("bot calibration holds over 10,000 legs", () => {
  for (const profile of PROFILES) {
    test(`${profile.name}: average within 0.5 of ${profile.targetAverage} and checkout in band`, () => {
      const { average, checkoutPct } = simulate(profile, 10_000, 0xcafe)
      expect(Math.abs(average - profile.targetAverage)).toBeLessThanOrEqual(0.5)
      expect(checkoutPct).toBeGreaterThanOrEqual(profile.checkoutBand[0])
      expect(checkoutPct).toBeLessThanOrEqual(profile.checkoutBand[1])
    }, 120_000)
  }

  test("the elite profile's 180 rate is high but not absurd", () => {
    // Spec 0006 guessed one visit in 15-25. The pure Gaussian model cannot
    // sustain a 105 average without slightly more trebles than that: it
    // measures ~1 in 11.5. Documented as a model deviation in the spec.
    const elite = PROFILES[3]
    const { oneEightyPerVisit } = simulate(elite, 5_000, 0xfeed)
    expect(oneEightyPerVisit).toBeGreaterThan(1 / 25)
    expect(oneEightyPerVisit).toBeLessThan(1 / 8)
  }, 120_000)

  test("the bot busts and recovers from busts via the shared rules", () => {
    const pub = PROFILES[0]
    const { busts } = simulate(pub, 500, 0xb057)
    expect(busts).toBeGreaterThan(0)
  }, 60_000)
})

describe("chooseTarget strategy", () => {
  const county = PROFILES[1]

  test("takes the first segment of the checkout route when one exists", () => {
    expect(chooseTarget(40, 3, county)).toEqual({ segment: 20, ring: "D" })
    expect(chooseTarget(96, 3, county)).toEqual({ segment: 20, ring: "T" })
    expect(chooseTarget(170, 3, county)).toEqual({ segment: 20, ring: "T" })
  })

  test("aims T20 above 170", () => {
    expect(chooseTarget(300, 3, county)).toEqual({ segment: 20, ring: "T" })
  })

  test("with no route, aims to leave an even number of 40 or less", () => {
    // 43 with one dart: no one-dart finish; aim a single leaving <= 40 even
    const t = chooseTarget(43, 1, county)
    expect(t.ring).toBe("S")
    const leave = 43 - t.segment
    expect(leave % 2).toBe(0)
    expect(leave).toBeLessThanOrEqual(40)
  })

  test("darts carry their target so the heatmap gets exact data", () => {
    const rng = makeRng(42)
    const visit = playVisit(40, county, rng)
    expect(visit[0].target).toEqual({ segment: 20, ring: "D" })
  })
})
