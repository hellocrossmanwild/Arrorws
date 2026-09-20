import { jdcSummary } from "@/lib/server/jdc"
import { handle } from "@/lib/server/route-utils"

export const dynamic = "force-dynamic"

export async function GET() {
  return handle(() => jdcSummary())
}
