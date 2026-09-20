import type { JdcAttempt, JdcBelt, JdcSummary } from "@/lib/types"
import { JDC_GRADES, PART_MAXIMUMS, gradeForJdcScore, nextGrade } from "@/lib/practice"

/**
 * The `/jdc` view model (spec 0011). Pure: attempts in, screen state out.
 * Both the MSW handler and the server service call this with their own rows.
 *
 * The belt follows the best attempt ever thrown, not the latest — a grade is
 * something you reached, and one bad night does not take it back off you.
 * Every attempt still appears in the trend, programme assessment or not.
 */
export function buildJdcSummary(
  attempts: JdcAttempt[],
  /** Running score by dart index, keyed by game id. Only the best is used. */
  cumulatives: Record<string, number[]> = {}
): JdcSummary {
  const ordered = [...attempts].sort((a, b) => (a.endedAt < b.endedAt ? -1 : 1))

  const best = ordered.reduce<JdcAttempt | null>(
    (acc, a) => (acc === null || a.score > acc.score ? a : acc),
    null
  )
  const latest = ordered.length > 0 ? ordered[ordered.length - 1] : null
  const previous = ordered.length > 1 ? ordered[ordered.length - 2] : null

  const belts = beltLadder(ordered, best)

  return {
    attempts: ordered,
    best,
    latest,
    latestDelta: latest && previous ? latest.score - previous.score : null,
    belts,
    belt: belts.find((b) => b.current) ?? null,
    nextBelt: best ? nextGrade(best.score) : nextGrade(0),
    partBests: [0, 1, 2].map((i) =>
      ordered.reduce((max, a) => Math.max(max, a.parts[i]), 0)
    ) as [number, number, number],
    partMaximums: PART_MAXIMUMS,
    bestCumulative: best ? (cumulatives[best.gameId] ?? null) : null,
  }
}

/**
 * The seven belts, each marked earned at the date it was *first* reached.
 * Attempts arrive in date order, so the first attempt clearing a threshold
 * is the one that earned it.
 */
function beltLadder(ordered: JdcAttempt[], best: JdcAttempt | null): JdcBelt[] {
  const held = best ? gradeForJdcScore(best.score) : null
  return JDC_GRADES.map((grade) => {
    const first = ordered.find((a) => a.score >= grade.min) ?? null
    return {
      name: grade.name,
      min: grade.min,
      earned: first !== null,
      earnedAt: first?.endedAt ?? null,
      current: grade.name === held,
    }
  })
}
