import type { GameConfig, GameMode } from "./game"

/** One block of a training session: an engine (or x01 match) with its config. */
export interface TrainingBlock {
  name: string
  mode: GameMode
  config: GameConfig
  /** Bot player id to add as the second participant (match blocks). */
  withBot?: string
}

export type TrainingSessionKind =
  | "scoring"
  | "doubles"
  | "finishing"
  | "match"
  | "assessment"

export interface TrainingSessionTemplate {
  kind: TrainingSessionKind
  name: string
  blocks: TrainingBlock[]
}

/** Static programme configuration — product content, like practice definitions. */
export interface TrainingProgram {
  id: string
  name: string
  weeks: number
  sessionsPerWeek: number
}

/**
 * A planned session instance. A thin planner row (ADR 0007): the games it
 * references are ordinary games in the ordinary dart log. Block entries
 * are null until done, then the fulfilling gameId or "skipped".
 */
export interface TrainingSession {
  id: string
  programId: string
  sessionIndex: number
  week: number
  kind: TrainingSessionKind
  startedAt: string
  completedAt: string | null
  blockGameIds: (string | null)[]
}
