import type { Dart, Ring } from "./dart"

/** Derived per-player state within a game. Never stored — always replayed from the dart log. */
export interface PlayerState {
  playerId: string
  score: number
  /** Darts thrown in the current leg. */
  dartsThrown: number
  /** Darts thrown across the whole game, busts included. */
  dartsThrownTotal: number
  /** Total scored across the game (busted visits contribute zero). */
  totalScored: number
  visits: number
  legsWon: number
  threeDartAverage: number
}

export interface VisitSummary {
  playerId: string
  scored: number
  bust: boolean
  darts: Dart[]
}

export interface GameState {
  players: PlayerState[]
  currentPlayerId: string
  /** 0 to 2 darts already thrown this visit. */
  currentVisit: Dart[]
  /** What the score reverts to on a bust. */
  visitStartScore: number
  lastVisit: VisitSummary | null
  legIndex: number
  legComplete: boolean
  winnerPlayerId: string | null
  gameComplete: boolean
  /** Populated only for practice modes (spec 0005). */
  practice?: PracticeState
}

/** Live state of a practice game, derived by replaying the dart log through its engine. */
export interface PracticeState {
  currentTarget: import("./game").PracticeTarget | null
  targetLabel: string
  roundIndex: number
  dartsThrown: number
  score: number
  progressLabel: string
  complete: boolean
  eliminated: boolean // Bob's 27 only
  finalScore: number | null
  /** Shanghai only: the game ended on a shanghai. */
  shanghai?: boolean
  /** Scoring drill only: exact treble-20 strike rate. */
  strikeRate?: number
  /** Checkout modes: remaining score within the current attempt. */
  attemptRemaining?: number
  /** Checkout modes: darts left in the current attempt. */
  attemptDartsLeft?: number
  /** Engine-supplied aim override for the next dart (e.g. halve-it's 41 round). */
  aimHint?: { targetSegment: number | null; targetRing: Ring | null }
}

export interface Metrics {
  threeDartAverage: number
  firstNineAverage: number
  dartsThrown: number
  checkoutPct: number | null
  checkoutPctIsInferred: boolean
  doublesAttempted: number
  doublesHit: number
  /** Per-double breakdown feeding the heatmap. Key is `${segment}` (2..40 by double segment 1..20, plus 25 for bull). */
  doublesBySegment: Record<string, { attempts: number; hits: number }>
  count180: number
  count140plus: number
  count100plus: number
  bestVisit: number
  bestLegInDarts: number | null
  bestCheckout: number | null
}

export type { Ring }
