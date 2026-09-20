import type { JdcBelt } from "@/lib/types"
import { beltColour } from "@/lib/jdc/belts"
import { cn } from "@/lib/utils/cn"

/**
 * The seven belts in order, earned ones filled. The current belt — the one
 * the best score reaches — carries a chalk outline. Unearned belts show
 * their threshold instead of a date, so the ladder doubles as the target
 * list (spec 0011).
 */
export function BeltLadder({ belts }: { belts: JdcBelt[] }) {
  return (
    <div className="grid grid-cols-7 gap-px bg-wire/40" data-testid="belt-ladder">
      {belts.map((belt) => {
        const { swatch } = beltColour(belt.name)
        return (
          <div
            key={belt.name}
            className="flex flex-col items-center gap-1.5 bg-bed px-0.5 py-2.5"
            data-testid={`belt-${belt.name.toLowerCase()}`}
            data-earned={belt.earned}
            data-current={belt.current}
          >
            <span
              className={cn(
                "h-6 w-full ring-1 ring-inset ring-wire/40",
                belt.earned ? "opacity-100" : "opacity-25",
                belt.current && "ring-2 ring-chalk"
              )}
              style={{ backgroundColor: swatch }}
              aria-hidden
            />
            <span
              className={cn(
                "font-mono text-[9px] uppercase tracking-wider",
                belt.earned ? "text-chalk" : "text-tung"
              )}
            >
              {belt.name}
            </span>
            <span className="font-mono text-[9px] text-tung">
              {belt.earnedAt
                ? new Date(belt.earnedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })
                : belt.min}
            </span>
          </div>
        )
      })}
    </div>
  )
}
