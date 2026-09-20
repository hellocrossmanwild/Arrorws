"use client"

import { create } from "zustand"

/**
 * Who is standing at the oche (spec 0012).
 *
 * This is deliberately not authentication. Arrows runs on one shared device
 * next to a board, used by a household; ADR 0006's single-user posture is
 * unchanged. This is a "tap your name" selection — the equivalent of writing
 * your initials on the chalkboard — and it is what every scoped API call
 * sends as `playerId`.
 *
 * The choice persists in localStorage so it survives a refresh mid-session,
 * which matters when a child has thrown twenty darts and the tablet sleeps.
 */

const STORAGE_KEY = "arrows.currentPlayerId"

/** Read outside React so the store can hydrate before first paint. */
function readStored(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Private browsing, blocked storage: fall back to the default player.
    return null
  }
}

function writeStored(playerId: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, playerId)
  } catch {
    // Not being able to remember the choice is survivable; losing the
    // throw because we threw here is not.
  }
}

interface CurrentPlayerStore {
  /** Null until hydrated from storage on the client. */
  playerId: string | null
  hydrated: boolean
  setPlayer: (playerId: string) => void
  hydrate: () => void
}

export const useCurrentPlayerStore = create<CurrentPlayerStore>((set) => ({
  playerId: null,
  hydrated: false,
  setPlayer: (playerId) => {
    writeStored(playerId)
    set({ playerId, hydrated: true })
  },
  hydrate: () => set({ playerId: readStored(), hydrated: true }),
}))

/**
 * The fallback before a choice has been made or hydrated. Matching the
 * server's own default keeps the first render identical on both sides.
 */
export const DEFAULT_PLAYER_ID = "player-tom"
