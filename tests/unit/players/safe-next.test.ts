import { describe, expect, test } from "vitest"
import { safeNext } from "@/lib/utils/safe-next"

describe("safeNext", () => {
  test("keeps an ordinary same-origin path, query and hash included", () => {
    expect(safeNext("/jdc")).toBe("/jdc")
    expect(safeNext("/training/run/abc")).toBe("/training/run/abc")
    expect(safeNext("/stats?range=30#doubles")).toBe("/stats?range=30#doubles")
  })

  test("falls back home when there is nothing to go back to", () => {
    expect(safeNext(null)).toBe("/")
    expect(safeNext(undefined)).toBe("/")
    expect(safeNext("")).toBe("/")
  })

  test("refuses a scheme — the finding that prompted this", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/")
    expect(safeNext("JavaScript:alert(1)")).toBe("/")
    expect(safeNext("data:text/html,<script>alert(1)</script>")).toBe("/")
    expect(safeNext("https://evil.example.com")).toBe("/")
  })

  test("refuses protocol-relative targets, backslash variants included", () => {
    expect(safeNext("//evil.example.com")).toBe("/")
    expect(safeNext("/\\evil.example.com")).toBe("/")
    expect(safeNext("/\\\\evil.example.com")).toBe("/")
  })

  test("a relative path with no leading slash is not followed either", () => {
    expect(safeNext("jdc")).toBe("/")
    expect(safeNext("../admin")).toBe("/")
  })
})
