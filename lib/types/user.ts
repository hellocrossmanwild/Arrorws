/**
 * The signed-in user as exposed by /lib/auth. In Phase 1 this is a mock
 * user selected via the dev toggle; in Phase 2 it wraps the Clerk user.
 * There is no subscription state — Arrows is free (PRD Section 8).
 */
export interface User {
  id: string
  displayName: string
  role: "player" | "admin"
  /** The players.id this user throws as. */
  playerId: string
}
