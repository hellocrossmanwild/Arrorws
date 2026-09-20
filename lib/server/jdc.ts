import { asc, eq, inArray } from "drizzle-orm"
import { getDb, tables } from "@/lib/db"
import type { Dart, Game, JdcAttempt, JdcSummary, TrainingSession } from "@/lib/types"
import { jdcReport } from "@/lib/practice"
import { buildJdcSummary } from "@/lib/jdc/summary"

/**
 * The JDC Challenge record (spec 0011). Every figure is derived by
 * replaying each attempt's dart log through the engine — the cached
 * `results.metrics.gameScore` is deliberately not read here, so a change
 * to the scoring rules re-scores history rather than leaving it stranded
 * on the old scale (ADR 0003).
 */
export async function jdcSummary(): Promise<JdcSummary> {
  const db = getDb()

  const games = (await db.select().from(tables.games)).filter(
    (g) => g.mode === "jdc-challenge" && g.endedAt && !g.abandoned
  ) as Game[]
  if (games.length === 0) return buildJdcSummary([])

  const gameIds = games.map((g) => g.id)
  const dartRows = await db
    .select({ dart: tables.darts, gameId: tables.legs.gameId })
    .from(tables.darts)
    .innerJoin(tables.visits, eq(tables.darts.visitId, tables.visits.id))
    .innerJoin(tables.legs, eq(tables.visits.legId, tables.legs.id))
    .where(inArray(tables.legs.gameId, gameIds))
    .orderBy(asc(tables.darts.seq))

  const byGame = new Map<string, Dart[]>()
  for (const row of dartRows) {
    const { seq: _seq, ...dart } = row.dart
    const list = byGame.get(row.gameId) ?? []
    list.push(dart as Dart)
    byGame.set(row.gameId, list)
  }

  const sessions = (await db.select().from(tables.trainingSessions)) as TrainingSession[]
  const programmeGameIds = new Set(
    sessions.flatMap((s) => s.blockGameIds.filter((id): id is string => id !== null))
  )

  const cumulatives: Record<string, number[]> = {}
  const attempts = games.map((game): JdcAttempt => {
    const report = jdcReport(byGame.get(game.id) ?? [])
    cumulatives[game.id] = report.cumulative
    return {
      gameId: game.id,
      endedAt: game.endedAt!,
      score: report.score,
      grade: report.grade,
      parts: report.parts,
      shanghais: report.shanghais,
      doublesHit: report.doublesHit,
      fromProgramme: programmeGameIds.has(game.id),
    }
  })

  return buildJdcSummary(attempts, cumulatives)
}
