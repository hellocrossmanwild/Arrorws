import type { JdcAttempt } from "@/lib/types"
import { PART_NAMES } from "@/lib/practice"

/**
 * Where the score actually came from. Three rows, the latest attempt
 * against the best ever banked in that part — the figure that moves
 * between belt jumps, which are 150 points apart (spec 0011).
 *
 * The bars scale against the personal best, not the theoretical maximum:
 * a part maxes at 1,050 with a shanghai on every number, so scaling to it
 * would leave every real bar a stub. Against the best, a full bar means
 * "you have just equalled it", which is the thing worth seeing.
 */
export function PartBars({
  latest,
  partBests,
  partMaximums,
}: {
  latest: JdcAttempt
  partBests: [number, number, number]
  partMaximums: [number, number, number]
}) {
  return (
    <div className="flex flex-col gap-px bg-wire/40" data-testid="jdc-parts">
      {PART_NAMES.map((name, i) => {
        const points = latest.parts[i]
        const best = partBests[i]
        const scale = Math.max(best, points, 1)
        return (
          <div key={name} className="bg-bed px-4 py-3" data-testid={`jdc-part-${i}`}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm">
                <span className="font-mono text-[10px] text-tung">Part {i + 1}</span>{" "}
                {name}
              </span>
              <span className="font-mono text-xs text-tung">
                <span className="text-base text-chalk">{points}</span>
                {" / "}
                {best} best
                <span className="ml-1 text-tung/60">of {partMaximums[i]}</span>
              </span>
            </div>
            <div className="relative mt-2 h-1.5 bg-slate2">
              {/* the best ever, as a ghost behind the latest */}
              <span
                className="absolute inset-y-0 left-0 bg-wire/30"
                style={{ width: `${(best / scale) * 100}%` }}
              />
              <span
                className="absolute inset-y-0 left-0 bg-wire"
                style={{ width: `${(points / scale) * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
