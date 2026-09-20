/**
 * One-shot backfill for the JDC scoring correction (spec 0011, slice A).
 *
 * `results.metrics.gameScore` is a cached projection written once when a
 * game ends. Attempts completed before the shanghai bonus was corrected
 * carry a score from the old scale, which would mix two scales in any view
 * that reads the cache (`/history`, practice personal bests).
 *
 * The dart log is untouched and authoritative (ADR 0003), so every attempt
 * re-scores exactly. `/jdc` derives from darts and never needed this; this
 * script exists for the cache.
 *
 * Run once against each environment: pnpm tsx scripts/backfill-jdc.ts
 */
import { asc, eq, inArray } from "drizzle-orm"
import { getDb, tables } from "../lib/db"
import type { Dart, Game, ResultMetrics } from "../lib/types"
import { jdcReport } from "../lib/practice"

async function main() {
  const db = getDb()

  const games = (await db.select().from(tables.games)).filter(
    (g) => g.mode === "jdc-challenge"
  ) as Game[]
  if (games.length === 0) {
    console.log("No JDC attempts recorded. Nothing to backfill.")
    return
  }

  const dartRows = await db
    .select({ dart: tables.darts, gameId: tables.legs.gameId })
    .from(tables.darts)
    .innerJoin(tables.visits, eq(tables.darts.visitId, tables.visits.id))
    .innerJoin(tables.legs, eq(tables.visits.legId, tables.legs.id))
    .where(inArray(tables.legs.gameId, games.map((g) => g.id)))
    .orderBy(asc(tables.darts.seq))

  const byGame = new Map<string, Dart[]>()
  for (const row of dartRows) {
    const { seq: _seq, ...dart } = row.dart
    byGame.set(row.gameId, [...(byGame.get(row.gameId) ?? []), dart as Dart])
  }

  const results = await db.select().from(tables.results)
  let changed = 0

  for (const game of games) {
    const report = jdcReport(byGame.get(game.id) ?? [])
    for (const row of results.filter((r) => r.gameId === game.id)) {
      const metrics = row.metrics as ResultMetrics
      const corrected = report.complete ? report.score : null
      if (metrics.gameScore === corrected) continue
      await db
        .update(tables.results)
        .set({ metrics: { ...metrics, gameScore: corrected } })
        .where(eq(tables.results.id, row.id))
      console.log(`  ${game.id}: ${metrics.gameScore} -> ${corrected}`)
      changed += 1
    }
  }

  console.log(
    changed === 0
      ? `Checked ${games.length} attempts. Every cached score was already correct.`
      : `Rescored ${changed} of ${games.length} attempts.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
