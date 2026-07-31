import { neon } from "@neondatabase/serverless"
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http"
import * as schema from "./schema"

export * as tables from "./schema"

let cached: NeonHttpDatabase<typeof schema> | null = null

/**
 * Lazy so the app builds without a DATABASE_URL (tests and the mock demo
 * never touch this). Server-only — nothing under /components or /app
 * pages imports it; only route handlers via /lib/server.
 */
export function getDb(): NeonHttpDatabase<typeof schema> {
  if (cached) return cached
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  cached = drizzle(neon(url), { schema })
  return cached
}
