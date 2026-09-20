import { createPlayer, listPlayers } from "@/lib/server/service"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function GET() {
  return handle(() => listPlayers())
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  return handle(() => createPlayer(body), 201)
}
