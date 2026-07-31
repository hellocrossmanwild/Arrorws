import type {
  BotProfile,
  Dart,
  DartInput,
  Game,
  GameConfig,
  GameMode,
  GameState,
  Leg,
  Player,
} from "@/lib/types"
import { apiClient } from "./client"

export interface GameResponse {
  game: Game
  darts: Dart[]
  gameState: GameState
  players: Player[]
  botProfiles: BotProfile[]
}

export async function createGame(
  mode: GameMode,
  config: GameConfig,
  participantPlayerIds: string[]
): Promise<{ game: Game; gameState: GameState }> {
  return apiClient("/api/games", {
    method: "POST",
    body: JSON.stringify({ mode, config, participantPlayerIds }),
  })
}

export async function getGame(gameId: string): Promise<GameResponse> {
  return apiClient(`/api/games/${gameId}`)
}

export async function throwDart(
  gameId: string,
  dart: DartInput
): Promise<{ dart: Dart; gameState: GameState }> {
  return apiClient(`/api/games/${gameId}/darts`, {
    method: "POST",
    body: JSON.stringify(dart),
  })
}

export async function undoDart(gameId: string): Promise<{ gameState: GameState }> {
  return apiClient(`/api/games/${gameId}/darts/last`, { method: "DELETE" })
}

export async function startNextLeg(
  gameId: string
): Promise<{ leg: Leg; gameState: GameState }> {
  return apiClient(`/api/games/${gameId}/legs`, { method: "POST" })
}

export async function abandonGame(gameId: string): Promise<{ ok: boolean }> {
  return apiClient(`/api/games/${gameId}/abandon`, { method: "POST" })
}

export async function getBotProfiles(): Promise<{ profiles: BotProfile[] }> {
  return apiClient("/api/bot-profiles")
}

export async function getPlayers(): Promise<{ players: Player[] }> {
  return apiClient("/api/players")
}
