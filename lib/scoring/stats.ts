import type { Dart, Metrics } from "@/lib/types"
import type { DeriveConfig } from "./derive"
import { annotateGame } from "./annotate"

/**
 * Every metric is derived from the dart log — nothing here reads a stored
 * counter. See ADR 0003.
 *
 * Checkout attempt detection: exact where darts carry a targetRing
 * (practice games, bot throws), inferred from score context otherwise.
 * `checkoutPctIsInferred` says which the caller got.
 */
export function computeStats(darts: Dart[], playerId: string, config: DeriveConfig): Metrics {
  const legs = annotateGame(darts, config)

  let totalScored = 0
  let dartsThrown = 0
  let firstNineScored = 0
  let firstNineDarts = 0
  let checkoutAttempts = 0
  let checkoutHits = 0
  let anyInferredAttempt = false
  let doublesAttempted = 0
  let doublesHit = 0
  const doublesBySegment: Record<string, { attempts: number; hits: number }> = {}
  let count180 = 0
  let count140plus = 0
  let count100plus = 0
  let bestVisit = 0
  let bestLegInDarts: number | null = null
  let bestCheckout: number | null = null

  for (const leg of legs) {
    let legDartCount = 0
    for (const visit of leg.visits) {
      if (visit.playerId !== playerId) continue

      totalScored += visit.scored
      dartsThrown += visit.darts.length

      for (const ad of visit.darts) {
        legDartCount += 1
        if (legDartCount <= 9) {
          firstNineDarts += 1
          if (!visit.bust) firstNineScored += ad.dart.score
        }
        if (ad.checkoutAttempt) {
          checkoutAttempts += 1
          if (ad.attemptHit) checkoutHits += 1
          if (ad.attemptInferred) anyInferredAttempt = true
          if (ad.attemptDouble !== null) {
            const key = String(ad.attemptDouble)
            doublesBySegment[key] ??= { attempts: 0, hits: 0 }
            doublesBySegment[key].attempts += 1
            if (ad.attemptHit) doublesBySegment[key].hits += 1
          }
          doublesAttempted += 1
          if (ad.attemptHit) doublesHit += 1
        }
      }

      if (!visit.bust) {
        // 180s are counted per visit, not per dart.
        if (visit.scored === 180) count180 += 1
        else if (visit.scored >= 140) count140plus += 1
        else if (visit.scored >= 100) count100plus += 1
        if (visit.scored > bestVisit) bestVisit = visit.scored
      }
      if (visit.checkout) {
        if (bestCheckout === null || visit.scoreBefore > bestCheckout) {
          bestCheckout = visit.scoreBefore
        }
      }
    }
    if (leg.winnerPlayerId === playerId && leg.winnerDarts !== null) {
      if (bestLegInDarts === null || leg.winnerDarts < bestLegInDarts) {
        bestLegInDarts = leg.winnerDarts
      }
    }
  }

  return {
    threeDartAverage: dartsThrown > 0 ? (totalScored / dartsThrown) * 3 : 0,
    firstNineAverage: firstNineDarts > 0 ? (firstNineScored / firstNineDarts) * 3 : 0,
    dartsThrown,
    checkoutPct: checkoutAttempts > 0 ? (checkoutHits / checkoutAttempts) * 100 : null,
    checkoutPctIsInferred: anyInferredAttempt,
    doublesAttempted,
    doublesHit,
    doublesBySegment,
    count180,
    count140plus,
    count100plus,
    bestVisit,
    bestLegInDarts,
    bestCheckout,
  }
}
