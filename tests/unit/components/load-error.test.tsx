import { describe, expect, test, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LoadError } from "@/components/ui/LoadError"

/**
 * The regression this exists for: `/jdc` sat blank on a 500
 * because the fetch was `.catch(() => {})`. A failed load has to say it
 * failed, and offer a way out.
 */
describe("LoadError", () => {
  test("names what failed and offers a retry", () => {
    render(<LoadError what="the record" onRetry={vi.fn()} />)
    expect(screen.getByTestId("load-error")).toHaveTextContent("Could not load the record.")
    expect(screen.getByTestId("load-error-retry")).toBeInTheDocument()
  })

  test("retrying calls back so the screen can refetch", async () => {
    const onRetry = vi.fn()
    render(<LoadError what="your programme" onRetry={onRetry} />)
    await userEvent.click(screen.getByTestId("load-error-retry"))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  test("the retry is a real tap target on a tablet at the oche", () => {
    render(<LoadError what="the record" onRetry={vi.fn()} />)
    expect(screen.getByTestId("load-error-retry").className).toContain("min-h-[44px]")
  })
})
