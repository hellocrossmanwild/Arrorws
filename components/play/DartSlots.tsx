import type { Dart } from "@/lib/types"
import { labelOf } from "@/lib/scoring"
import { cn } from "@/lib/utils/cn"

/** Three slots that fill as darts land, coloured by ring: red doubles, green trebles. */
export function DartSlots({ darts }: { darts: Dart[] }) {
  return (
    <div className="grid grid-cols-3 gap-px bg-wire/60" data-testid="dart-slots">
      {[0, 1, 2].map((i) => {
        const dart = darts[i]
        return (
          <div
            key={i}
            className={cn(
              "grid h-10 place-items-center font-mono text-base",
              !dart && "bg-bed text-tung",
              dart && dart.ring === "D" && "bg-dbl text-chalk",
              dart && dart.ring === "T" && "bg-trb text-chalk",
              dart && dart.ring !== "D" && dart.ring !== "T" && "bg-bed text-chalk"
            )}
            data-testid={`dart-slot-${i}`}
          >
            {dart ? labelOf({ segment: dart.segment, ring: dart.ring }) : ""}
          </div>
        )
      })}
    </div>
  )
}
