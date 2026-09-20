import type { JdcAttempt } from "@/lib/types"
import { JDC_GRADES } from "@/lib/practice"
import { beltColour, CHART_CEILING } from "@/lib/jdc/belts"
import { cn } from "@/lib/utils/cn"

/**
 * Every attempt as a bar, with the belt thresholds ruled behind it. Bars,
 * not a line: attempts are discrete events a fortnight apart, not a
 * continuous series. Programme assessments carry a tick under the bar.
 *
 * Hand-rolled — a charting dependency for one bar chart is not worth the
 * weight (spec 0011, ADR 0002).
 */
export function TrendChart({ attempts }: { attempts: JdcAttempt[] }) {
  const ceiling = Math.max(CHART_CEILING, ...attempts.map((a) => a.score))
  const pct = (score: number) => `${(score / ceiling) * 100}%`

  return (
    <div data-testid="jdc-trend">
      <div className="flex bg-bed">
        {/* the belt scale, in its own gutter so no bar can cover it */}
        <div className="relative h-40 w-12 shrink-0 border-r border-wire/20">
          {JDC_GRADES.filter((g) => g.min > 0).map((grade) => (
            <span
              key={grade.name}
              className="absolute right-1.5 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider text-tung"
              style={{ bottom: pct(grade.min) }}
            >
              {grade.name}
            </span>
          ))}
        </div>

        <div className="relative h-40 flex-1">
          {JDC_GRADES.filter((g) => g.min > 0).map((grade) => (
            <span
              key={grade.name}
              className="absolute inset-x-0 border-t border-dashed border-wire/25"
              style={{ bottom: pct(grade.min) }}
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-1 px-2">
            {attempts.map((attempt) => (
              <span
                key={attempt.gameId}
                className="flex-1"
                style={{
                  height: pct(attempt.score),
                  backgroundColor: beltColour(attempt.grade).swatch,
                }}
                title={`${attempt.score} pts · ${attempt.grade}`}
                data-testid="jdc-trend-bar"
                data-score={attempt.score}
              />
            ))}
          </div>
        </div>
      </div>

      {/* assessment ticks, aligned under their bars */}
      <div className="flex">
        <span className="w-12 shrink-0" />
        <div className="flex flex-1 gap-1 px-2 pt-1">
          {attempts.map((attempt) => (
            <span
              key={attempt.gameId}
              className={cn("h-1 flex-1", attempt.fromProgramme ? "bg-wire" : "bg-transparent")}
              title={attempt.fromProgramme ? "Programme assessment" : "Off-programme attempt"}
            />
          ))}
        </div>
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-tung">
        Every attempt, oldest first. A brass tick marks a programme assessment.
      </p>
    </div>
  )
}
