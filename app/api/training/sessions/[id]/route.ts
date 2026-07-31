import { getTrainingSession, recordTrainingBlock } from "@/lib/server/training"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return handle(() => getTrainingSession(id))
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  return handle(() => recordTrainingBlock(id, body.blockIndex, body.gameId ?? null))
}
