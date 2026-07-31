"use client"

import { create } from "zustand"
import type { User } from "@/lib/types"

/**
 * Phase 1 mock auth. A dev-only toggle switches between anonymous, player
 * and admin. Deleted in Phase 2, when index.ts becomes a Clerk wrapper.
 * Components never import this file directly — only "@/lib/auth".
 */

export const MOCK_USERS: Record<"player" | "admin", User> = {
  player: { id: "user-tom", displayName: "Tom", role: "player", playerId: "player-tom" },
  admin: { id: "user-tom-admin", displayName: "Tom (admin)", role: "admin", playerId: "player-tom" },
}

export type MockAuthState = { type: "anonymous" } | { type: "user"; user: User }

interface MockAuthStore {
  state: MockAuthState
  setState: (state: MockAuthState) => void
}

/** Persists across page navigations within a session; resets on refresh. */
export const useMockAuthStore = create<MockAuthStore>((set) => ({
  state: { type: "user", user: MOCK_USERS.player },
  setState: (state) => set({ state }),
}))

export function useUser(): User | null {
  const state = useMockAuthStore((s) => s.state)
  return state.type === "user" ? state.user : null
}

export function useIsAdmin(): boolean {
  const user = useUser()
  return user?.role === "admin"
}

/** The player id darts are recorded against. Anonymous users throw as Tom's device-local player. */
export function usePlayerId(): string {
  const user = useUser()
  return user?.playerId ?? "player-tom"
}
