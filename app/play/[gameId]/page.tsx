"use client"

import { use, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { getGame, type GameResponse } from "@/lib/api/games"
import { LiveGame } from "@/components/play/LiveGame"

export default function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params)
  const searchParams = useSearchParams()
  const trainingSessionId = searchParams.get("trainingSession")
  const trainingBlock = searchParams.get("block")
  const [data, setData] = useState<GameResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getGame(gameId)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load")
      })
    return () => {
      cancelled = true
    }
  }, [gameId])

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <p className="text-tung">{error}</p>
        <Link href="/" className="text-wire">
          Back to home
        </Link>
      </div>
    )
  }
  if (!data) {
    // Same geometry as the loaded screen: nothing shifts when data lands.
    return <div className="fixed inset-0 z-30 bg-slate2" data-testid="play-loading" />
  }
  const trainingReturn =
    trainingSessionId !== null && trainingBlock !== null
      ? { sessionId: trainingSessionId, blockIndex: Number(trainingBlock) }
      : undefined
  return <LiveGame initial={data} trainingReturn={trainingReturn} />
}
