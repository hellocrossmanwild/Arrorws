import type { Dart } from "@/lib/types"
import type { DeriveConfig } from "./derive"
import { applyDartToScore } from "./segments"

export interface AnnotatedDart {
  dart: Dart
  playerId: string
  legIndex: number
  scoreBefore: number
  scoreAfter: number
  bust: boolean
  won: boolean
  /** This dart was thrown at a double while a one-dart finish existed (explicit target or inferred). */
  checkoutAttempt: boolean
  /** True when the attempt was inferred from score context rather than a recorded target. */
  attemptInferred: boolean
  /** The double under attempt: 1-20, or 25 for bull. Null when unknowable. */
  attemptDouble: number | null
  /** The attempt hit its double. */
  attemptHit: boolean
}

export interface AnnotatedVisit {
  playerId: string
  legIndex: number
  /** Zero based within the leg, per player. */
  visitIndex: number
  darts: AnnotatedDart[]
  scoreBefore: number
  scoreAfter: number
  scored: number
  bust: boolean
  checkout: boolean
}

export interface AnnotatedLeg {
  index: number
  startingPlayerId: string
  winnerPlayerId: string | null
  /** Darts thrown by the winner in this leg, when won. */
  winnerDarts: number | null
  /** The score the winner checked out from. */
  checkoutScore: number | null
  visits: AnnotatedVisit[]
}

/** True when `score` can be finished with a single dart (even 2-40, or 50). */
export function isOneDartFinish(score: number): boolean {
  return score === 50 || (score >= 2 && score <= 40 && score % 2 === 0)
}

/**
 * Replay a game's dart log into annotated visits and legs. Pure. This is
 * the one replay used by stats, the history view and the results cache —
 * ADR 0003 is what makes it a straight render of the log.
 */
export function annotateGame(darts: Dart[], config: DeriveConfig): AnnotatedLeg[] {
  const n = config.players.length
  const legs: AnnotatedLeg[] = []

  let scores: Record<string, number> = {}
  let dartsThisLeg: Record<string, number> = {}
  let visitCounts: Record<string, number> = {}
  let legIndex = -1
  let currentIdx = 0
  let visitDarts: AnnotatedDart[] = []
  let visitStartScore = config.startingScore
  let legDone = true
  const currentLeg = () => legs[legs.length - 1]

  const startLeg = () => {
    legIndex += 1
    scores = Object.fromEntries(config.players.map((p) => [p, config.startingScore]))
    dartsThisLeg = Object.fromEntries(config.players.map((p) => [p, 0]))
    visitCounts = Object.fromEntries(config.players.map((p) => [p, 0]))
    currentIdx = legIndex % n
    visitDarts = []
    visitStartScore = config.startingScore
    legs.push({
      index: legIndex,
      startingPlayerId: config.players[currentIdx],
      winnerPlayerId: null,
      winnerDarts: null,
      checkoutScore: null,
      visits: [],
    })
    legDone = false
  }

  const closeVisit = (playerId: string, bust: boolean, checkout: boolean) => {
    const scoreAfter = scores[playerId]
    currentLeg().visits.push({
      playerId,
      legIndex,
      visitIndex: visitCounts[playerId],
      darts: visitDarts,
      scoreBefore: visitStartScore,
      scoreAfter,
      scored: bust ? 0 : visitStartScore - scoreAfter,
      bust,
      checkout,
    })
    visitCounts[playerId] += 1
    visitDarts = []
    if (!checkout) {
      currentIdx = (currentIdx + 1) % n
      visitStartScore = scores[config.players[currentIdx]]
    }
  }

  for (const dart of darts) {
    if (legDone) startLeg()
    const playerId = config.players[currentIdx]
    const scoreBefore = scores[playerId]
    const { next, bust, won } = applyDartToScore(scoreBefore, {
      segment: dart.segment,
      ring: dart.ring,
    })
    // A bust reverts the whole visit immediately.
    scores[playerId] = bust ? visitStartScore : next
    dartsThisLeg[playerId] += 1

    const explicitAttempt = dart.targetRing === "D"
    const inferredAttempt = dart.targetRing === null && isOneDartFinish(scoreBefore)
    const checkoutAttempt = explicitAttempt || inferredAttempt
    const attemptDouble = explicitAttempt
      ? dart.targetSegment
      : inferredAttempt
        ? scoreBefore === 50
          ? 25
          : scoreBefore / 2
        : null
    const attemptHit = explicitAttempt
      ? dart.ring === "D" && dart.segment === dart.targetSegment
      : inferredAttempt
        ? won
        : false

    visitDarts.push({
      dart,
      playerId,
      legIndex,
      scoreBefore,
      scoreAfter: scores[playerId],
      bust,
      won,
      checkoutAttempt,
      attemptInferred: inferredAttempt,
      attemptDouble,
      attemptHit,
    })

    if (bust) {
      closeVisit(playerId, true, false)
      continue
    }
    if (won) {
      const leg = currentLeg()
      leg.winnerPlayerId = playerId
      leg.winnerDarts = dartsThisLeg[playerId]
      leg.checkoutScore = visitStartScore
      closeVisit(playerId, false, true)
      legDone = true
      continue
    }
    if (visitDarts.length === 3) {
      closeVisit(playerId, false, false)
    }
  }

  // An in-progress visit still renders in history.
  if (!legDone && visitDarts.length > 0 && legs.length > 0) {
    const playerId = config.players[currentIdx]
    closeVisit(playerId, false, false)
    // closeVisit advanced the thrower; that is fine for an unfinished tail.
  }

  return legs
}
