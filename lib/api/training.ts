import type { TrainingSession, TrainingSessionTemplate } from "@/lib/types"
import type { TrainingSummary } from "@/lib/training/summary"
import { apiClient } from "./client"

export type { TrainingSummary }

export interface TrainingSessionResponse {
  session: TrainingSession
  template: TrainingSessionTemplate
}

export async function getTraining(playerId?: string): Promise<TrainingSummary> {
  const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : ""
  return apiClient(`/api/training${query}`)
}

export async function startTrainingSession(
  playerId?: string
): Promise<TrainingSessionResponse> {
  return apiClient("/api/training/sessions", {
    method: "POST",
    body: JSON.stringify({ playerId }),
  })
}

export async function getTrainingSession(id: string): Promise<TrainingSessionResponse> {
  return apiClient(`/api/training/sessions/${id}`)
}

export async function recordTrainingBlock(
  id: string,
  blockIndex: number,
  gameId: string | null
): Promise<TrainingSessionResponse> {
  return apiClient(`/api/training/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ blockIndex, gameId }),
  })
}
