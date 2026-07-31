import type { Dart, PracticeConfig, PracticeState } from "@/lib/types"
import type { PracticeEngine } from "../types"
import { labelForTarget } from "../types"

const DEFAULT_DOUBLES = [16, 20, 18, 10]
const DEFAULT_HITS = 2

interface PressureConfig extends PracticeConfig {
  doubles?: number[]
  hitsRequired?: number
}

interface PressureState extends PracticeState {
  doubles: number[]
  hitsRequired: number
  hitsOnCurrent: number
}

/**
 * Pressure doubles (ADR 0007): the session finisher. Work through the
 * primary finishing doubles in order; each needs its required number of
 * clean hits before you may move on, with unlimited darts. The session
 * does not end until the board lets you go. Score: darts taken —
 * lower is better.
 */
export const pressureDoubles: PracticeEngine = {
  key: "pressure-doubles",

  initial(config) {
    const cfg = (config ?? {}) as PressureConfig
    const doubles =
      Array.isArray(cfg.doubles) && cfg.doubles.length > 0 ? cfg.doubles : DEFAULT_DOUBLES
    const hitsRequired =
      typeof cfg.hitsRequired === "number" && cfg.hitsRequired > 0
        ? cfg.hitsRequired
        : DEFAULT_HITS
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
      doubles,
      hitsRequired,
      hitsOnCurrent: 0,
    })
  },

  onDart(state, dart: Dart) {
    const s = state as PressureState
    if (s.complete) return s
    const target = s.doubles[s.roundIndex]
    const hit = dart.ring === "D" && dart.segment === target

    let hitsOnCurrent = s.hitsOnCurrent + (hit ? 1 : 0)
    let roundIndex = s.roundIndex
    if (hitsOnCurrent >= s.hitsRequired) {
      roundIndex += 1
      hitsOnCurrent = 0
    }
    const dartsThrown = s.dartsThrown + 1
    const complete = roundIndex >= s.doubles.length
    return withDerived({
      ...s,
      roundIndex,
      hitsOnCurrent,
      dartsThrown,
      score: dartsThrown,
      complete,
      finalScore: complete ? dartsThrown : null,
    })
  },

  targetFor(state) {
    return state.currentTarget
  },
}

function withDerived(s: PressureState): PressureState {
  const target = s.complete
    ? null
    : ({ type: "segment", segment: s.doubles[s.roundIndex], ring: "D" } as const)
  return {
    ...s,
    currentTarget: target,
    targetLabel: labelForTarget(target),
    progressLabel: s.complete
      ? `Done in ${s.dartsThrown}`
      : `${s.hitsOnCurrent} of ${s.hitsRequired} · double ${s.roundIndex + 1} of ${s.doubles.length}`,
  }
}
