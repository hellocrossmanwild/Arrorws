"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getSessions, type SessionSummary } from "@/lib/api/stats"
import { Button } from "@/components/ui/button"

function formatDuration(session: SessionSummary): string {
  if (!session.endedAt) return "live"
  const minutes = Math.round(
    (Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 60_000
  )
  return `${minutes} min`
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSessions(20).then((res) => {
      if (cancelled) return
      setSessions(res.sessions)
      setNextCursor(res.nextCursor)
      setLoaded(true)
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const loadMore = async () => {
    if (!nextCursor) return
    const res = await getSessions(20, nextCursor)
    setSessions((s) => [...s, ...res.sessions])
    setNextCursor(res.nextCursor)
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <h1 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">History</h1>
      {loaded && sessions.length === 0 && (
        <p className="bg-bed px-4 py-6 text-sm text-tung">No sessions yet. Throw a leg.</p>
      )}
      <div className="flex flex-col gap-4">
        {sessions.map((session) => (
          <section key={session.id} className="bg-bed" data-testid={`session-${session.id}`}>
            <header className="flex items-baseline justify-between border-b border-wire/30 px-4 py-2.5">
              <span className="text-sm font-semibold">
                {new Date(session.startedAt).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="font-mono text-xs text-tung">
                {formatDuration(session)} · {session.gameCount}{" "}
                {session.gameCount === 1 ? "game" : "games"}
                {session.threeDartAverage !== null && ` · ${session.threeDartAverage.toFixed(1)} avg`}
              </span>
            </header>
            {session.games.length === 0 ? (
              <p className="px-4 py-3 text-sm text-tung">Nothing thrown. Open the pad next time.</p>
            ) : (
              <ul>
                {session.games.map((game) => (
                  <li key={game.id}>
                    <Link
                      href={`/history/${game.id}`}
                      className="flex items-baseline justify-between px-4 py-2.5 hover:brightness-110"
                      data-testid={`game-link-${game.id}`}
                    >
                      <span className="text-sm">
                        {game.mode === "x01" ? "501" : game.mode}
                        {game.abandoned && <span className="ml-2 text-xs text-tung">abandoned</span>}
                      </span>
                      <span className="font-mono text-xs text-tung">
                        {game.metrics?.gameScore !== null && game.metrics?.gameScore !== undefined
                          ? `score ${game.metrics.gameScore}`
                          : game.metrics
                            ? `${game.metrics.threeDartAverage.toFixed(1)} avg`
                            : "unfinished"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {nextCursor && (
        <Button variant="ghost" className="mt-4 w-full" onClick={loadMore}>
          Load more
        </Button>
      )}
    </div>
  )
}
