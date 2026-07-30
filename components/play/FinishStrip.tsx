"use client"

import type { Segment } from "@/lib/types"
import { labelOf } from "@/lib/scoring"
import { cn } from "@/lib/utils/cn"

/**
 * The segments of the current checkout route as one-tap keys. Appears only
 * when a route exists; tapping a key records the same dart as the grid would.
 */
export function FinishStrip({
  route,
  onThrow,
  disabled = false,
}: {
  route: Segment[]
  onThrow: (segment: Segment) => void
  disabled?: boolean
}) {
  return (
    <div
      className="grid flex-none basis-12 gap-px bg-wire/60"
      style={{ gridTemplateColumns: `repeat(${route.length}, 1fr)` }}
      data-testid="finish-strip"
    >
      {route.map((segment, i) => (
        <button
          key={`${labelOf(segment)}-${i}`}
          className={cn(
            "font-mono text-base font-semibold active:brightness-150",
            segment.ring === "D" ? "bg-dbl" : segment.ring === "T" ? "bg-trb" : "bg-bed"
          )}
          onPointerDown={() => !disabled && onThrow(segment)}
          data-testid={`finish-key-${labelOf(segment)}`}
        >
          {labelOf(segment)}
        </button>
      ))}
    </div>
  )
}
