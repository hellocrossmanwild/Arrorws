import type { Ring } from "./dart"

export type PracticeGameKey =
  | "around-the-clock"
  | "doubles-round-the-board"
  | "bobs-27"
  | "shanghai"
  | "halve-it"
  | "checkout-ladder"
  | "random-checkout"
  | "scoring-drill"
  | "jdc-challenge"
  | "target-switching"
  | "pressure-doubles"

export type GameMode = "x01" | PracticeGameKey

export interface X01Config {
  startingScore: number
  legsToWin: number
}

/** Per-practice-game options. All optional with engine defaults. */
export interface PracticeConfig {
  rngSeed?: number
  doublesOnly?: boolean // around-the-clock hidden variant
  rounds?: number // shanghai (7 | 20), target-switching (any)
  showFinish?: boolean // random-checkout
  doubles?: number[] // pressure-doubles
  hitsRequired?: number // pressure-doubles
}

export type GameConfig = X01Config | PracticeConfig

export interface Game {
  id: string
  sessionId: string
  mode: GameMode
  config: GameConfig
  participantPlayerIds: string[]
  startedAt: string
  endedAt: string | null
  abandoned: boolean
}

export interface Session {
  id: string
  playerId: string
  startedAt: string
  endedAt: string | null
  note: string | null
}

export interface Leg {
  id: string
  gameId: string
  index: number
  startingScore: number | null
  startingPlayerId: string
  winnerPlayerId: string | null
}

export interface Visit {
  id: string
  legId: string
  playerId: string
  index: number // zero based within the leg, per player
  bust: boolean
}

export interface PracticeGameDefinition {
  key: PracticeGameKey
  name: string
  blurb: string
  targetType: "sequence" | "score" | "checkout"
  rules: PracticeRules | Record<string, never>
  scoringModel: "darts-to-complete" | "points" | "hit-rate"
  personalBestDirection: "lower-is-better" | "higher-is-better"
  /** Training-block engines are hidden from the practice picker (ADR 0007). */
  trainingOnly?: boolean
}

/** Machine-readable rule config per targetType. Defined in spec 0005. */
export type PracticeRules =
  | { targetType: "sequence"; targets: PracticeTarget[]; requireExactRing: boolean }
  | {
      targetType: "rounds"
      rounds: number
      targetPerRound: "index" | "fixed"
      fixedTarget?: PracticeTarget
    }
  | { targetType: "checkout"; start: number; mode: "ladder" | "random"; attempts: number }

/** What a practice dart is aimed at. */
export type PracticeTarget =
  | { type: "segment"; segment: number; ring: Ring | null } // ring null = any ring of the number
  | { type: "anyRing"; ring: "D" | "T" } // any double / any treble
  | { type: "score"; score: number } // check out this score / hit this total

export interface GameResult {
  id: string
  gameId: string
  playerId: string
  metrics: ResultMetrics
  computedAt: string
}

export interface ResultMetrics {
  threeDartAverage: number
  firstNineAverage: number
  dartsThrown: number
  checkoutPct: number | null
  doublesAttempted: number
  doublesHit: number
  bestVisit: number
  count180: number
  count140plus: number
  count100plus: number
  /** The game-specific score for practice games. Null for x01. */
  gameScore: number | null
}
