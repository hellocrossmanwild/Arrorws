"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { createGame } from "@/lib/api/games"
import { getJdc } from "@/lib/api/jdc"
import { usePlayerId } from "@/lib/auth"
import { usePlayersStore } from "@/lib/players/store"
import type { JdcSummary } from "@/lib/types"
import { GAME_GUIDES } from "@/lib/content/guides"
import { beltColour } from "@/lib/jdc/belts"
import { BeltLadder } from "@/components/jdc/BeltLadder"
import { FamilyBoard } from "@/components/jdc/FamilyBoard"
import { PartBars } from "@/components/jdc/PartBars"
import { TrendChart } from "@/components/jdc/TrendChart"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toaster"

/**
 * The JDC Challenge record (spec 0011). The belt follows the best attempt
 * ever thrown; the trend carries every attempt, programme or not. Nothing
 * here is stored — it is all replayed from the dart log.
 */
export default function JdcPage() {
  const router = useRouter()
  const pathname = usePathname()
  const playerId = usePlayerId()
  const players = usePlayersStore((s) => s.players)
  const loadPlayers = usePlayersStore((s) => s.load)
  const [data, setData] = useState<JdcSummary | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getJdc(playerId)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [playerId])

  async function start() {
    if (starting) return
    setStarting(true)
    try {
      const { game } = await createGame("jdc-challenge", {}, [playerId])
      router.push(`/play/${game.id}`)
    } catch {
      toast("Could not start the challenge")
      setStarting(false)
    }
  }

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  const guide = GAME_GUIDES["jdc-challenge"]
  const playerName = players?.find((p) => p.id === playerId)?.displayName ?? ""
  const belt = data?.belt ?? null
  const best = data?.best ?? null
  const latest = data?.latest ?? null
  const delta = data?.latestDelta ?? null

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
          JDC Challenge{playerName ? ` · ${playerName}` : ""}
        </p>
        <span className="font-mono text-xs text-tung" data-testid="jdc-attempt-count">
          {data ? `${data.attempts.length} attempt${data.attempts.length === 1 ? "" : "s"}` : ""}
        </span>
      </div>

      {/* ── the belt ─────────────────────────────────────────────────── */}
      <section className="mt-3 bg-bed p-4" data-testid="jdc-headline">
        {best && belt ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="h-10 w-10 shrink-0 ring-1 ring-wire/40"
                  style={{ backgroundColor: beltColour(belt.name).swatch }}
                  aria-hidden
                />
                <span>
                  <span className="block font-display text-3xl" data-testid="jdc-belt">
                    {belt.name}
                  </span>
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-tung">
                    Best {best.score} pts
                  </span>
                </span>
              </div>
              <span className="text-right">
                <span className="block font-display text-2xl" data-testid="jdc-latest">
                  {latest?.score ?? 0}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-tung">
                  {delta === null
                    ? "last attempt"
                    : `${delta >= 0 ? "+" : ""}${delta} on the last`}
                </span>
              </span>
            </div>

            {data?.nextBelt ? (
              <p className="mt-4 text-sm text-chalk" data-testid="jdc-next-belt">
                {data.nextBelt.name} at {data.nextBelt.pointsAway + best.score} —{" "}
                <span className="text-wire">{data.nextBelt.pointsAway} points away</span>
              </p>
            ) : (
              <p className="mt-4 text-sm text-tung" data-testid="jdc-next-belt">
                Black. There is no belt above this one.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-tung" data-testid="jdc-empty">
            {data ? "No attempts yet. Throw the challenge." : " "}
          </p>
        )}
      </section>

      <div className="mt-3 flex items-center justify-between bg-bed px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-tung">
          Throwing as <span className="text-chalk">{playerName || "\u2014"}</span>
        </span>
        <Link
          href={`/players?next=${encodeURIComponent(pathname ?? "/jdc")}`}
          className="font-mono text-[10px] uppercase tracking-widest text-wire"
          data-testid="jdc-change-player"
        >
          Change
        </Link>
      </div>
      <Button className="mt-px w-full" onClick={start} data-testid="jdc-start">
        Throw the challenge
      </Button>

      {/* ── belts ────────────────────────────────────────────────────── */}
      {data && (
        <section className="mt-6">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
            Belts
          </p>
          <BeltLadder belts={data.belts} />
        </section>
      )}

      {/* ── the family ───────────────────────────────────────────────── */}
      {data && data.family.length > 1 && (
        <section className="mt-6">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
            The family
          </p>
          <FamilyBoard rows={data.family} currentPlayerId={playerId} />
        </section>
      )}

      {/* ── trend ────────────────────────────────────────────────────── */}
      {data && data.attempts.length > 0 && (
        <section className="mt-6">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
            Trend
          </p>
          <TrendChart attempts={data.attempts} />
        </section>
      )}

      {/* ── where the score came from ────────────────────────────────── */}
      {data && latest && (
        <section className="mt-6">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
            Latest attempt
          </p>
          <PartBars
            latest={latest}
            partBests={data.partBests}
            partMaximums={data.partMaximums}
          />
          <p className="mt-1.5 font-mono text-[10px] text-tung">
            {latest.shanghais} shanghai{latest.shanghais === 1 ? "" : "s"} ·{" "}
            {latest.doublesHit} of 21 doubles
          </p>
        </section>
      )}

      {/* ── attempts ─────────────────────────────────────────────────── */}
      {data && data.attempts.length > 0 && (
        <section className="mt-6">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
            Attempts
          </p>
          <div className="flex flex-col gap-px bg-wire/40" data-testid="jdc-attempts">
            {[...data.attempts].reverse().map((attempt) => (
              <div
                key={attempt.gameId}
                className="flex items-baseline justify-between bg-bed px-4 py-2.5"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 ring-1 ring-wire/40"
                    style={{ backgroundColor: beltColour(attempt.grade).swatch }}
                    aria-hidden
                  />
                  <span className="font-display text-lg">{attempt.grade}</span>
                </span>
                <span className="font-mono text-xs text-tung">
                  {attempt.score} pts ·{" "}
                  {new Date(attempt.endedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                  {attempt.fromProgramme ? " · assessment" : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── the test itself ──────────────────────────────────────────── */}
      <details className="mt-6 bg-bed" data-testid="jdc-explainer">
        <summary className="min-h-[44px] cursor-pointer list-none px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
          How the challenge works
        </summary>
        <div className="space-y-2 px-4 pb-4 text-sm text-chalk">
          <p className="text-tung">{guide.what}</p>
          {guide.how.map((line) => (
            <p key={line} className="flex gap-2">
              <span className="text-wire">·</span>
              {line}
            </p>
          ))}
          <p className="text-tung">{guide.scoring}</p>
        </div>
      </details>
    </div>
  )
}
