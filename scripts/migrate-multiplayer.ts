/**
 * Schema migration for player profiles (spec 0012).
 *
 * `training_sessions` gains a `player_id`: each player walks their own
 * Foundation queue. Existing rows belong to whoever was using the app
 * before profiles existed, which is `player-tom`.
 *
 * Nothing else needs migrating. Games, legs, visits, darts, sessions and
 * results have always carried their player — the app simply never asked
 * which one it wanted (ADR 0009).
 *
 * Run once per environment, against the UNPOOLED connection string (DDL is
 * blocked on the pooler — see docs/environment-setup.md):
 *
 *   DATABASE_URL="<unpooled-url>" pnpm tsx scripts/migrate-multiplayer.ts
 *
 * It is safe to run twice: the column add is IF NOT EXISTS and the backfill
 * only touches rows that are still empty.
 */
import { sql } from "drizzle-orm"
import { getDb } from "../lib/db"

const FALLBACK_PLAYER = "player-tom"

async function main() {
  const db = getDb()

  console.log("Adding training_sessions.player_id…")
  await db.execute(
    sql`ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS player_id text`
  )

  console.log(`Backfilling existing rows to ${FALLBACK_PLAYER}…`)
  const backfilled = await db.execute(
    sql`UPDATE training_sessions SET player_id = ${FALLBACK_PLAYER} WHERE player_id IS NULL`
  )
  console.log(`  ${backfilled.rowCount ?? 0} row(s) updated`)

  // Only now can it be NOT NULL: the backfill has to land first.
  console.log("Marking it NOT NULL…")
  await db.execute(sql`ALTER TABLE training_sessions ALTER COLUMN player_id SET NOT NULL`)

  console.log("Done. Every training session now belongs to a player.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
