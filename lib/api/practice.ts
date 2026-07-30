import type { PracticeGameDefinition, PracticeGameKey } from "@/lib/types"
import { apiClient } from "./client"

export interface PracticeGamesResponse {
  definitions: PracticeGameDefinition[]
  personalBests: Record<PracticeGameKey, { score: number; achievedAt: string } | null>
}

export async function getPracticeGames(playerId?: string): Promise<PracticeGamesResponse> {
  const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : ""
  return apiClient(`/api/practice-games${query}`)
}
