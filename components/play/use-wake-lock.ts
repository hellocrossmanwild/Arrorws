"use client"

import { useEffect } from "react"

/**
 * Screen wake lock for the duration of a live game. Guards unsupported
 * browsers and re-acquires on visibilitychange back to visible. A phone
 * that sleeps mid-leg is the second most annoying possible failure after
 * a wrong score (spec 0004).
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    let lock: { release: () => Promise<void> } | null = null
    let released = false

    const acquire = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> }
        }
        if (!nav.wakeLock) return
        lock = await nav.wakeLock.request("screen")
      } catch {
        // Rejected when backgrounded or unsupported. Nothing to do.
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !released) void acquire()
    }

    void acquire()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      released = true
      document.removeEventListener("visibilitychange", onVisibility)
      void lock?.release().catch(() => {})
    }
  }, [active])
}
