"use client"

import { useEffect } from "react"
import { DEFAULT_PLAYER_ID, useCurrentPlayerStore } from "./current-player"

/**
 * The player id every scoped call is made against (spec 0012). Components
 * import this from "@/lib/auth" and never from the files behind it
 * (CLAUDE.md rule 3).
 *
 * Hydration: the stored choice is read in an effect, not during render, so
 * the server and the first client render agree. Until it lands, this is the
 * default player — which is also what the API defaults to, so nothing is
 * ever fetched against a player that does not exist.
 */
export function usePlayerId(): string {
  const playerId = useCurrentPlayerStore((s) => s.playerId)
  const hydrated = useCurrentPlayerStore((s) => s.hydrated)
  const hydrate = useCurrentPlayerStore((s) => s.hydrate)

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  return playerId ?? DEFAULT_PLAYER_ID
}

/** False until the stored choice has been read; screens use it to hold a skeleton. */
export function usePlayerHydrated(): boolean {
  return useCurrentPlayerStore((s) => s.hydrated)
}

/** Switch who is throwing. Persists across refreshes. */
export function useSetPlayer(): (playerId: string) => void {
  return useCurrentPlayerStore((s) => s.setPlayer)
}

/** Re-exported for symmetry; the display name comes from the players list. */
export function useCurrentPlayer(): { playerId: string } {
  return { playerId: usePlayerId() }
}
