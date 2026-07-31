import type { Dart, PracticeConfig, PracticeState, Ring } from "@/lib/types"
import type { PracticeEngine } from "../types"
import { labelForTarget } from "../types"

interface ShanghaiState extends PracticeState {
  rounds: number
  roundDarts: number
  ringsHit: Ring[]
}

/**
 * Shanghai. Round n targets the number n, any ring; hits score their real
 * value. Single, double and treble of the number within one round is a
 * shanghai: the game ends immediately as a win.
 */
export const shanghai: PracticeEngine = {
  key: "shanghai",

  initial(config) {
    const rounds = (config as PracticeConfig | null)?.rounds === 7 ? 7 : 20 // 7 or 20 only
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
      shanghai: false,
      rounds,
      roundDarts: 0,
      ringsHit: [],
    })
  },

  onDart(state, dart: Dart) {
    const s = state as ShanghaiState
    if (s.complete) return s
    const n = s.roundIndex + 1
    const hit = dart.segment === n && dart.ring !== "MISS"

    let score = s.score
    let ringsHit = s.ringsHit
    if (hit) {
      score += dart.score
      if (!ringsHit.includes(dart.ring)) ringsHit = [...ringsHit, dart.ring]
    }

    // Single, double and treble of the round's number: instant win.
    const isShanghai =
      ringsHit.includes("S") && ringsHit.includes("D") && ringsHit.includes("T")

    let roundDarts = s.roundDarts + 1
    let roundIndex = s.roundIndex
    let complete = false

    if (isShanghai) {
      complete = true
    } else if (roundDarts === 3) {
      roundIndex += 1
      roundDarts = 0
      ringsHit = []
      if (roundIndex >= s.rounds) complete = true
    }

    return withDerived({
      ...s,
      score,
      roundIndex,
      roundDarts,
      ringsHit,
      complete,
      shanghai: isShanghai,
      dartsThrown: s.dartsThrown + 1,
      finalScore: complete ? score : null,
    })
  },

  targetFor(state) {
    return state.currentTarget
  },
}

function withDerived(s: ShanghaiState): ShanghaiState {
  const target = s.complete
    ? null
    : ({ type: "segment", segment: s.roundIndex + 1, ring: null } as const)
  return {
    ...s,
    currentTarget: target,
    targetLabel: labelForTarget(target),
    progressLabel: `Round ${Math.min(s.roundIndex + 1, s.rounds)} of ${s.rounds}`,
  }
}
