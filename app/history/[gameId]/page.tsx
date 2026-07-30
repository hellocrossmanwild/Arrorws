"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { getReplay, type ReplayVisit } from "@/lib/api/stats"
import type { Game, Player } from "@/lib/types"
import { labelOf } from "@/lib/scoring"
import { cn } from "@/lib/utils/cn"

/**
 * The dart-by-dart replay: a straight render of the dart log, which is
 * exactly why ADR 0003 exists.
 */
export default function GameReplayPage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = use(params)
  const [data, setData] = useState<{ game: Game; players: Player[]; visits: ReplayVisit[] } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getReplay(gameId)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [gameId])

  if (error) return <div className="p-6 text-tung">Game not found.</div>
  if (!data) return <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6" />

  const { game, players, visits } = data
  const isPractice = game.mode !== "x01"
  const nameOf = (id: string) => players.find((p) => p?.id === id)?.displayName ?? id

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
        {game.mode === "x01" ? "501" : game.mode} ·{" "}
        {new Date(game.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        {game.abandoned && " · abandoned"}
      </p>
      <div className="mt-4 flex flex-col gap-px bg-wire/30">
        {visits.map((v, i) => (
          <div
            key={i}
            className={cn("flex items-center gap-3 bg-bed px-3 py-2", v.bust && "opacity-80")}
            data-testid={`replay-visit-${i}`}
          >
            {players.length > 1 && (
              <span className="w-14 flex-none truncate text-xs text-tung">
                {nameOf(v.visit.playerId)}
              </span>
            )}
            <div className="flex flex-1 gap-1.5">
              {v.darts.map((d) => (
                <span
                  key={d.id}
                  className={cn(
                    "grid h-8 w-12 place-items-center font-mono text-xs",
                    d.ring === "D" ? "bg-dbl" : d.ring === "T" ? "bg-trb" : "bg-slate2"
                  )}
                >
                  {labelOf({ segment: d.segment, ring: d.ring })}
                </span>
              ))}
            </div>
            <span className="w-10 flex-none text-right font-mono text-xs text-tung">
              {v.bust ? "BUST" : v.visitScore}
            </span>
            {!isPractice && (
              <span
                className={cn(
                  "w-12 flex-none text-right font-mono text-sm",
                  v.checkout ? "text-wire" : "text-chalk"
                )}
              >
                {v.checkout ? "OUT" : v.remainingAfter}
              </span>
            )}
          </div>
        ))}
        {visits.length === 0 && (
          <p className="bg-bed px-4 py-6 text-sm text-tung">No darts thrown in this game.</p>
        )}
      </div>
      <Link href="/history" className="mt-4 inline-block text-sm text-wire">
        Back to history
      </Link>
    </div>
  )
}
