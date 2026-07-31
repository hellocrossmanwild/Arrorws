import { listPlayers } from "@/lib/server/service"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function GET() {
  return handle(() => listPlayers())
}
