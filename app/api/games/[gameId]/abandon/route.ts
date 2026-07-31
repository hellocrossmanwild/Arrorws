import { abandonGame } from "@/lib/server/service"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  return handle(() => abandonGame(gameId))
}
