import type { Dart, PracticeState } from "@/lib/types"
import type { PracticeEngine } from "../types"
import { labelForTarget } from "../types"

const VISITS = 20
const DARTS = VISITS * 3

interface ScoringDrillState extends PracticeState {
  totalScored: number
  t20Hits: number
}

/**
 * Scoring drill. Twenty visits, sixty darts, target always treble 20.
 * Score: the three-dart average across the sixty darts. Because every
 * dart carries an exact target, it also reports the treble-20 strike rate.
 */
export const scoringDrill: PracticeEngine = {
  key: "scoring-drill",

  initial() {
    return withDerived({
      currentTarget: null,
      targetLabel: "",
      roundIndex: 0,
      dartsThrown: 0,
      score: 0,
      progressLabel: "",
      complete: false,
      eliminated: false,
      finalScore: null,
      totalScored: 0,
      t20Hits: 0,
      strikeRate: 0,
    })
  },

  onDart(state, dart: Dart) {
    const s = state as ScoringDrillState
    if (s.complete) return s
    const dartsThrown = s.dartsThrown + 1
    const totalScored = s.totalScored + dart.score
    const t20Hits = s.t20Hits + (dart.ring === "T" && dart.segment === 20 ? 1 : 0)
    const complete = dartsThrown >= DARTS
    const average = (totalScored / dartsThrown) * 3
    return withDerived({
      ...s,
      dartsThrown,
      totalScored,
      t20Hits,
      roundIndex: Math.floor(dartsThrown / 3),
      score: totalScored,
      complete,
      finalScore: complete ? Math.round(average * 100) / 100 : null,
      strikeRate: Math.round((t20Hits / dartsThrown) * 1000) / 10,
    })
  },

  targetFor(state) {
    return state.currentTarget
  },
}

function withDerived(s: ScoringDrillState): ScoringDrillState {
  const target = s.complete ? null : ({ type: "segment", segment: 20, ring: "T" } as const)
  return {
    ...s,
    currentTarget: target,
    targetLabel: labelForTarget(target),
    progressLabel: `Visit ${Math.min(s.roundIndex + 1, VISITS)} of ${VISITS}`,
  }
}
