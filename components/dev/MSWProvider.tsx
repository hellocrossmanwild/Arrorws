"use client"

import { useEffect, useState } from "react"

/**
 * Starts the MSW worker when mocks are enabled (NEXT_PUBLIC_ENABLE_MOCKS=1)
 * and holds rendering until it is intercepting, so the first data fetches
 * cannot race the worker. When mocks are off this renders children
 * immediately and the app talks to the real API routes.
 */
export function MSWProvider({ children }: { children: React.ReactNode }) {
  const needsWorker = process.env.NEXT_PUBLIC_ENABLE_MOCKS === "1"
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
