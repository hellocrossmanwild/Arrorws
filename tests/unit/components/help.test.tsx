import { describe, expect, test, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { HelpSheet } from "@/components/help/HelpSheet"
import { ENTRY_RULE, GAME_GUIDES, PAD_PRIMER, TRAINING_EXPLAINER } from "@/lib/content/guides"
import type { GameMode } from "@/lib/types"

const ALL_MODES: GameMode[] = [
  "x01",
  "around-the-clock",
  "doubles-round-the-board",
  "bobs-27",
  "shanghai",
  "halve-it",
  "checkout-ladder",
  "random-checkout",
  "scoring-drill",
  "jdc-challenge",
  "target-switching",
  "pressure-doubles",
]

describe("guide content", () => {
  test("every game mode has a complete guide", () => {
    for (const mode of ALL_MODES) {
      const guide = GAME_GUIDES[mode]
      expect(guide, mode).toBeDefined()
      expect(guide.title.length, mode).toBeGreaterThan(0)
      expect(guide.what.length, mode).toBeGreaterThan(20)
      expect(guide.how.length, mode).toBeGreaterThanOrEqual(2)
      expect(guide.scoring.length, mode).toBeGreaterThan(10)
      expect(guide.trains.length, mode).toBeGreaterThan(10)
      expect(guide.tip.length, mode).toBeGreaterThan(10)
    }
  })

  test("the pad primer and training explainer exist", () => {
    expect(PAD_PRIMER.length).toBeGreaterThanOrEqual(3)
    expect(TRAINING_EXPLAINER.length).toBeGreaterThanOrEqual(4)
  })

  test("house tone: no exclamation marks anywhere", () => {
    const all = [
      ...Object.values(GAME_GUIDES).flatMap((g) => [
        g.title,
        g.what,
        ...g.how,
        g.scoring,
        g.trains,
        g.tip,
      ]),
      ...PAD_PRIMER,
      ...TRAINING_EXPLAINER,
      ENTRY_RULE,
    ]
    for (const line of all) {
      expect(line, line).not.toContain("!")
    }
  })
})

describe("HelpSheet", () => {
  test("renders the full guide for a mode with all sections", () => {
    render(<HelpSheet mode="bobs-27" onClose={() => {}} />)
    expect(screen.getByText("Bob's 27")).toBeInTheDocument()
    expect(screen.getByText("How to throw it")).toBeInTheDocument()
    expect(screen.getByText("Scoring")).toBeInTheDocument()
    expect(screen.getByText("What it trains")).toBeInTheDocument()
    expect(screen.getByText("Tip")).toBeInTheDocument()
    // Practice modes carry the enter-where-it-lands rule
    expect(screen.getByText(ENTRY_RULE)).toBeInTheDocument()
  })

  test("x01 does not show the drill entry rule, and the pad primer shows when asked", () => {
    render(<HelpSheet mode="x01" showPadPrimer onClose={() => {}} />)
    expect(screen.queryByText(ENTRY_RULE)).not.toBeInTheDocument()
    expect(screen.getByText("Entering darts")).toBeInTheDocument()
    expect(screen.getByText(PAD_PRIMER[0])).toBeInTheDocument()
  })

  test("close button and veil both dismiss", () => {
    const onClose = vi.fn()
    render(<HelpSheet mode="scoring-drill" onClose={onClose} />)
    fireEvent.click(screen.getByTestId("help-close"))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId("help-sheet"))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
