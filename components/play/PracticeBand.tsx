"use client"

import type { Dart } from "@/lib/types"
import type { PracticeHud } from "@/lib/practice"
import { cn } from "@/lib/utils/cn"
import { DartSlots } from "./DartSlots"
import { UndoButton } from "./UndoButton"

/**
 * The per-drill scoreboard band (spec 0010). Renders whatever vocabulary
 * the drill speaks — hero figure, chips, pips, progress — from the HUD
 * descriptor. The target stays the biggest thing on screen: it is what
 * the player aims at next.
 */
export function PracticeBand({
  hud,
  targetLabel,
  visitDarts,
  finishLabel,
  onUndo,
  undoDisabled,
}: {
  hud: PracticeHud
  targetLabel: string
  visitDarts: Dart[]
  finishLabel: string
  onUndo: () => void
  undoDisabled: boolean
}) {
  return (
    <section className="flex-none px-3 pb-2 pt-1">
      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
            {hud.eyebrow}
          </p>
          <div
            className="font-display text-[64px] leading-[0.95] tracking-tight"
            data-testid="practice-target"
          >
            {targetLabel || "Done"}
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-widest text-tung">
            {hud.hero.label}
          </p>
          <div
            className={cn(
              "font-display text-3xl tabular-nums",
              hud.hero.tone === "danger" && "text-dbl"
            )}
            data-testid="practice-hero"
          >
            {hud.hero.value}
          </div>
          {hud.sub && (
            <p className="font-mono text-[10px] text-tung" data-testid="practice-sub">
              {hud.sub}
            </p>
          )}
        </div>
      </div>

      {(hud.chips.length > 0 || hud.pips) && (
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <div className="flex gap-4" data-testid="practice-chips">
            {hud.chips.map((chip) => (
              <span key={chip.label} className="font-mono text-xs text-tung">
                <span className="uppercase tracking-widest text-[10px]">{chip.label}</span>{" "}
                <span className="tabular-nums text-chalk">{chip.value}</span>
              </span>
            ))}
          </div>
          {hud.pips && (
            <div className="flex items-center gap-1.5" data-testid="practice-pips">
              <span className="font-mono text-[10px] uppercase tracking-widest text-tung">
                {hud.pips.label}
              </span>
              {hud.pips.pips.map((pip, i) =>
                pip.label ? (
                  <span
                    key={i}
                    className={cn(
                      "font-mono text-xs",
                      pip.on ? "text-wire" : "text-tung/40"
                    )}
                    data-on={pip.on}
                  >
                    {pip.label}
                  </span>
                ) : (
                  <span
                    key={i}
                    className={cn("h-2 w-2 rounded-full", pip.on ? "bg-wire" : "bg-slate2")}
                    data-on={pip.on}
                  />
                )
              )}
            </div>
          )}
        </div>
      )}

      {hud.progress && hud.progress.total > 0 && (
        <div className="mt-1.5 h-1 bg-bed" data-testid="practice-progress">
          <div
            className="h-full bg-wire"
            style={{
              width: `${Math.min(100, (hud.progress.done / hud.progress.total) * 100)}%`,
            }}
          />
        </div>
      )}

      <div className="mt-2">
        <DartSlots darts={visitDarts} />
      </div>
      <div className="mt-1.5 flex h-6 items-center justify-between">
        <span className="font-mono text-xs text-tung">{finishLabel}</span>
        <UndoButton onUndo={onUndo} disabled={undoDisabled} />
      </div>
    </section>
  )
}
