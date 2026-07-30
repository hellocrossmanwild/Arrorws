import type { PracticeTarget } from "@/lib/types"
import { makeSequenceEngine } from "./sequence"

/**
 * D1 to D20 in order, then bull. Only the exact double counts; bull
 * completes it. Score: total darts to complete all 21 targets.
 */
export const doublesRoundTheBoard = makeSequenceEngine("doubles-round-the-board", () => [
  ...Array.from({ length: 20 }, (_, i): PracticeTarget => ({
    type: "segment",
    segment: i + 1,
    ring: "D",
  })),
  { type: "segment", segment: 25, ring: "D" },
])
