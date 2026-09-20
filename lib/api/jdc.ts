import type { JdcSummary } from "@/lib/types"
import { apiClient } from "./client"

export async function getJdc(playerId?: string): Promise<JdcSummary> {
  const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : ""
  return apiClient(`/api/jdc${query}`)
}
