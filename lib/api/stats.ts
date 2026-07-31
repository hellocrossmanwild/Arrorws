import type { Dart, Game, Player, ResultMetrics, Session } from "@/lib/types"
import { apiClient } from "./client"

export interface StatsFilters {
  from?: string
  to?: string
  includeBots?: boolean
  includeTwoPlayer?: boolean
  source?: "practice" | "all"
}

export interface StatsResponse {
  headline: {
    threeDartAverage: number | null
    sessionCount: number
    deltaVsPrevious: number | null
  }
  trend: Array<{
    sessionId: string
    date: string
    threeDartAverage: number
    legCount: number
  }>
  doubles: Array<{
    segment: number
    ring: "D"
    attempts: number
    hits: number
    rate: number | null
  }>
  counts: {
    count180: number
    count140plus: number
    count100plus: number
    bestLegDarts: number | null
    bestCheckout: number | null
  }
  attemptsAreInferred: boolean
}

export async function getStats(filters: StatsFilters = {}): Promise<StatsResponse> {
  const params = new URLSearchParams()
  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  if (filters.includeBots === false) params.set("includeBots", "false")
  if (filters.includeTwoPlayer === false) params.set("includeTwoPlayer", "false")
  if (filters.source) params.set("source", filters.source)
  const qs = params.toString()
  return apiClient(`/api/stats${qs ? `?${qs}` : ""}`)
}

export interface GameSummary {
  id: string
  mode: string
  endedAt: string | null
  abandoned: boolean
  participantPlayerIds: string[]
  winnerPlayerId: string | null
  metrics: ResultMetrics | null
}

export interface SessionSummary extends Session {
  gameCount: number
  threeDartAverage: number | null
  summary: string
  games: GameSummary[]
}

export async function getSessions(
  limit = 20,
  cursor?: string
): Promise<{ sessions: SessionSummary[]; nextCursor: string | null }> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set("cursor", cursor)
  return apiClient(`/api/sessions?${params}`)
}

export interface ReplayVisit {
  visit: { legIndex: number; playerId: string; index: number; bust: boolean }
  darts: Dart[]
  visitScore: number
  remainingAfter: number
  bust: boolean
  checkout: boolean
}

export async function getReplay(
  gameId: string
): Promise<{ game: Game; players: Player[]; visits: ReplayVisit[] }> {
  return apiClient(`/api/games/${gameId}/replay`)
}

export async function getAdminUsage(): Promise<{
  players: number
  sessions: number
  games: number
  darts: number
}> {
  return apiClient("/api/admin/usage")
}
