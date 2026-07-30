import { http, HttpResponse } from "msw"
import type { Dart, DartInput, Game, GameMode, PracticeConfig, Ring } from "@/lib/types"
import { annotateGame, isLegalSegment, scoreOf } from "@/lib/scoring"
import { dartTargetFor, derivePracticeState, isPracticeKey } from "@/lib/practice"
import type { PracticeGameKey } from "@/lib/types"
import { store } from "../data/store"
import {
  buildGameState,
  deriveConfigFor,
  ensureSession,
  finaliseGame,
  getGameDarts,
} from "./helpers"

function error(status: number, message: string) {
  return HttpResponse.json({ message }, { status })
}

/** Keep stored visit bust flags and leg winners in sync with the dart log. */
function reconcileGame(game: Game): void {
  if (isPracticeKey(game.mode)) return
  const darts = getGameDarts(game.id)
  const annotated = annotateGame(darts, deriveConfigFor(game))
  for (const leg of annotated) {
    const legRow = store.legs
      .list({ gameId: game.id } as { gameId: string })
      .find((l) => l.index === leg.index)
    if (legRow && legRow.winnerPlayerId !== leg.winnerPlayerId) {
      store.legs.update(legRow.id, { winnerPlayerId: leg.winnerPlayerId })
    }
  }
}

export const gameHandlers = [
  http.post("/api/games", async ({ request }) => {
    const body = (await request.json()) as {
      mode: GameMode
      config: Record<string, unknown>
      participantPlayerIds: string[]
    }
    if (!body.participantPlayerIds?.length) {
      return error(400, "participantPlayerIds is required")
    }
    for (const id of body.participantPlayerIds) {
      if (!store.players.get(id)) return error(400, `Unknown player ${id}`)
    }
    const human = body.participantPlayerIds.find((id) => !store.players.get(id)?.isBot)
    const sessionId = ensureSession(human ?? body.participantPlayerIds[0])

    const config = { ...body.config }
    if (isPracticeKey(body.mode) && typeof config.rngSeed !== "number") {
      // Persisted so the replay of a random drill is reproducible.
      config.rngSeed = Math.floor(Math.random() * 2 ** 31)
    }

    const game = store.games.create({
      sessionId,
      mode: body.mode,
      config,
      participantPlayerIds: body.participantPlayerIds,
      startedAt: new Date().toISOString(),
      endedAt: null,
      abandoned: false,
    })
    store.legs.create({
      gameId: game.id,
      index: 0,
      startingScore: body.mode === "x01" ? ((config.startingScore as number) ?? 501) : body.mode === "bobs-27" ? 27 : null,
      startingPlayerId: body.participantPlayerIds[0],
      winnerPlayerId: null,
    })
    return HttpResponse.json({ game, gameState: buildGameState(game) }, { status: 201 })
  }),

  http.get("/api/games/:gameId", ({ params }) => {
    const game = store.games.get(params.gameId as string)
    if (!game) return error(404, "Game not found")
    const darts = getGameDarts(game.id)
    const players = game.participantPlayerIds.map((id) => store.players.get(id))
    const botProfiles = players
      .filter((p) => p?.isBot)
      .map((p) => store.botProfiles.get(p!.botProfileId!))
    return HttpResponse.json({
      game,
      darts,
      gameState: buildGameState(game, darts),
      players,
      botProfiles,
    })
  }),

  http.post("/api/games/:gameId/darts", async ({ params, request }) => {
    const game = store.games.get(params.gameId as string)
    if (!game) return error(404, "Game not found")
    if (game.endedAt) return error(409, "The game is already complete")

    const body = (await request.json()) as DartInput
    if (!isLegalSegment(body.segment, body.ring)) {
      return error(400, `Illegal segment ${body.segment} ${body.ring}`)
    }

    const darts = getGameDarts(game.id)
    const preState = buildGameState(game, darts)
    if (preState.gameComplete) return error(409, "The game is already complete")

    // Locate or create the visit this dart belongs to.
    let visitId: string
    let dartIndex: 0 | 1 | 2
    let target = { targetSegment: body.targetSegment, targetRing: body.targetRing }

    if (isPracticeKey(game.mode)) {
      const practice = derivePracticeState(
        darts,
        game.mode as PracticeGameKey,
        game.config as PracticeConfig
      )
      // The server owns practice targets: exact, from the engine.
      target = dartTargetFor(practice)
      const legRow = store.legs.list({ gameId: game.id } as { gameId: string })[0]
      if (darts.length % 3 === 0) {
        visitId = store.visits.create({
          legId: legRow.id,
          playerId: game.participantPlayerIds[0],
          index: darts.length / 3,
          bust: false,
        }).id
      } else {
        visitId = darts[darts.length - 1].visitId
      }
      dartIndex = (darts.length % 3) as 0 | 1 | 2
    } else {
      const legIndex = preState.legComplete ? preState.legIndex + 1 : preState.legIndex
      const legRows = store.legs.list({ gameId: game.id } as { gameId: string })
      let legRow = legRows.find((l) => l.index === legIndex)
      if (!legRow) {
        const cfg = deriveConfigFor(game)
        legRow = store.legs.create({
          gameId: game.id,
          index: legIndex,
          startingScore: cfg.startingScore,
          startingPlayerId: cfg.players[legIndex % cfg.players.length],
          winnerPlayerId: null,
        })
      }
      if (!preState.legComplete && preState.currentVisit.length > 0) {
        visitId = preState.currentVisit[0].visitId
        dartIndex = preState.currentVisit.length as 0 | 1 | 2
      } else {
        const playerId = preState.legComplete
          ? deriveConfigFor(game).players[legIndex % game.participantPlayerIds.length]
          : preState.currentPlayerId
        const priorVisits = store.visits
          .list({ legId: legRow.id } as { legId: string })
          .filter((v) => v.playerId === playerId).length
        visitId = store.visits.create({
          legId: legRow.id,
          playerId,
          index: priorVisits,
          bust: false,
        }).id
        dartIndex = 0
      }
    }

    const dart: Dart = store.darts.create({
      visitId,
      index: dartIndex,
      segment: body.segment,
      ring: body.ring as Ring,
      score: scoreOf({ segment: body.segment, ring: body.ring }),
      targetSegment: target.targetSegment,
      targetRing: target.targetRing,
      thrownAt: new Date().toISOString(),
      latencyMs: body.latencyMs ?? null,
    })

    const newDarts = [...darts, dart]
    const state = buildGameState(game, newDarts)

    // Bust bookkeeping on the stored visit row.
    if (state.lastVisit?.bust && state.lastVisit.darts.some((d) => d.id === dart.id)) {
      store.visits.update(visitId, { bust: true })
    }
    reconcileGame(game)
    if (state.gameComplete) finaliseGame(game, newDarts, state)

    return HttpResponse.json({ dart, gameState: state }, { status: 201 })
  }),

  http.delete("/api/games/:gameId/darts/last", ({ params }) => {
    const game = store.games.get(params.gameId as string)
    if (!game) return error(404, "Game not found")
    if (game.endedAt) return error(409, "The game has ended")
    const darts = getGameDarts(game.id)
    if (darts.length === 0) return error(409, "No darts to undo")

    const last = darts[darts.length - 1]
    store.darts.delete(last.id)
    // Tidy an emptied visit, and any emptied tail leg beyond the first.
    const remainingInVisit = store.darts.list().filter((d) => d.visitId === last.visitId)
    if (remainingInVisit.length === 0) {
      const visit = store.visits.get(last.visitId)
      store.visits.delete(last.visitId)
      if (visit) {
        const legVisits = store.visits.list({ legId: visit.legId } as { legId: string })
        const leg = store.legs.get(visit.legId)
        if (legVisits.length === 0 && leg && leg.index > 0) store.legs.delete(visit.legId)
      }
    } else {
      // The undone dart may have been the one that busted the visit.
      store.visits.update(last.visitId, { bust: false })
    }
    reconcileGame(game)
    return HttpResponse.json({ gameState: buildGameState(game) })
  }),

  http.post("/api/games/:gameId/legs", ({ params }) => {
    const game = store.games.get(params.gameId as string)
    if (!game) return error(404, "Game not found")
    if (game.endedAt) return error(409, "The game is already complete")
    const cfg = deriveConfigFor(game)
    const legRows = store.legs.list({ gameId: game.id } as { gameId: string })
    const index = legRows.length
    const leg = store.legs.create({
      gameId: game.id,
      index,
      startingScore: cfg.startingScore,
      startingPlayerId: cfg.players[index % cfg.players.length],
      winnerPlayerId: null,
    })
    return HttpResponse.json({ leg, gameState: buildGameState(game) }, { status: 201 })
  }),

  http.post("/api/games/:gameId/abandon", ({ params }) => {
    const game = store.games.get(params.gameId as string)
    if (!game) return error(404, "Game not found")
    if (game.endedAt) return error(409, "The game is already complete")
    store.games.update(game.id, { abandoned: true })
    return HttpResponse.json({ ok: true })
  }),

  http.get("/api/bot-profiles", () => {
    return HttpResponse.json({ profiles: store.botProfiles.list() })
  }),

  http.get("/api/players", () => {
    return HttpResponse.json({ players: store.players.list() })
  }),
]
