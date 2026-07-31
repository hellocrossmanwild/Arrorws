"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getPracticeGames, type PracticeGamesResponse } from "@/lib/api/practice"

/** The eight games, personal best against each. No categories, no search. */
export default function PracticePage() {
  const [data, setData] = useState<PracticeGamesResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    getPracticeGames().then((res) => {
      if (!cancelled) setData(res)
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <h1 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-wire">
        Practice
      </h1>
      <div className="flex flex-col gap-px bg-wire/40">
        {(data?.definitions ?? []).map((def) => {
          const best = data?.personalBests[def.key]
          return (
            <Link
              key={def.key}
              href={`/practice/${def.key}`}
              className="flex items-center justify-between bg-bed px-4 py-3 hover:brightness-110"
              data-testid={`practice-row-${def.key}`}
            >
              <span>
                <span className="block font-semibold">{def.name}</span>
                <span className="block text-sm text-tung">{def.blurb}</span>
              </span>
              <span className="text-right font-mono text-xs text-tung">
                {best ? (
                  <>
                    <span className="block text-base text-wire">{best.score}</span>
                    {new Date(best.achievedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </>
                ) : (
                  "No best yet"
                )}
              </span>
            </Link>
          )
        })}
        {!data && <div className="h-[512px] bg-bed" />}
      </div>
    </div>
  )
}
