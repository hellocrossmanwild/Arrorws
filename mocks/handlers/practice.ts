import { http, HttpResponse } from "msw"
import type { PracticeGameKey } from "@/lib/types"
import { store } from "../data/store"

export const practiceHandlers = [
  http.get("/api/practice-games", ({ request }) => {
    const url = new URL(request.url)
    const playerId = url.searchParams.get("playerId") ?? "player-tom"
    const definitions = store.practiceGameDefinitions.list()

    const personalBests: Record<string, { score: number; achievedAt: string } | null> = {}
    for (const def of definitions) {
      const gamesForKey = store.games
        .list()
        .filter((g) => g.mode === def.key && g.endedAt && !g.abandoned)
      let best: { score: number; achievedAt: string } | null = null
      for (const game of gamesForKey) {
        const result = store.results
          .list({ gameId: game.id } as { gameId: string })
          .find((r) => r.playerId === playerId)
        const score = result?.metrics.gameScore
        if (score === null || score === undefined) continue
        const better =
          best === null ||
          (def.personalBestDirection === "lower-is-better"
            ? score < best.score
            : score > best.score)
        if (better) best = { score, achievedAt: game.endedAt! }
      }
      personalBests[def.key as PracticeGameKey] = best
    }

    return HttpResponse.json({
      definitions: definitions.map(({ id: _id, ...def }) => def),
      personalBests,
    })
  }),
]
