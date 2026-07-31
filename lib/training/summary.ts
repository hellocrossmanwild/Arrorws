import type { TrainingSession, TrainingSessionTemplate } from "@/lib/types"
import { gradeForJdcScore } from "@/lib/practice"
import { FOUNDATION, TOTAL_SESSIONS, sessionTemplate, weekOf } from "./program"
import { sessionsInWeek, weekStreak } from "./streak"

export interface TrainingAssessment {
  date: string
  score: number
  grade: string
}

export interface TrainingSummary {
  program: typeof FOUNDATION
  totalSessions: number
  completedCount: number
  programComplete: boolean
  active: TrainingSession | null
  /** The session waiting in the queue (the active one, or the next to start). */
  nextSession: { index: number; week: number; template: TrainingSessionTemplate } | null
  sessionsThisWeek: number
  weeklyTarget: number
  weekStreak: number
  assessments: TrainingAssessment[]
}

/**
 * Assemble the Training screen's state from planner rows and JDC results.
 * Pure — both the MSW handler and the server service call this with their
 * own rows and clock.
 */
export function buildTrainingSummary(
  sessions: TrainingSession[],
  jdcScores: Array<{ date: string; score: number }>,
  nowMs: number
): TrainingSummary {
  const ordered = [...sessions].sort((a, b) => a.sessionIndex - b.sessionIndex)
  const completed = ordered.filter((s) => s.completedAt !== null)
  const active = ordered.find((s) => s.completedAt === null) ?? null
  const completedCount = completed.length
  const programComplete = completedCount >= TOTAL_SESSIONS && !active

  const nextIndex = active ? active.sessionIndex : ordered.length
  const nextSession =
    nextIndex < TOTAL_SESSIONS || active
      ? { index: nextIndex, week: weekOf(nextIndex), template: sessionTemplate(nextIndex) }
      : null

  const completedAtMs = completed.map((s) => Date.parse(s.completedAt!))
  return {
    program: FOUNDATION,
    totalSessions: TOTAL_SESSIONS,
    completedCount,
    programComplete,
    active,
    nextSession,
    sessionsThisWeek: sessionsInWeek(completedAtMs, nowMs),
    weeklyTarget: FOUNDATION.sessionsPerWeek,
    weekStreak: weekStreak(completedAtMs, FOUNDATION.sessionsPerWeek, nowMs),
    assessments: jdcScores
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((r) => ({ ...r, grade: gradeForJdcScore(r.score) })),
  }
}
