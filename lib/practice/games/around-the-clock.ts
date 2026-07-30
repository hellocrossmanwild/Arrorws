import type { PracticeConfig, PracticeTarget } from "@/lib/types"
import { makeSequenceEngine } from "./sequence"

/**
 * 1 to 20 in order, then outer bull, then bull. Any ring of the target
 * number counts. Score: total darts to complete all 22 targets.
 * `doublesOnly: true` is the hidden variant that becomes doubles round the
 * board; it is not exposed in the picker.
 */
export const aroundTheClock = makeSequenceEngine("around-the-clock", (config) => {
  const doublesOnly = Boolean((config as PracticeConfig | null)?.doublesOnly)
  if (doublesOnly) {
    return [
      ...Array.from({ length: 20 }, (_, i): PracticeTarget => ({
        type: "segment",
        segment: i + 1,
        ring: "D",
      })),
      { type: "segment", segment: 25, ring: "D" },
    ]
  }
  return [
    ...Array.from({ length: 20 }, (_, i): PracticeTarget => ({
      type: "segment",
      segment: i + 1,
      ring: null,
    })),
    { type: "segment", segment: 25, ring: "S" },
    { type: "segment", segment: 25, ring: "D" },
  ]
})
