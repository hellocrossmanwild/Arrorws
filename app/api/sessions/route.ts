import { listSessions } from "@/lib/server/service"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Number(url.searchParams.get("limit") ?? 20)
  const cursor = Number(url.searchParams.get("cursor") ?? 0)
  const playerId = url.searchParams.get("playerId") ?? "player-tom"
  return handle(() => listSessions(limit, cursor, playerId))
}
