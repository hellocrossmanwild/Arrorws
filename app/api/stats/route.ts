import { stats } from "@/lib/server/service"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  return handle(() =>
    stats({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      includeBots: url.searchParams.get("includeBots") !== "false",
      includeTwoPlayer: url.searchParams.get("includeTwoPlayer") !== "false",
      source: url.searchParams.get("source") === "practice" ? "practice" : "all",
      playerId: url.searchParams.get("playerId") ?? "player-tom",
    })
  )
}
