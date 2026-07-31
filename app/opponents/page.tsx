"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createGame, getBotProfiles } from "@/lib/api/games"
import { usePlayerId } from "@/lib/auth"
import type { BotProfile } from "@/lib/types"
import { toast } from "@/components/ui/toaster"

/** Four cards, one per profile. Tapping one starts a 501 match against it. */
export default function OpponentsPage() {
  const router = useRouter()
  const playerId = usePlayerId()
  const [profiles, setProfiles] = useState<BotProfile[]>([])
  const [legsToWin, setLegsToWin] = useState(3)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getBotProfiles().then(({ profiles }) => {
      if (!cancelled) setProfiles(profiles)
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function start(profile: BotProfile) {
    if (starting) return
    setStarting(true)
    try {
      const { game } = await createGame("x01", { startingScore: 501, legsToWin }, [
        playerId,
        `bot-${profile.id}`,
      ])
      router.push(`/play/${game.id}`)
    } catch {
      toast("Could not start the match")
      setStarting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <h1 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
        Pick an opponent · 501
      </h1>
      <div className="flex flex-col gap-px bg-wire/40">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            className="flex items-baseline justify-between bg-bed px-4 py-4 text-left hover:brightness-110"
            onClick={() => start(profile)}
            data-testid={`opponent-${profile.id}`}
          >
            <span>
              <span className="block font-display text-xl">{profile.name}</span>
              <span className="block text-sm text-tung">{profile.description}</span>
            </span>
            <span className="font-mono text-sm text-wire">{profile.targetAverage} avg</span>
          </button>
        ))}
        {profiles.length === 0 && <div className="h-[320px] bg-bed" />}
      </div>
      <label className="mt-5 flex items-center gap-3 text-sm text-tung">
        First to
        <select
          value={legsToWin}
          onChange={(e) => setLegsToWin(Number(e.target.value))}
          className="border border-wire/60 bg-bed px-2 py-1.5 text-base text-chalk"
        >
          {[1, 2, 3, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        legs
      </label>
    </div>
  )
}
