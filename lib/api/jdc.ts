import type { JdcSummary } from "@/lib/types"
import { apiClient } from "./client"

export async function getJdc(): Promise<JdcSummary> {
  return apiClient("/api/jdc")
}
