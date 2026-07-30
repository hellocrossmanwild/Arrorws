import { describe, expect, test, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ThrowPad } from "@/components/play/ThrowPad"
import { DartSlots } from "@/components/play/DartSlots"
import { FinishStrip } from "@/components/play/FinishStrip"
import { dart, seg } from "@/tests/helpers/darts"

const press = (el: HTMLElement) => fireEvent.pointerDown(el)

describe("ThrowPad", () => {
  test("a single takes exactly one tap", () => {
    const onThrow = vi.fn()
    render(<ThrowPad onThrow={onThrow} clearKey={0} />)
    press(screen.getByTestId("key-20"))
    expect(onThrow).toHaveBeenCalledWith({ segment: 20, ring: "S" })
    expect(onThrow).toHaveBeenCalledTimes(1)
  })

  test("a treble takes exactly two taps", () => {
    const onThrow = vi.fn()
    render(<ThrowPad onThrow={onThrow} clearKey={0} />)
    press(screen.getByTestId("modifier-treble"))
    press(screen.getByTestId("key-20"))
    expect(onThrow).toHaveBeenCalledOnce()
    expect(onThrow).toHaveBeenCalledWith({ segment: 20, ring: "T" })
  })

  test("arming Double rewrites every label to D1 through D20 and colours the grid", () => {
    render(<ThrowPad onThrow={() => {}} clearKey={0} />)
    press(screen.getByTestId("modifier-double"))
    for (let n = 1; n <= 20; n++) {
      const key = screen.getByTestId(`key-${n}`)
      expect(key).toHaveTextContent(new RegExp(`^D${n}$`))
      expect(key.className).toContain("bg-dbl")
    }
  })

  test("arming Treble rewrites every label to T1 through T20 and colours the grid green", () => {
    render(<ThrowPad onThrow={() => {}} clearKey={0} />)
    press(screen.getByTestId("modifier-treble"))
    for (let n = 1; n <= 20; n++) {
      const key = screen.getByTestId(`key-${n}`)
      expect(key).toHaveTextContent(new RegExp(`^T${n}$`))
      expect(key.className).toContain("bg-trb")
    }
  })

  test("the modifiers are mutually exclusive and tapping an armed one disarms it", () => {
    render(<ThrowPad onThrow={() => {}} clearKey={0} />)
    press(screen.getByTestId("modifier-double"))
    expect(screen.getByTestId("modifier-double")).toHaveAttribute("aria-pressed", "true")
    press(screen.getByTestId("modifier-treble"))
    expect(screen.getByTestId("modifier-double")).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByTestId("modifier-treble")).toHaveAttribute("aria-pressed", "true")
    press(screen.getByTestId("modifier-treble"))
    expect(screen.getByTestId("modifier-treble")).toHaveAttribute("aria-pressed", "false")
  })

  test("the modifier clears after exactly one dart", () => {
    const onThrow = vi.fn()
    render(<ThrowPad onThrow={onThrow} clearKey={0} />)
    press(screen.getByTestId("modifier-double"))
    press(screen.getByTestId("key-16"))
    expect(onThrow).toHaveBeenCalledWith({ segment: 16, ring: "D" })
    expect(screen.getByTestId("key-16")).toHaveTextContent(/^16$/)
    press(screen.getByTestId("key-16"))
    expect(onThrow).toHaveBeenLastCalledWith({ segment: 16, ring: "S" })
  })

  test("the modifier clears when clearKey changes (undo, visit change)", () => {
    const { rerender } = render(<ThrowPad onThrow={() => {}} clearKey={0} />)
    press(screen.getByTestId("modifier-double"))
    expect(screen.getByTestId("key-1")).toHaveTextContent("D1")
    rerender(<ThrowPad onThrow={() => {}} clearKey={1} />)
    expect(screen.getByTestId("key-1")).toHaveTextContent(/^1$/)
  })

  test("bull keys are unaffected by an armed modifier and clear it", () => {
    const onThrow = vi.fn()
    render(<ThrowPad onThrow={onThrow} clearKey={0} />)
    press(screen.getByTestId("modifier-treble"))
    press(screen.getByTestId("key-bull"))
    expect(onThrow).toHaveBeenCalledWith({ segment: 25, ring: "D" })
    expect(screen.getByTestId("modifier-treble")).toHaveAttribute("aria-pressed", "false")
    press(screen.getByTestId("modifier-double"))
    press(screen.getByTestId("key-25"))
    expect(onThrow).toHaveBeenLastCalledWith({ segment: 25, ring: "S" })
  })

  test("MISS records segment 0 ring MISS", () => {
    const onThrow = vi.fn()
    render(<ThrowPad onThrow={onThrow} clearKey={0} />)
    press(screen.getByTestId("key-miss"))
    expect(onThrow).toHaveBeenCalledWith({ segment: 0, ring: "MISS" })
  })

  test("a disabled pad ignores taps, visibly", () => {
    const onThrow = vi.fn()
    render(<ThrowPad onThrow={onThrow} disabled clearKey={0} />)
    press(screen.getByTestId("key-20"))
    expect(onThrow).not.toHaveBeenCalled()
    expect(screen.getByTestId("throw-pad").className).toContain("opacity-40")
  })
})

describe("DartSlots", () => {
  test("slots colour red for doubles and green for trebles", () => {
    render(
      <DartSlots
        darts={[dart(seg("D16")), dart(seg("T20")), dart(seg("5"))]}
      />
    )
    expect(screen.getByTestId("dart-slot-0").className).toContain("bg-dbl")
    expect(screen.getByTestId("dart-slot-0")).toHaveTextContent("D16")
    expect(screen.getByTestId("dart-slot-1").className).toContain("bg-trb")
    expect(screen.getByTestId("dart-slot-1")).toHaveTextContent("T20")
    expect(screen.getByTestId("dart-slot-2").className).toContain("bg-bed")
  })

  test("empty slots render empty", () => {
    render(<DartSlots darts={[]} />)
    expect(screen.getByTestId("dart-slot-0")).toHaveTextContent("")
  })
})

describe("FinishStrip", () => {
  test("offers the route's segments as one-tap keys recording the same dart as the grid", () => {
    const onThrow = vi.fn()
    render(
      <FinishStrip
        route={[seg("T20"), seg("D18")]}
        onThrow={onThrow}
      />
    )
    press(screen.getByTestId("finish-key-T20"))
    expect(onThrow).toHaveBeenCalledWith({ segment: 20, ring: "T" })
    press(screen.getByTestId("finish-key-D18"))
    expect(onThrow).toHaveBeenLastCalledWith({ segment: 18, ring: "D" })
  })
})
