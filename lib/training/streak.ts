/**
 * Weekly cadence maths. Pure — time arrives as an argument. Weeks are
 * Monday-based, anchored to Monday 1 January 2024 UTC.
 */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MONDAY_EPOCH = Date.UTC(2024, 0, 1)

export function weekIndexOf(timestampMs: number): number {
  return Math.floor((timestampMs - MONDAY_EPOCH) / WEEK_MS)
}

/** Completed sessions falling in the same week as `nowMs`. */
export function sessionsInWeek(completedAtMs: number[], nowMs: number): number {
  const week = weekIndexOf(nowMs)
  return completedAtMs.filter((t) => weekIndexOf(t) === week).length
}

/**
 * Consecutive weeks meeting the weekly target, ending at the current week
 * (counted only once it has met the target) or the week before it. A gap
 * week breaks the streak.
 */
export function weekStreak(completedAtMs: number[], target: number, nowMs: number): number {
  const counts = new Map<number, number>()
  for (const t of completedAtMs) {
    const w = weekIndexOf(t)
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  const current = weekIndexOf(nowMs)
  let streak = 0
  let week = (counts.get(current) ?? 0) >= target ? current : current - 1
  while ((counts.get(week) ?? 0) >= target) {
    streak += 1
    week -= 1
  }
  return streak
}
