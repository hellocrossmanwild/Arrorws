"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createGame } from "@/lib/api/games"
import { getPracticeGames } from "@/lib/api/practice"
import { usePlayerId } from "@/lib/auth"
import type { PracticeConfig, PracticeGameDefinition, PracticeGameKey } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ENTRY_RULE, GAME_GUIDES } from "@/lib/content/guides"
import { toast } from "@/components/ui/toaster"

/** Rules in three lines maximum, the personal best, and a start button. */
const RULES: Record<PracticeGameKey, string[]> = {
  "around-the-clock": [
    "Hit 1 to 20 in order, then 25, then bull.",
    "Any ring of the number counts.",
    "Fewest darts wins.",
  ],
  "doubles-round-the-board": [
    "Hit D1 to D20 in order, then bull.",
    "Only the double counts.",
    "Fewest darts wins.",
  ],
  "bobs-27": [
    "Start on 27. Round n targets double n, three darts.",
    "Each hit adds 2n. Miss all three and you lose 2n.",
    "Below zero and you are out.",
  ],
  shanghai: [
    "Round n targets the number n. Hits score their value.",
    "Single, double and treble in one round wins outright.",
    "Highest score wins.",
  ],
  "halve-it": [
    "Rounds: 20, 19, 18, any double, 41, any treble, bull.",
    "Score the target or your total halves.",
    "The 41 round needs exactly 41 with three darts.",
  ],
  "checkout-ladder": [
    "Three darts to take out 41. Success climbs by one.",
    "Failure repeats the target.",
    "Three straight failures ends it.",
  ],
  "random-checkout": [
    "Twenty random checkouts between 41 and 170.",
    "Three darts each, finish on a double.",
    "Most taken out wins.",
  ],
  "scoring-drill": [
    "Sixty darts at treble 20.",
    "Nothing else counts.",
    "The score is your three-dart average.",
  ],
  "jdc-challenge": [
    "Shanghai 10 to 15, one dart at every double, Shanghai 15 to 20.",
    "Shanghai a number and it scores 100.",
    "Graded White to Black at 850.",
  ],
  "target-switching": [
    "Six rounds of three darts.",
    "The target cycles 20, 19, 18.",
    "Any ring of the number scores its value.",
  ],
  "pressure-doubles": [
    "D16, D20, D18, D10 in order.",
    "Two clean hits on each before you may move on.",
    "Fewest darts wins.",
  ],
}

export default function PracticeGamePage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key } = use(params)
  const router = useRouter()
  const playerId = usePlayerId()
  const [definition, setDefinition] = useState<PracticeGameDefinition | null>(null)
  const [best, setBest] = useState<{ score: number; achievedAt: string } | null>(null)
  const [showFinish, setShowFinish] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPracticeGames()
      .then((res) => {
        if (cancelled) return
        setDefinition(res.definitions.find((d) => d.key === key) ?? null)
        setBest(res.personalBests[key as PracticeGameKey] ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [key])

  async function start() {
    if (starting) return
    setStarting(true)
    try {
      const config: PracticeConfig = key === "random-checkout" ? { showFinish } : {}
      const { game } = await createGame(key as PracticeGameKey, config, [playerId])
      router.push(`/play/${game.id}`)
    } catch {
      toast("Could not start the drill")
      setStarting(false)
    }
  }

  const rules = RULES[key as PracticeGameKey]
  const guide = GAME_GUIDES[key as PracticeGameKey]
  if (!rules) {
    return <div className="p-6 text-tung">No such practice game.</div>
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
      <h1 className="font-display text-3xl">{definition?.name ?? ""}</h1>
      <ul className="mt-4 space-y-1 text-sm text-chalk">
        {rules.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-6 font-mono text-xs text-tung">
        {best
          ? `Personal best ${best.score} · ${new Date(best.achievedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
          : "No personal best yet."}
      </p>
      {key === "random-checkout" && (
        <label className="mt-4 flex items-center gap-2 text-sm text-tung">
          <input
            type="checkbox"
            checked={showFinish}
            onChange={(e) => setShowFinish(e.target.checked)}
            className="h-4 w-4 accent-[#B08D57]"
          />
          Show the suggested finish
        </label>
      )}
      <Button className="mt-6 w-full" onClick={start} data-testid="start-practice">
        Start
      </Button>

      {/* The full guide (spec 0009). The three-line rules and Start stay above the fold. */}
      {guide && (
        <div className="mt-8 border-t border-wire/30 pt-5" data-testid="practice-guide">
          <GuideSection label="How to throw it">
            <ul className="space-y-2">
              {guide.how.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-chalk">
                  <span className="text-wire">·</span>
                  {line}
                </li>
              ))}
            </ul>
          </GuideSection>
          <GuideSection label="Scoring">
            <p className="text-sm text-chalk">{guide.scoring}</p>
          </GuideSection>
          <GuideSection label="What it trains">
            <p className="text-sm text-chalk">{guide.trains}</p>
          </GuideSection>
          <GuideSection label="Tip">
            <p className="text-sm text-chalk">{guide.tip}</p>
          </GuideSection>
          <p className="mt-4 border-l-2 border-wire pl-3 font-mono text-xs text-tung">
            {ENTRY_RULE}
          </p>
        </div>
      )}
    </div>
  )
}

function GuideSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 first:mt-0">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-wire">
        {label}
      </p>
      {children}
    </section>
  )
}
