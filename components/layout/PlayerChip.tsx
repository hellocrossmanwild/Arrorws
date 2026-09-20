"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { usePlayerId, useSetPlayer } from "@/lib/auth"
import { humansOf, usePlayersStore } from "@/lib/players/store"

/**
 * Who is throwing, always visible (spec 0012). On a shared board the most
 * likely mistake is logging one child's darts against another, so this is
 * a permanent statement of record rather than a menu item.
 */
export function PlayerChip() {
  const playerId = usePlayerId()
  const setPlayer = useSetPlayer()
  const pathname = usePathname()
  const players = usePlayersStore((s) => s.players)
  const load = usePlayersStore((s) => s.load)

  useEffect(() => {
    load()
  }, [load])

  // A remembered player can stop existing — a cleared database, a profile
  // removed, a device carrying someone else's choice. Rather than scope
  // every call to a ghost id and show a silently empty record, fall back
  // to the first player on the board.
  const humans = humansOf(players)
  useEffect(() => {
    if (players === null || humans.length === 0) return
    if (!humans.some((p) => p.id === playerId)) setPlayer(humans[0].id)
  }, [players, humans, playerId, setPlayer])

  const name = humans.find((p) => p.id === playerId)?.displayName ?? ""

  return (
    <Link
      href={`/players?next=${encodeURIComponent(pathname ?? "/")}`}
      className="flex min-h-[44px] max-w-[96px] items-center gap-1.5 truncate text-wire"
      aria-label={name ? `Throwing as ${name}. Change player` : "Choose player"}
      data-testid="player-chip"
      data-player-id={playerId}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-wire" aria-hidden />
      <span className="truncate">{name || "Player"}</span>
    </Link>
  )
}
