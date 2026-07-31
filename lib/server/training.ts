import { asc, eq } from "drizzle-orm"
import { randomUUID } from "crypto"
import { getDb, tables } from "@/lib/db"
import type { Game, ResultMetrics, TrainingSession } from "@/lib/types"
import { FOUNDATION, sessionTemplate, weekOf } from "@/lib/training/program"
import { buildTrainingSummary, type TrainingSummary } from "@/lib/training/summary"
import { HttpError } from "./errors"

async function jdcScores(db: ReturnType<typeof getDb>) {
  const games = (await db.select().from(tables.games)).filter(
    (g) => g.mode === "jdc-challenge" && g.endedAt && !g.abandoned
  ) as Game[]
  if (games.length === 0) return []
  const results = await db.select().from(tables.results)
  return games.flatMap((game) => {
    const result = results.find((r) => r.gameId === game.id)
    const score = (result?.metrics as ResultMetrics | undefined)?.gameScore
    return score === null || score === undefined ? [] : [{ date: game.endedAt!, score }]
  })
}

async function loadSessions(db: ReturnType<typeof getDb>): Promise<TrainingSession[]> {
  return (await db
    .select()
    .from(tables.trainingSessions)
    .orderBy(asc(tables.trainingSessions.sessionIndex))) as TrainingSession[]
}

export async function trainingSummary(): Promise<TrainingSummary> {
  const db = getDb()
  return buildTrainingSummary(await loadSessions(db), await jdcScores(db), Date.now())
}

export async function getTrainingSession(id: string) {
  const db = getDb()
  const rows = await db
    .select()
    .from(tables.trainingSessions)
    .where(eq(tables.trainingSessions.id, id))
  if (rows.length === 0) throw new HttpError(404, "Training session not found")
  const session = rows[0] as TrainingSession
  return { session, template: sessionTemplate(session.sessionIndex) }
}

export async function startTrainingSession() {
  const db = getDb()
  const current = buildTrainingSummary(await loadSessions(db), [], Date.now())
  if (current.active) {
    return {
      session: current.active,
      template: sessionTemplate(current.active.sessionIndex),
      created: false,
    }
  }
  if (current.programComplete || !current.nextSession) {
    throw new HttpError(409, "The programme is complete")
  }
  const index = current.nextSession.index
  const template = sessionTemplate(index)
  const session: TrainingSession = {
    id: `training-${randomUUID()}`,
    programId: FOUNDATION.id,
    sessionIndex: index,
    week: weekOf(index),
    kind: template.kind,
    startedAt: new Date().toISOString(),
    completedAt: null,
    blockGameIds: template.blocks.map(() => null),
  }
  await db.insert(tables.trainingSessions).values(session)
  return { session, template, created: true }
}

export async function recordTrainingBlock(
  id: string,
  blockIndex: number,
  gameId: string | null
) {
  const db = getDb()
  const { session } = await getTrainingSession(id)
  if (session.completedAt) throw new HttpError(409, "The session is already complete")
  if (
    typeof blockIndex !== "number" ||
    blockIndex < 0 ||
    blockIndex >= session.blockGameIds.length
  ) {
    throw new HttpError(400, "Bad blockIndex")
  }
  const blockGameIds = [...session.blockGameIds]
  blockGameIds[blockIndex] = gameId ?? "skipped"
  const completedAt = blockGameIds.every((g) => g !== null) ? new Date().toISOString() : null
  await db
    .update(tables.trainingSessions)
    .set({ blockGameIds, completedAt })
    .where(eq(tables.trainingSessions.id, id))
  return getTrainingSession(id)
}
