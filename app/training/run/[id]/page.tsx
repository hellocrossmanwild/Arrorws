"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  getTrainingSession,
  recordTrainingBlock,
  type TrainingSessionResponse,
} from "@/lib/api/training"
import { createGame } from "@/lib/api/games"
import { usePlayerId } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toaster"
import { cn } from "@/lib/utils/cn"
import { HelpSheet } from "@/components/help/HelpSheet"
import type { GameMode } from "@/lib/types"

/** The session runner (spec 0008): block by block, through the ordinary pad. */
export default function TrainingRunPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const playerId = usePlayerId()
  const [data, setData] = useState<TrainingSessionResponse | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [helpMode, setHelpMode] = useState<GameMode | null>(null)

  const load = useCallback(() => {
    getTrainingSession(id)
      .then(setData)
      .catch(() => setError(true))
  }, [id])

  useEffect(() => {
    let cancelled = false
    getTrainingSession(id)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) return <div className="p-6 text-tung">Training session not found.</div>
  if (!data) return <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6" />

  const { session, template } = data
  const currentIndex = session.blockGameIds.findIndex((g) => g === null)

  async function throwBlock(blockIndex: number) {
    if (busy || !data) return
    setBusy(true)
    const block = data.template.blocks[blockIndex]
    try {
      const participants = block.withBot ? [playerId, block.withBot] : [playerId]
      const { game } = await createGame(block.mode, block.config, participants)
      router.push(`/play/${game.id}?trainingSession=${session.id}&block=${blockIndex}`)
    } catch {
      toast("Could not start the block")
      setBusy(false)
    }
  }

  async function skipBlock(blockIndex: number) {
    if (busy) return
    setBusy(true)
    try {
      await recordTrainingBlock(session.id, blockIndex, null)
      load()
    } catch {
      toast("Could not skip the block")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
        Week {session.week} · {template.name}
      </p>
      <h1 className="mt-1 font-display text-3xl">
        {session.completedAt ? "Session complete" : "Session"}
      </h1>

      <div className="mt-4 flex flex-col gap-px bg-wire/40" data-testid="block-list">
        {template.blocks.map((block, i) => {
          const done = session.blockGameIds[i] !== null
          const isCurrent = i === currentIndex
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3",
                isCurrent ? "bg-bed" : "bg-bed/60",
                done && "opacity-60"
              )}
              data-testid={`block-${i}`}
            >
              <div>
                <button
                  className="flex min-h-[44px] items-center gap-2 text-left"
                  onClick={() => setHelpMode(block.mode)}
                  data-testid={`block-help-${i}`}
                >
                  <span className="block text-sm font-semibold">{block.name}</span>
                  <span className="font-mono text-xs text-wire">?</span>
                </button>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-tung">
                  {done
                    ? session.blockGameIds[i] === "skipped"
                      ? "Skipped"
                      : "Done"
                    : isCurrent
                      ? "Up next"
                      : "Waiting"}
                </span>
              </div>
              {isCurrent && !session.completedAt && (
                <div className="flex gap-2">
                  <button
                    className="min-h-[44px] px-3 font-mono text-xs text-tung"
                    onClick={() => skipBlock(i)}
                  >
                    Skip
                  </button>
                  <Button onClick={() => throwBlock(i)} data-testid={`throw-block-${i}`}>
                    Throw
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {session.completedAt && (
        <p className="mt-4 text-sm text-chalk">Session done. The board stays warm.</p>
      )}
      <Link href="/training" className="mt-4 inline-block min-h-[44px] text-sm text-wire">
        Back to training
      </Link>

      {helpMode && <HelpSheet mode={helpMode} onClose={() => setHelpMode(null)} />}
    </div>
  )
}
