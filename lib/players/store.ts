"use client"

import { create } from "zustand"
import type { Player } from "@/lib/types"
import { getPlayers } from "@/lib/api/games"

/**
 * The roster, loaded once and shared (spec 0012). The header chip and the
 * picker both need names; without this they would each fetch on every
 * navigation. Mutating screens call `reload()` so a rename shows up
 * everywhere at once.
 */
interface PlayersStore {
  players: Player[] | null
  loading: boolean
  load: () => Promise<void>
  reload: () => Promise<void>
}

async function fetchPlayers(set: (partial: Partial<PlayersStore>) => void) {
  set({ loading: true })
  try {
    const { players } = await getPlayers()
    set({ players, loading: false })
  } catch {
    set({ loading: false })
  }
}

export const usePlayersStore = create<PlayersStore>((set, get) => ({
  players: null,
  loading: false,
  load: async () => {
    if (get().players !== null || get().loading) return
    await fetchPlayers(set)
  },
  reload: async () => {
    await fetchPlayers(set)
  },
}))

/** Human players only, bots excluded. */
export function humansOf(players: Player[] | null): Player[] {
  return (players ?? []).filter((p) => !p.isBot)
}
