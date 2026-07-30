import { createGame } from "@/lib/server/service"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await request.json()
  return handle(() => createGame(body), 201)
}
