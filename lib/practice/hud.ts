import type { Dart, PracticeGameKey, PracticeState, Ring } from "@/lib/types"
import { gradeForJdcScore } from "./games/jdc-challenge"

/**
 * The per-drill scoreboard (spec 0010). Each practice mode gets its own
 * vocabulary for the top band: one hero figure (the thing the drill is
 * about), a few labelled chips, optional pips (lives, hits, shanghai
 * rings) and a progress fraction. Pure: PracticeState in, descriptor out.
 * The entry pad knows nothing about any of this.
 */

export interface HudChip {
  label: string
  value: string
}

export interface HudPip {
  label?: string
  on: boolean
}

export interface PracticeHud {
  /** Small uppercase line above the target. */
  eyebrow: string
  /** The one figure this drill is about. */
  hero: { label: string; value: string; tone?: "default" | "danger" }
  /** Optional stake line under the hero (penalty, halving, grade). */
  sub?: string
  /** Up to three small labelled figures. */
  chips: HudChip[]
  /** Dot row: lives left, clean hits, or S/D/T rings this round. */
  pips?: { label: string; pips: HudPip[] }
  /** Fraction for the thin progress bar. */
  progress?: { done: number; total: number }
}

/**
 * Engines carry internal fields beyond PracticeState (see PracticeEngine).
 * The HUD reads the ones it needs; every access has a fallback so a
 * missing field degrades to a sensible default rather than crashing.
 */
interface EngineInternals {
  targets?: unknown[]
  rounds?: number
  ringsHit?: Ring[]
  consecutiveFailures?: number
  hitsOnCurrent?: number
  hitsRequired?: number
  doubles?: number[]
  roundTotal?: number
}

export interface HudExtras {
  /** The full dart log, for figures the state does not carry (last visit). */
  darts?: Dart[]
  /** The personal best for this drill, shown as a PB chip when known. */
  personalBest?: number | null
}

const MAX_CHIPS = 3

export function hudFor(
  key: PracticeGameKey,
  state: PracticeState,
  extras: HudExtras = {}
): PracticeHud {
  const s = state as PracticeState & EngineInternals
  const hud = buildHud(key, s, extras)
  if (extras.personalBest != null && hud.chips.length < MAX_CHIPS) {
    hud.chips.push({ label: "PB", value: String(extras.personalBest) })
  }
  return hud
}

function buildHud(
  key: PracticeGameKey,
  s: PracticeState & EngineInternals,
  extras: HudExtras
): PracticeHud {
  switch (key) {
    case "around-the-clock":
    case "doubles-round-the-board": {
      const total = Array.isArray(s.targets) ? s.targets.length : 0
      const chips: HudChip[] = [{ label: "Darts", value: String(s.dartsThrown) }]
      if (s.roundIndex > 0) {
        chips.push({
          label: "Per target",
          value: (s.dartsThrown / s.roundIndex).toFixed(1),
        })
      }
      return {
        eyebrow: s.progressLabel,
        hero: { label: "Darts", value: String(s.dartsThrown) },
        // The dart count is the hero; no duplicate chip.
        chips: chips.slice(1),
        progress: total > 0 ? { done: s.roundIndex, total } : undefined,
      }
    }

    case "bobs-27": {
      const n = s.roundIndex + 1
      const danger = !s.complete && s.score - 2 * n < 0
      return {
        eyebrow: s.progressLabel,
        hero: {
          label: "Score",
          value: String(s.score),
          tone: danger ? "danger" : undefined,
        },
        sub: s.complete
          ? undefined
          : danger
            ? `A blank round ends it · −${2 * n}`
            : `Miss all three −${2 * n}`,
        chips: [{ label: "Darts", value: String(s.dartsThrown) }],
        progress: { done: Math.min(s.roundIndex, 20), total: 20 },
      }
    }

    case "shanghai": {
      const rounds = s.rounds ?? 20
      const rings = s.ringsHit ?? []
      return {
        eyebrow: s.progressLabel,
        hero: { label: "Points", value: String(s.score) },
        chips: [{ label: "Darts", value: String(s.dartsThrown) }],
        pips: {
          label: "Shanghai",
          pips: (["S", "D", "T"] as const).map((r) => ({
            label: r,
            on: rings.includes(r),
          })),
        },
        progress: { done: Math.min(s.roundIndex, rounds), total: rounds },
      }
    }

    case "halve-it": {
      const isScoreRound = s.currentTarget?.type === "score"
      return {
        eyebrow: s.progressLabel,
        hero: { label: "Points", value: String(s.score) },
        sub: s.complete
          ? undefined
          : isScoreRound
            ? `Three-dart total ${s.roundTotal ?? 0} · needs exactly 41`
            : `A blank halves to ${Math.floor(s.score / 2)}`,
        chips: [{ label: "Darts", value: String(s.dartsThrown) }],
        progress: { done: Math.min(s.roundIndex, 7), total: 7 },
      }
    }

    case "checkout-ladder": {
      const lives = 3 - (s.consecutiveFailures ?? 0)
      const chips: HudChip[] = []
      if (!s.complete && s.attemptRemaining !== undefined) {
        chips.push({ label: "To go", value: String(s.attemptRemaining) })
      }
      if (!s.complete && s.attemptDartsLeft !== undefined) {
        chips.push({ label: "Darts left", value: String(s.attemptDartsLeft) })
      }
      return {
        eyebrow: `${s.roundIndex} taken out`,
        hero: {
          label: "Best",
          value: s.score > 0 ? String(s.score) : "—",
          tone: !s.complete && lives === 1 ? "danger" : undefined,
        },
        chips,
        pips: {
          label: "Lives",
          pips: [0, 1, 2].map((i) => ({ on: i < lives })),
        },
      }
    }

    case "random-checkout": {
      const chips: HudChip[] = []
      if (!s.complete && s.attemptRemaining !== undefined) {
        chips.push({ label: "To go", value: String(s.attemptRemaining) })
      }
      if (!s.complete && s.attemptDartsLeft !== undefined) {
        chips.push({ label: "Darts left", value: String(s.attemptDartsLeft) })
      }
      return {
        eyebrow: s.progressLabel,
        hero: { label: "Taken out", value: String(s.score) },
        chips,
        progress: { done: Math.min(s.roundIndex, 20), total: 20 },
      }
    }

    case "scoring-drill": {
      const average = s.dartsThrown > 0 ? (s.score / s.dartsThrown) * 3 : 0
      const chips: HudChip[] = [
        { label: "T20 rate", value: `${s.strikeRate ?? 0}%` },
      ]
      const lastVisit = lastCompleteVisitScore(extras.darts, s.dartsThrown)
      if (lastVisit !== null) {
        chips.push({ label: "Last visit", value: String(lastVisit) })
      }
      return {
        eyebrow: s.progressLabel,
        hero: { label: "3-dart avg", value: average.toFixed(1) },
        chips,
        progress: { done: Math.min(s.roundIndex, 20), total: 20 },
      }
    }

    case "jdc-challenge": {
      return {
        eyebrow: s.progressLabel,
        hero: { label: "Points", value: String(s.score) },
        sub: `On for ${gradeForJdcScore(s.score)}`,
        chips: [{ label: "Darts", value: `${s.dartsThrown} of 57` }],
        progress: { done: Math.min(s.dartsThrown, 57), total: 57 },
      }
    }

    case "target-switching": {
      const rounds = s.rounds ?? 6
      return {
        eyebrow: s.progressLabel,
        hero: { label: "Points", value: String(s.score) },
        chips: [{ label: "Darts", value: String(s.dartsThrown) }],
        progress: { done: Math.min(s.roundIndex, rounds), total: rounds },
      }
    }

    case "pressure-doubles": {
      const doubles = s.doubles ?? [16, 20, 18, 10]
      const hitsRequired = s.hitsRequired ?? 2
      const hitsOnCurrent = s.hitsOnCurrent ?? 0
      return {
        eyebrow: s.complete
          ? s.progressLabel
          : `Double ${Math.min(s.roundIndex + 1, doubles.length)} of ${doubles.length}`,
        hero: { label: "Darts", value: String(s.dartsThrown) },
        chips: [
          {
            label: "Cleared",
            value: `${Math.min(s.roundIndex, doubles.length)} of ${doubles.length}`,
          },
        ],
        pips: {
          label: "Hits",
          pips: Array.from({ length: hitsRequired }, (_, i) => ({
            on: i < hitsOnCurrent,
          })),
        },
        progress: { done: Math.min(s.roundIndex, doubles.length), total: doubles.length },
      }
    }
  }
}

/** Sum of the most recent complete three-dart visit, or null before one exists. */
function lastCompleteVisitScore(darts: Dart[] | undefined, dartsThrown: number): number | null {
  if (!darts || dartsThrown < 3) return null
  const end = Math.floor(dartsThrown / 3) * 3
  const visit = darts.slice(end - 3, end)
  if (visit.length < 3) return null
  return visit.reduce((sum, d) => sum + d.score, 0)
}
