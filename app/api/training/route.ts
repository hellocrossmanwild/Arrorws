import { trainingSummary } from "@/lib/server/training"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function GET() {
  return handle(() => trainingSummary())
}
