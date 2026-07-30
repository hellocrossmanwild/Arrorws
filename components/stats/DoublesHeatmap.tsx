import { cn } from "@/lib/utils/cn"

export interface HeatmapCell {
  segment: number
  attempts: number
  hits: number
  rate: number | null
}

/**
 * The signature screen of the product. Cells arrive in board order —
 * 20, 1, 18, 4 ... 5, then bull — because a player's mental model of the
 * board is spatial. The colour ramp is single hue: red-to-green reads as
 * good/bad and fails for the eight per cent of men with a colour vision
 * deficiency. Cells under five attempts say "not enough data" rather than
 * lying about a small sample.
 */
export function DoublesHeatmap({ cells }: { cells: HeatmapCell[] }) {
  return (
    <div className="grid grid-cols-3 gap-px bg-wire/40" data-testid="doubles-heatmap">
      {cells.map((cell) => {
        const label = cell.segment === 25 ? "BULL" : `D${cell.segment}`
        const hasData = cell.rate !== null
        // Single-hue ramp on the brass wire colour: opacity encodes rate.
        const intensity = hasData ? 0.15 + (cell.rate! / 100) * 0.85 : 0
        return (
          <div
            key={cell.segment}
            className={cn("relative px-2 py-2.5", hasData ? "" : "bg-bed")}
            style={hasData ? { backgroundColor: `rgba(176, 141, 87, ${intensity})` } : undefined}
            data-testid={`heatmap-${label}`}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-sm font-semibold text-chalk">{label}</span>
              <span className="font-display text-base text-chalk">
                {hasData ? `${Math.round(cell.rate!)}%` : "–"}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-chalk/70">
              {cell.attempts === 0
                ? "No attempts"
                : hasData
                  ? `${cell.hits} of ${cell.attempts}`
                  : `${cell.attempts} thrown · not enough data`}
            </p>
          </div>
        )
      })}
    </div>
  )
}
