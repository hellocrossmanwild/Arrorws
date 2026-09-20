import { http, HttpResponse } from "msw"
import type { Game, JdcAttempt } from "@/lib/types"
import { jdcReport } from "@/lib/practice"
import { buildJdcSummary } from "@/lib/jdc/summary"
import { store } from "../data/store"
import { getGameDarts } from "./helpers"

/** The mock twin of lib/server/jdc.ts — same derivation, same shape. */
function summary() {
  const games = store.games
    .list()
    .filter((g) => g.mode === "jdc-challenge" && g.endedAt && !g.abandoned) as Game[]

  const programmeGameIds = new Set(
    store.trainingSessions
      .list()
      .flatMap((s) => s.blockGameIds.filter((id): id is string => id !== null))
  )

  const cumulatives: Record<string, number[]> = {}
  const attempts = games.map((game): JdcAttempt => {
    const report = jdcReport(getGameDarts(game.id))
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

export const jdcHandlers = [http.get("/api/jdc", () => HttpResponse.json(summary()))]
