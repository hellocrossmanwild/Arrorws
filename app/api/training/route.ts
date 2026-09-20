import { trainingSummary } from "@/lib/server/training"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const playerId = url.searchParams.get("playerId") ?? "player-tom"
  return handle(() => trainingSummary(playerId))
}
