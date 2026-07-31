import type { Dart, Segment } from "@/lib/types"
import { labelOf } from "@/lib/scoring"
import { DartSlots } from "./DartSlots"
import { UndoButton } from "./UndoButton"

/** Remaining score (the largest element on screen), dart slots, finish line. */
export function ScoreDisplay({
  score,
  currentVisit,
  route,
  bust,
  onUndo,
  undoDisabled,
}: {
  score: number
  currentVisit: Dart[]
  route: Segment[] | null
  bust: boolean
  onUndo: () => void
  undoDisabled: boolean
}) {
  return (
    <section className="flex-none px-3 pb-2 pt-1">
      <div className="flex items-center justify-between">
        <div
          className="font-display text-[76px] leading-[0.9] tracking-tight tabular-nums"
          data-testid="remaining-score"
        >
          {score}
        </div>
        <UndoButton onUndo={onUndo} disabled={undoDisabled} />
      </div>
      <div className="mt-2">
        <DartSlots darts={currentVisit} />
      </div>
      <p className="mt-1.5 h-4 font-mono text-xs tracking-wide text-tung" data-testid="finish-hint">
        {bust
          ? "Bust. Score restored"
          : route
            ? `Finish · ${route.map(labelOf).join("  ")}`
            : "No finish from here"}
      </p>
    </section>
  )
}
