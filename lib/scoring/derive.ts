import type { Dart, GameState, PlayerState, VisitSummary } from "@/lib/types"
import { applyDartToScore } from "./segments"

export interface DeriveConfig {
  startingScore: number
  legsToWin: number
  /** Ordered participant player ids. The first throws first in leg 0; the start alternates each leg. */
  players: string[]
}

interface FoldPlayer {
  playerId: string
  score: number
  dartsThrownLeg: number
  dartsThrownTotal: number
  totalScored: number
  visits: number
  legsWon: number
}

/**
 * The heart of the product: a pure fold over the ordered dart log.
 * No I/O, no clock, no randomness. See ADR 0003 — every score is derived,
 * never stored. Legs are implicit in the log: a dart thrown after a
 * completed leg starts the next one.
 */
export function deriveGameState(darts: Dart[], config: DeriveConfig): GameState {
  const n = config.players.length
  const players: FoldPlayer[] = config.players.map((playerId) => ({
    playerId,
    score: config.startingScore,
    dartsThrownLeg: 0,
    dartsThrownTotal: 0,
    totalScored: 0,
    visits: 0,
    legsWon: 0,
  }))

  let legIndex = 0
  let currentIdx = 0 // index into config.players
  let currentVisit: Dart[] = []
  let visitStartScore = config.startingScore
  let lastVisit: VisitSummary | null = null
  let legComplete = false
  let winnerPlayerId: string | null = null
  let gameComplete = false

  const startLeg = (index: number) => {
    legIndex = index
    for (const p of players) {
      p.score = config.startingScore
      p.dartsThrownLeg = 0
    }
    currentIdx = index % n
    currentVisit = []
    visitStartScore = config.startingScore
    legComplete = false
    winnerPlayerId = null
  }

  const endVisit = (summary: VisitSummary) => {
    lastVisit = summary
    players[currentIdx].visits += 1
    currentIdx = (currentIdx + 1) % n
    currentVisit = []
    visitStartScore = players[currentIdx].score
  }

  for (const dart of darts) {
    if (gameComplete) break
    if (legComplete) startLeg(legIndex + 1)

    const p = players[currentIdx]
    currentVisit.push(dart)
    p.dartsThrownLeg += 1
    p.dartsThrownTotal += 1

    const { next, bust, won } = applyDartToScore(p.score, {
      segment: dart.segment,
      ring: dart.ring,
    })

    if (bust) {
      // Restore to the start of the visit; the visit scored nothing. A busted dart is still a dart.
      p.score = visitStartScore
      endVisit({ playerId: p.playerId, scored: 0, bust: true, darts: currentVisit })
      continue
    }

    p.score = next

    if (won) {
      p.totalScored += visitStartScore
      p.visits += 1
      p.legsWon += 1
      lastVisit = { playerId: p.playerId, scored: visitStartScore, bust: false, darts: currentVisit }
      legComplete = true
      winnerPlayerId = p.playerId
      if (p.legsWon >= config.legsToWin) gameComplete = true
      continue
    }

    if (currentVisit.length === 3) {
      const scored = visitStartScore - p.score
      p.totalScored += scored
      endVisit({ playerId: p.playerId, scored, bust: false, darts: currentVisit })
    }
  }

  const playerStates: PlayerState[] = players.map((p) => ({
    playerId: p.playerId,
    score: p.score,
    dartsThrown: p.dartsThrownLeg,
    dartsThrownTotal: p.dartsThrownTotal,
    totalScored: p.totalScored,
    visits: p.visits,
    legsWon: p.legsWon,
    threeDartAverage: p.dartsThrownTotal > 0 ? (p.totalScored / p.dartsThrownTotal) * 3 : 0,
  }))

  return {
    players: playerStates,
    currentPlayerId: config.players[currentIdx],
    currentVisit,
    visitStartScore,
    lastVisit,
    legIndex,
    legComplete,
    winnerPlayerId,
    gameComplete,
  }
}
