import type { JdcFamilyRow } from "@/lib/types"
import { beltColour } from "@/lib/jdc/belts"
import { cn } from "@/lib/utils/cn"

/**
 * Everyone who throws at this board, best score first (spec 0012).
 *
 * Players who have never thrown it still appear, last, with the action
 * rather than a blank: a child who has not started should see their name
 * waiting for them, not be missing from the family.
 */
export function FamilyBoard({
  rows,
  currentPlayerId,
}: {
  rows: JdcFamilyRow[]
  currentPlayerId: string
}) {
  return (
    <div className="flex flex-col gap-px bg-wire/40" data-testid="jdc-family">
      {rows.map((row) => {
        const mine = row.playerId === currentPlayerId
        return (
          <div
            key={row.playerId}
            className={cn(
              "flex items-center justify-between bg-bed px-4 py-3",
              mine && "shadow-[inset_3px_0_0_theme(colors.wire)]"
            )}
            data-testid={`family-row-${row.playerId}`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "h-7 w-7 shrink-0 ring-1 ring-wire/40",
                  row.belt === null && "opacity-25"
                )}
                style={{ backgroundColor: beltColour(row.belt ?? "White").swatch }}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block truncate font-display text-xl">{row.displayName}</span>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-tung">
                  {row.belt
                    ? `${row.belt} · ${row.attempts} attempt${row.attempts === 1 ? "" : "s"}`
                    : "Not thrown it yet"}
                </span>
              </span>
            </span>
            <span className="shrink-0 text-right font-mono text-xs text-tung">
              {row.best === null ? (
                <span className="text-wire">—</span>
              ) : (
                <>
                  <span className="block text-base text-chalk">{row.best}</span>
                  best
                </>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
