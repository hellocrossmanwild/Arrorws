"use client"

import { Button } from "@/components/ui/button"

interface Figure {
  label: string
  value: string
}

/** Bottom sheet on leg or game end. Plain figures, no celebration. */
export function LegCompleteSheet({
  title,
  figures,
  actionLabel,
  onAction,
  note,
}: {
  title: string
  figures: Figure[]
  actionLabel: string
  onAction: () => void
  note?: string
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/80" data-testid="leg-complete-sheet">
      <div className="w-full border-t border-wire bg-slate2 px-4 pb-7 pt-5">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">{title}</p>
        <div
          className="grid gap-px bg-wire/60"
          style={{ gridTemplateColumns: `repeat(${Math.min(figures.length, 3)}, 1fr)` }}
        >
          {figures.map((f) => (
            <div key={f.label} className="bg-bed px-3 py-3">
              <span className="block font-mono text-[10px] uppercase tracking-widest text-tung">
                {f.label}
              </span>
              <span className="font-display text-xl">{f.value}</span>
            </div>
          ))}
        </div>
        {note && <p className="mt-3 text-sm text-chalk">{note}</p>}
        <Button className="mt-4 w-full" onClick={onAction} data-testid="sheet-action">
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}
