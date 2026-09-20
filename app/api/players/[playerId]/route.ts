import { renamePlayer } from "@/lib/server/service"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params
  const body = await request.json().catch(() => ({}))
  return handle(() => renamePlayer(playerId, body))
}
