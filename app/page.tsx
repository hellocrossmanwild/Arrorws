"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createGame } from "@/lib/api/games"
import { getSessions } from "@/lib/api/stats"
import { usePlayerId, useUser } from "@/lib/auth"
import { toast } from "@/components/ui/toaster"

/**
 * Home. Four entry points, thumb sized, nothing else. This screen exists
 * to get out of the way (PRD 7.1).
 */
export default function HomePage() {
  const router = useRouter()
  const playerId = usePlayerId()
  const user = useUser()
  const [lastSession, setLastSession] = useState<{ date: string; average: number | null } | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getSessions(5)
      .then(({ sessions }) => {
        if (controller.signal.aborted) return
        const withGames = sessions.find((s) => s.gameCount > 0)
        if (withGames) {
          setLastSession({ date: withGames.startedAt, average: withGames.threeDartAverage })
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [playerId])

  async function start(participants: string[]) {
    if (starting) return
    setStarting(true)
    try {
      const { game } = await createGame(
        "x01",
        { startingScore: 501, legsToWin: 1 },
        participants
      )
      router.push(`/play/${game.id}`)
    } catch {
      toast("Could not start the game")
      setStarting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-3 px-4 py-8">
      <button
        className="min-h-[72px] bg-chalk px-6 text-left font-display text-2xl text-slate2"
        onClick={() => start([playerId])}
      >
        501 solo
      </button>
      <Link
        href="/opponents"
        className="flex min-h-[72px] items-center px-6 font-display text-2xl shadow-[inset_0_0_0_1px_theme(colors.wire)]"
      >
        501 vs bot
      </Link>
      <button
        className="min-h-[72px] px-6 text-left font-display text-2xl shadow-[inset_0_0_0_1px_theme(colors.wire)]"
        onClick={() => start([playerId, "player-guest"])}
      >
        Two player
      </button>
      <Link
        href="/practice"
        className="flex min-h-[72px] items-center px-6 font-display text-2xl shadow-[inset_0_0_0_1px_theme(colors.wire)]"
      >
        Practice
      </Link>

      <p className="mt-4 font-mono text-xs text-tung">
        {lastSession
          ? `Last session ${lastSession.average !== null ? `${lastSession.average.toFixed(1)} average` : "no legs"} · ${new Date(lastSession.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
          : "No sessions yet. Throw a leg."}
      </p>
      {!user && (
        <p className="font-mono text-xs text-tung">
          Playing without an account. Results last for this session only.{" "}
          <Link href="/signup" className="text-wire">
            Create account
          </Link>
        </p>
      )}
    </div>
  )
}
