import type { Dart, PracticeConfig, PracticeGameKey, PracticeState } from "@/lib/types"
import { makeRng } from "@/lib/utils/rng"
import type { PracticeEngine } from "./types"
import { aroundTheClock } from "./games/around-the-clock"
import { doublesRoundTheBoard } from "./games/doubles-round-the-board"
import { bobs27 } from "./games/bobs-27"
import { shanghai } from "./games/shanghai"
import { halveIt } from "./games/halve-it"
import { checkoutLadder } from "./games/checkout-ladder"
import { randomCheckout } from "./games/random-checkout"
import { scoringDrill } from "./games/scoring-drill"
import { jdcChallenge } from "./games/jdc-challenge"
import { targetSwitching } from "./games/target-switching"
import { pressureDoubles } from "./games/pressure-doubles"

export type { PracticeEngine, Rng } from "./types"
export { matchesTarget, labelForTarget, dartTargetFor } from "./types"
export { gradeForJdcScore, JDC_GRADES } from "./games/jdc-challenge"
export { hudFor } from "./hud"
export type { PracticeHud, HudChip, HudPip, HudExtras } from "./hud"

const ENGINES: Record<PracticeGameKey, PracticeEngine> = {
  "around-the-clock": aroundTheClock,
  "doubles-round-the-board": doublesRoundTheBoard,
  "bobs-27": bobs27,
  shanghai,
  "halve-it": halveIt,
  "checkout-ladder": checkoutLadder,
  "random-checkout": randomCheckout,
  "scoring-drill": scoringDrill,
  "jdc-challenge": jdcChallenge,
  "target-switching": targetSwitching,
  "pressure-doubles": pressureDoubles,
}

export function getEngine(key: PracticeGameKey): PracticeEngine {
  return ENGINES[key]
}

export function isPracticeKey(mode: string): mode is PracticeGameKey {
  return mode in ENGINES
}

/**
 * Derive the live practice state by replaying the dart log through the
 * game's engine — the practice-side twin of deriveGameState. Undo is
 * "drop the last dart and replay", exactly as in x01 (ADR 0003).
 */
export function derivePracticeState(
  darts: Dart[],
  key: PracticeGameKey,
  config: PracticeConfig | null | undefined
): PracticeState {
  const engine = getEngine(key)
  const rng = makeRng(config?.rngSeed ?? 1)
  let state = engine.initial(config ?? {}, rng)
  for (const dart of darts) {
    state = engine.onDart(state, dart)
  }
  return state
}
