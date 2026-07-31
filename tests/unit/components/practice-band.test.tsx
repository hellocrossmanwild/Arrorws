import { describe, expect, test, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { PracticeBand } from "@/components/play/PracticeBand"
import type { PracticeHud } from "@/lib/practice"

const baseHud: PracticeHud = {
  eyebrow: "Round 6 of 20",
  hero: { label: "Score", value: "29" },
  chips: [{ label: "Darts", value: "15" }],
  progress: { done: 5, total: 20 },
}

function renderBand(hud: PracticeHud) {
  return render(
    <PracticeBand
      hud={hud}
      targetLabel="D6"
      visitDarts={[]}
      finishLabel=""
      onUndo={vi.fn()}
      undoDisabled={false}
    />
  )
}

describe("PracticeBand", () => {
  test("renders the target, eyebrow, labelled hero and chips", () => {
    renderBand(baseHud)
    expect(screen.getByTestId("practice-target")).toHaveTextContent("D6")
    expect(screen.getByText("Round 6 of 20")).toBeInTheDocument()
    expect(screen.getByText("Score")).toBeInTheDocument()
    expect(screen.getByTestId("practice-hero")).toHaveTextContent("29")
    expect(screen.getByTestId("practice-chips")).toHaveTextContent("Darts 15")
    expect(screen.getByTestId("practice-progress")).toBeInTheDocument()
  })

  test("a danger hero goes red and the stake line shows", () => {
    renderBand({
      ...baseHud,
      hero: { label: "Score", value: "7", tone: "danger" },
      sub: "A blank round ends it · −10",
    })
    expect(screen.getByTestId("practice-hero")).toHaveClass("text-dbl")
    expect(screen.getByTestId("practice-sub")).toHaveTextContent(
      "A blank round ends it · −10"
    )
  })

  test("labelled pips light individually, dot pips render without labels", () => {
    renderBand({
      ...baseHud,
      pips: {
        label: "Shanghai",
        pips: [
          { label: "S", on: true },
          { label: "D", on: false },
          { label: "T", on: false },
        ],
      },
    })
    const pips = screen.getByTestId("practice-pips")
    expect(pips).toHaveTextContent("Shanghai")
    expect(pips.querySelectorAll('[data-on="true"]')).toHaveLength(1)
    expect(pips.querySelectorAll('[data-on="false"]')).toHaveLength(2)
  })

  test("no chips row and no progress bar when the drill has neither", () => {
    renderBand({ eyebrow: "0 taken out", hero: { label: "Best", value: "—" }, chips: [] })
    expect(screen.queryByTestId("practice-chips")).not.toBeInTheDocument()
    expect(screen.queryByTestId("practice-progress")).not.toBeInTheDocument()
  })
})
