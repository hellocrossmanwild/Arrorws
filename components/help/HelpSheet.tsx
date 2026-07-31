"use client"

import type { GameMode } from "@/lib/types"
import { ENTRY_RULE, GAME_GUIDES, PAD_PRIMER } from "@/lib/content/guides"

/**
 * The in-game help sheet (spec 0009): the full guide for a mode, readable
 * mid-drill without leaving the board. Scrolls within itself; the pad
 * stays where it was underneath.
 */
export function HelpSheet({
  mode,
  showPadPrimer = false,
  onClose,
}: {
  mode: GameMode
  showPadPrimer?: boolean
  onClose: () => void
}) {
  const guide = GAME_GUIDES[mode]
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/80"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="help-sheet"
    >
      <div className="max-h-[85%] w-full overflow-y-auto border-t border-wire bg-slate2 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl">{guide.title}</h2>
          <button
            className="min-h-[44px] px-3 font-mono text-xs uppercase tracking-widest text-wire"
            onClick={onClose}
            data-testid="help-close"
          >
            Close
          </button>
        </div>
        <p className="mt-1 text-sm text-chalk">{guide.what}</p>

        <HelpSection label="How to throw it">
          <ul className="space-y-2">
            {guide.how.map((line) => (
              <li key={line} className="flex gap-2 text-sm text-chalk">
                <span className="text-wire">·</span>
                {line}
              </li>
            ))}
          </ul>
        </HelpSection>

        <HelpSection label="Scoring">
          <p className="text-sm text-chalk">{guide.scoring}</p>
        </HelpSection>

        <HelpSection label="What it trains">
          <p className="text-sm text-chalk">{guide.trains}</p>
        </HelpSection>

        <HelpSection label="Tip">
          <p className="text-sm text-chalk">{guide.tip}</p>
        </HelpSection>

        {mode !== "x01" && (
          <p className="mt-4 border-l-2 border-wire pl-3 font-mono text-xs text-tung">
            {ENTRY_RULE}
          </p>
        )}

        {showPadPrimer && (
          <HelpSection label="Entering darts">
            <ul className="space-y-2">
              {PAD_PRIMER.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-chalk">
                  <span className="text-wire">·</span>
                  {line}
                </li>
              ))}
            </ul>
          </HelpSection>
        )}
      </div>
    </div>
  )
}

function HelpSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-wire">
        {label}
      </p>
      {children}
    </section>
  )
}
