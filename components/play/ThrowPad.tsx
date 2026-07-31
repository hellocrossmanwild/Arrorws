"use client"

import { useEffect, useState } from "react"
import type { Segment } from "@/lib/types"
import { cn } from "@/lib/utils/cn"

type Modifier = "D" | "T" | null

interface ThrowPadProps {
  onThrow: (segment: Segment) => void
  disabled?: boolean
  /** Change this value to clear an armed modifier: after a dart, on undo, on visit change. */
  clearKey: number
}

/**
 * The modifier pad — the only input component in the app (ADR 0004).
 * Sticky Double/Treble toggles; when armed, the whole grid changes colour
 * and every label rewrites. Keys respond on pointerdown.
 */
export function ThrowPad({ onThrow, disabled = false, clearKey }: ThrowPadProps) {
  const [modifier, setModifier] = useState<Modifier>(null)

  // The modifier clears after exactly one dart, on undo, and on visit change.
  useEffect(() => {
    setModifier(null)
  }, [clearKey])

  const throwSegment = (segment: Segment) => {
    if (disabled) return
    onThrow(segment)
    setModifier(null)
  }

  const gridColour =
    modifier === "D" ? "bg-dbl" : modifier === "T" ? "bg-trb" : "bg-bed"

  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col gap-px bg-wire/60 pt-px", disabled && "opacity-40")}
      data-testid="throw-pad"
      aria-disabled={disabled}
    >
      <div className="grid flex-none basis-14 grid-cols-2 gap-px">
        <button
          className={cn(
            "font-semibold uppercase tracking-wide",
            modifier === "D" ? "bg-dbl text-chalk" : "bg-bed text-tung"
          )}
          aria-pressed={modifier === "D"}
          onPointerDown={() => !disabled && setModifier((m) => (m === "D" ? null : "D"))}
          data-testid="modifier-double"
        >
          Double
        </button>
        <button
          className={cn(
            "font-semibold uppercase tracking-wide",
            modifier === "T" ? "bg-trb text-chalk" : "bg-bed text-tung"
          )}
          aria-pressed={modifier === "T"}
          onPointerDown={() => !disabled && setModifier((m) => (m === "T" ? null : "T"))}
          data-testid="modifier-treble"
        >
          Treble
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-5 grid-rows-4 gap-px">
        {Array.from({ length: 20 }, (_, i) => {
          const n = i + 1
          const label = modifier ? `${modifier}${n}` : String(n)
          return (
            <button
              key={n}
              className={cn(
                "min-h-[44px] text-lg font-semibold text-chalk active:brightness-150",
                gridColour
              )}
              onPointerDown={() =>
                throwSegment({ segment: n, ring: modifier ?? "S" })
              }
              data-testid={`key-${n}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="grid flex-none basis-14 grid-cols-3 gap-px">
        {/* Bull keys are unaffected by an armed modifier; tapping clears it. */}
        <button
          className="bg-bed text-lg font-semibold active:brightness-150"
          onPointerDown={() => throwSegment({ segment: 25, ring: "S" })}
          data-testid="key-25"
        >
          25
        </button>
        <button
          className="bg-bed text-lg font-semibold text-dbl active:brightness-150"
          onPointerDown={() => throwSegment({ segment: 25, ring: "D" })}
          data-testid="key-bull"
        >
          BULL
        </button>
        <button
          className="bg-bed text-lg font-semibold text-tung active:brightness-150"
          onPointerDown={() => throwSegment({ segment: 0, ring: "MISS" })}
          data-testid="key-miss"
        >
          MISS
        </button>
      </div>
    </div>
  )
}
