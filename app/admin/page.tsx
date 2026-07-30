"use client"

import { useEffect, useState } from "react"
import { getAdminUsage } from "@/lib/api/stats"
import { getBotProfiles } from "@/lib/api/games"
import { getPracticeGames } from "@/lib/api/practice"
import { useIsAdmin } from "@/lib/auth"
import type { BotProfile, PracticeGameDefinition } from "@/lib/types"

export default function AdminPage() {
  const isAdmin = useIsAdmin()
  const [usage, setUsage] = useState<{ players: number; sessions: number; games: number; darts: number } | null>(null)
  const [profiles, setProfiles] = useState<BotProfile[]>([])
  const [definitions, setDefinitions] = useState<PracticeGameDefinition[]>([])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    Promise.all([getAdminUsage(), getBotProfiles(), getPracticeGames()])
      .then(([usage, bots, practice]) => {
        if (cancelled) return
        setUsage(usage)
        setProfiles(bots.profiles)
        setDefinitions(practice.definitions)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
        <p className="text-tung">Admin only. Switch the mock auth toggle to Admin.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <h1 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">Admin</h1>

      <section className="grid grid-cols-4 gap-px bg-wire/40">
        {usage &&
          Object.entries(usage).map(([label, value]) => (
            <div key={label} className="bg-bed px-3 py-3">
              <span className="block font-mono text-[10px] uppercase tracking-widest text-tung">
                {label}
              </span>
              <span className="font-display text-xl">{value}</span>
            </div>
          ))}
      </section>

      <section className="mt-6">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
          Bot profiles
        </p>
        <div className="flex flex-col gap-px bg-wire/40">
          {profiles.map((p) => (
            <div key={p.id} className="flex justify-between bg-bed px-4 py-2.5 text-sm">
              <span>{p.name}</span>
              <span className="font-mono text-xs text-tung">
                avg {p.targetAverage} · σ {p.scoringSigmaMm}mm / {p.doubleSigmaMm}mm
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
          Practice game definitions
        </p>
        <div className="flex flex-col gap-px bg-wire/40">
          {definitions.map((d) => (
            <div key={d.key} className="flex justify-between bg-bed px-4 py-2.5 text-sm">
              <span>{d.name}</span>
              <span className="font-mono text-xs text-tung">
                {d.scoringModel} · {d.personalBestDirection}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
