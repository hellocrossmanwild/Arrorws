import { http, HttpResponse } from "msw"
import type { Game, JdcAttempt, Player } from "@/lib/types"
import { jdcReport } from "@/lib/practice"
import { buildFamilyBoard, buildJdcSummary } from "@/lib/jdc/summary"
import { store } from "../data/store"
import { getGameDarts } from "./helpers"

/** The mock twin of lib/server/jdc.ts — same derivation, same shape. */
function summary(playerId: string) {
  const games = store.games
    .list()
    .filter((g) => g.mode === "jdc-challenge" && g.endedAt && !g.abandoned) as Game[]
  const players = (store.players.list() as Player[]).filter((p) => !p.isBot)

  const programmeGameIds = new Set(
    store.trainingSessions
      .list()
      .flatMap((s) => s.blockGameIds.filter((id): id is string => id !== null))
  )

  const cumulatives: Record<string, number[]> = {}
  const all: Array<JdcAttempt & { thrownBy: string }> = games.map((game) => {
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
      thrownBy: game.participantPlayerIds[0] ?? "",
    }
  })

  const mine = all.filter((a) => a.thrownBy === playerId)
  return {
    ...buildJdcSummary(mine, cumulatives),
    playerId,
    family: buildFamilyBoard(players, all),
  }
}

export const jdcHandlers = [
  http.get("/api/jdc", ({ request }) => {
    const playerId = new URL(request.url).searchParams.get("playerId") ?? "player-tom"
    return HttpResponse.json(summary(playerId))
  }),
]
