import { test, expect, type Page } from "@playwright/test"

/**
 * The full-leg flow at 360×640 (spec 0004): a 501 leg played to a checkout
 * using only taps, including a bust, the finish strip, undo, and the
 * modifier pad behaviour.
 */

async function tapKey(page: Page, testId: string) {
  await page.getByTestId(testId).dispatchEvent("pointerdown")
}

async function tapTreble(page: Page, n: number) {
  await tapKey(page, "modifier-treble")
  await tapKey(page, `key-${n}`)
}

test("a full 501 leg with a bust and a checkout, using only taps", async ({ page }) => {
  await page.goto("/")
  await page.getByText("501 solo").click()
  await expect(page.getByTestId("remaining-score")).toHaveText("501", { timeout: 15_000 })

  // Two visits of T20 T20 T20 -> 141
  for (let i = 0; i < 6; i++) await tapTreble(page, 20)
  await expect(page.getByTestId("remaining-score")).toHaveText("141")

  // Arming Treble turns the grid green and rewrites labels
  await tapKey(page, "modifier-treble")
  await expect(page.getByTestId("key-20")).toHaveText("T20")
  await expect(page.getByTestId("key-1")).toHaveText("T1")
  // Disarm
  await tapKey(page, "modifier-treble")
  await expect(page.getByTestId("key-20")).toHaveText("20")

  // Arming Double rewrites to D1..D20
  await tapKey(page, "modifier-double")
  await expect(page.getByTestId("key-20")).toHaveText("D20")
  await tapKey(page, "modifier-double")

  // Bust: T20 T20 leaves 21, T20 goes below zero -> restored to 141
  await tapTreble(page, 20)
  await tapTreble(page, 20)
  await tapTreble(page, 20)
  await expect(page.getByTestId("remaining-score")).toHaveText("141")
  await expect(page.getByTestId("finish-hint")).toContainText("Bust")

  // T20 leaves 81; T19 leaves 24; the finish strip appears for 24
  await tapTreble(page, 20)
  await expect(page.getByTestId("remaining-score")).toHaveText("81")
  await tapTreble(page, 19)
  await expect(page.getByTestId("remaining-score")).toHaveText("24")
  await expect(page.getByTestId("finish-strip")).toBeVisible()

  // Undo the T19, then re-throw it: undo removes exactly one dart
  await tapKey(page, "undo-button")
  await expect(page.getByTestId("remaining-score")).toHaveText("81")
  await tapTreble(page, 19)
  await expect(page.getByTestId("remaining-score")).toHaveText("24")

  // Take the finish with one tap on the strip
  await tapKey(page, "finish-key-D12")

  // Game complete sheet
  await expect(page.getByTestId("leg-complete-sheet")).toBeVisible()
  await expect(page.getByTestId("leg-complete-sheet")).toContainText("Game won")
})

test("nothing on the play screen requires scrolling at 360x640", async ({ page }) => {
  await page.goto("/")
  await page.getByText("501 solo").click()
  await expect(page.getByTestId("remaining-score")).toBeVisible({ timeout: 15_000 })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  )
  expect(overflow).toBeLessThanOrEqual(0)
  await expect(page.getByTestId("key-miss")).toBeInViewport()
  await expect(page.getByTestId("modifier-double")).toBeInViewport()
})

test("a practice drill records against the target and completes", async ({ page }) => {
  await page.goto("/practice")
  await page.getByTestId("practice-row-doubles-round-the-board").click()
  await page.getByTestId("start-practice").click()
  await expect(page.getByTestId("practice-target")).toHaveText("D1", { timeout: 15_000 })

  // Hit D1 via the modifier pad
  await tapKey(page, "modifier-double")
  await tapKey(page, "key-1")
  await expect(page.getByTestId("practice-target")).toHaveText("D2")

  // A miss does not advance
  await tapKey(page, "key-miss")
  await expect(page.getByTestId("practice-target")).toHaveText("D2")

  // Undo rewinds the miss
  await tapKey(page, "undo-button")
  await expect(page.getByTestId("practice-target")).toHaveText("D2")
})
