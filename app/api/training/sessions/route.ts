import { startTrainingSession } from "@/lib/server/training"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { playerId?: string }
  const playerId = body.playerId ?? "player-tom"
  return handle(() => startTrainingSession(playerId))
}
