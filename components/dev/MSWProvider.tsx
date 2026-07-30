"use client"

import { useEffect, useState } from "react"

/**
 * Starts the MSW worker in development and holds rendering until it is
 * intercepting, so the first data fetches cannot race the worker.
 * In production this renders children immediately (Phase 2 removes it
 * along with the rest of /mocks).
 */
export function MSWProvider({ children }: { children: React.ReactNode }) {
  const needsWorker = process.env.NODE_ENV === "development"
  const [ready, setReady] = useState(!needsWorker)

  useEffect(() => {
    if (!needsWorker) return
    let cancelled = false
    import("@/mocks/setup").then(({ startMockWorker }) =>
      startMockWorker().then(() => {
        if (!cancelled) setReady(true)
      })
    )
    return () => {
      cancelled = true
    }
  }, [needsWorker])

  if (!ready) return null
  return <>{children}</>
}
