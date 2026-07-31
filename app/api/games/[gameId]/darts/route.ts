import { addDart } from "@/lib/server/service"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  const body = await request.json()
  return handle(() => addDart(gameId, body), 201)
}
