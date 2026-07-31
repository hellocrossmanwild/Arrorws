import type {
  TrainingProgram,
  TrainingSessionTemplate,
} from "@/lib/types"

/**
 * The Foundation programme (spec 0008, ADR 0007). Four weeks, four
 * sessions a week, queue model. Pure configuration — no state, no I/O.
 */
export const FOUNDATION: TrainingProgram = {
  id: "foundation",
  name: "Foundation",
  weeks: 4,
  sessionsPerWeek: 4,
}

export const TOTAL_SESSIONS = FOUNDATION.weeks * FOUNDATION.sessionsPerWeek

const WARM_UP = {
  name: "Switching warm-up",
  mode: "target-switching" as const,
  config: { rounds: 6 },
}

/** The template for the sessionIndex-th session of the queue (zero based). */
export function sessionTemplate(sessionIndex: number): TrainingSessionTemplate {
  const week = Math.floor(sessionIndex / FOUNDATION.sessionsPerWeek) + 1
  const slot = sessionIndex % FOUNDATION.sessionsPerWeek

  switch (slot) {
    case 0:
      return {
        kind: "scoring",
        name: "Scoring",
        blocks: [
          WARM_UP,
          { name: "Scoring drill", mode: "scoring-drill", config: {} },
          { name: "Halve it", mode: "halve-it", config: {} },
        ],
      }
    case 1:
      return {
        kind: "doubles",
        name: "Doubles",
        blocks: [
          WARM_UP,
          { name: "Doubles round the board", mode: "doubles-round-the-board", config: {} },
          {
            name: "Pressure doubles",
            mode: "pressure-doubles",
            config: { doubles: [16, 20, 18, 10], hitsRequired: 2 },
          },
        ],
      }
    case 2:
      return {
        kind: "finishing",
        name: "Finishing",
        blocks: [
          WARM_UP,
          { name: "Checkout ladder", mode: "checkout-ladder", config: {} },
          { name: "Random checkout", mode: "random-checkout", config: {} },
        ],
      }
    default: {
      // Slot 3: match on odd weeks, the JDC assessment on even weeks.
      if (week % 2 === 0) {
        return {
          kind: "assessment",
          name: "JDC Challenge",
          blocks: [WARM_UP, { name: "JDC Challenge", mode: "jdc-challenge", config: {} }],
        }
      }
      return {
        kind: "match",
        name: "Match",
        blocks: [
          WARM_UP,
          {
            name: "501 vs County, first to 3",
            mode: "x01",
            config: { startingScore: 501, legsToWin: 3 },
            withBot: "bot-county",
          },
        ],
      }
    }
  }
}

export function weekOf(sessionIndex: number): number {
  return Math.floor(sessionIndex / FOUNDATION.sessionsPerWeek) + 1
}
