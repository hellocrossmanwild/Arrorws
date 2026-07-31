import { http, HttpResponse } from "msw"
import type { Game, ResultMetrics, TrainingSession } from "@/lib/types"
import { FOUNDATION, sessionTemplate, weekOf } from "@/lib/training/program"
import { buildTrainingSummary } from "@/lib/training/summary"
import { store } from "../data/store"

function error(status: number, message: string) {
  return HttpResponse.json({ message }, { status })
}

function jdcScores() {
  const games = store.games
    .list()
    .filter((g) => g.mode === "jdc-challenge" && g.endedAt && !g.abandoned) as Game[]
  return games.flatMap((game) => {
    const result = store.results.list({ gameId: game.id } as { gameId: string })[0]
    const score = (result?.metrics as ResultMetrics | undefined)?.gameScore
    return score === null || score === undefined ? [] : [{ date: game.endedAt!, score }]
  })
}

function summary() {
  return buildTrainingSummary(store.trainingSessions.list(), jdcScores(), Date.now())
}

export const trainingHandlers = [
  http.get("/api/training", () => HttpResponse.json(summary())),

  http.get("/api/training/sessions/:id", ({ params }) => {
    const session = store.trainingSessions.get(params.id as string)
    if (!session) return error(404, "Training session not found")
    return HttpResponse.json({ session, template: sessionTemplate(session.sessionIndex) })
  }),

  http.post("/api/training/sessions", () => {
    const current = summary()
    if (current.active) {
      return HttpResponse.json(
        { session: current.active, template: sessionTemplate(current.active.sessionIndex) },
        { status: 200 }
      )
    }
    if (current.programComplete || !current.nextSession) {
      return error(409, "The programme is complete")
    }
    const index = current.nextSession.index
    const template = sessionTemplate(index)
    const session = store.trainingSessions.create({
      programId: FOUNDATION.id,
      sessionIndex: index,
      week: weekOf(index),
      kind: template.kind,
      startedAt: new Date().toISOString(),
      completedAt: null,
      blockGameIds: template.blocks.map(() => null),
    } as Omit<TrainingSession, "id">)
    return HttpResponse.json({ session, template }, { status: 201 })
  }),

  http.patch("/api/training/sessions/:id", async ({ params, request }) => {
    const session = store.trainingSessions.get(params.id as string)
    if (!session) return error(404, "Training session not found")
    if (session.completedAt) return error(409, "The session is already complete")
    const body = (await request.json()) as { blockIndex: number; gameId: string | null }
    if (
      typeof body.blockIndex !== "number" ||
      body.blockIndex < 0 ||
      body.blockIndex >= session.blockGameIds.length
    ) {
      return error(400, "Bad blockIndex")
    }
    const blockGameIds = [...session.blockGameIds]
    blockGameIds[body.blockIndex] = body.gameId ?? "skipped"
    const completedAt = blockGameIds.every((g) => g !== null)
      ? new Date().toISOString()
      : null
    store.trainingSessions.update(session.id, { blockGameIds, completedAt })
    const updated = store.trainingSessions.get(session.id)!
    return HttpResponse.json({
      session: updated,
      template: sessionTemplate(updated.sessionIndex),
    })
  }),
]
