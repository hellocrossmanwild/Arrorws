"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getTraining, startTrainingSession, type TrainingSummary } from "@/lib/api/training"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toaster"
import { cn } from "@/lib/utils/cn"
import { TRAINING_EXPLAINER } from "@/lib/content/guides"

/** The training programme overview (spec 0008): queue model, no guilt mechanics. */
export default function TrainingPage() {
  const router = useRouter()
  const [data, setData] = useState<TrainingSummary | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getTraining()
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function start() {
    if (starting) return
    setStarting(true)
    try {
      const { session } = await startTrainingSession()
      router.push(`/training/run/${session.id}`)
    } catch {
      toast("Could not start the session")
      setStarting(false)
    }
  }

  const week = data?.nextSession?.week ?? data?.program.weeks ?? 1

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
        Training · {data?.program.name ?? ""}
      </p>
      <div className="mt-1 flex items-baseline justify-between">
        <h1 className="font-display text-3xl">
          {data?.programComplete ? "Programme complete" : `Week ${week} of ${data?.program.weeks ?? 4}`}
        </h1>
        <span className="font-mono text-xs text-tung" data-testid="training-progress">
          {data ? `${data.completedCount} of ${data.totalSessions} sessions` : ""}
        </span>
      </div>

      {/* ── this week + streak ───────────────────────────────────────── */}
      <section className="mt-4 grid grid-cols-2 gap-px bg-wire/40">
        <div className="bg-bed px-4 py-3">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-tung">
            This week
          </span>
          <span className="font-display text-2xl" data-testid="sessions-this-week">
            {data ? `${data.sessionsThisWeek} of ${data.weeklyTarget}` : "—"}
          </span>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: data?.weeklyTarget ?? 4 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1",
                  data && i < data.sessionsThisWeek ? "bg-wire" : "bg-slate2"
                )}
              />
            ))}
          </div>
        </div>
        <div className="bg-bed px-4 py-3">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-tung">
            Week streak
          </span>
          <span className="font-display text-2xl" data-testid="week-streak">
            {data?.weekStreak ?? "—"}
          </span>
          <p className="mt-2 font-mono text-[10px] text-tung">
            Weeks hitting the target in a row
          </p>
        </div>
      </section>

      {/* ── next session ─────────────────────────────────────────────── */}
      {data?.programComplete ? (
        <p className="mt-6 bg-bed px-4 py-6 text-sm text-tung">
          All sixteen sessions thrown. A new programme arrives with the next spec.
        </p>
      ) : (
        <section className="mt-6 bg-bed p-4" data-testid="next-session">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
            {data?.active ? "Session in progress" : "Next session"}
          </p>
          <h2 className="mt-1 font-display text-2xl">
            {data?.nextSession?.template.name ?? ""}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {data?.nextSession?.template.blocks.map((block, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-chalk">
                <span className="font-mono text-[10px] text-tung">{i + 1}</span>
                {block.name}
              </li>
            ))}
          </ul>
          <Button className="mt-4 w-full" onClick={start} data-testid="start-session">
            {data?.active ? "Continue session" : "Start session"}
          </Button>
        </section>
      )}

      {/* ── how it works ─────────────────────────────────────────────── */}
      <details className="mt-6 bg-bed" data-testid="training-explainer">
        <summary className="min-h-[44px] cursor-pointer list-none px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
          How training works
        </summary>
        <ul className="space-y-2 px-4 pb-4">
          {TRAINING_EXPLAINER.map((line) => (
            <li key={line} className="flex gap-2 text-sm text-chalk">
              <span className="text-wire">·</span>
              {line}
            </li>
          ))}
        </ul>
      </details>

      {/* ── assessments ──────────────────────────────────────────────── */}
      <section className="mt-6">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
          JDC Challenge
        </p>
        {data && data.assessments.length === 0 ? (
          <p className="bg-bed px-4 py-4 text-sm text-tung">
            No assessments yet. The JDC Challenge arrives in week two.
          </p>
        ) : (
          <div className="flex flex-col gap-px bg-wire/40" data-testid="assessments">
            {data?.assessments.map((a, i) => (
              <div key={i} className="flex items-baseline justify-between bg-bed px-4 py-2.5">
                <span className="font-display text-lg">{a.grade}</span>
                <span className="font-mono text-xs text-tung">
                  {a.score} pts ·{" "}
                  {new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
