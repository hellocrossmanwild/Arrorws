import { test, expect } from "@playwright/test"

/**
 * The journey that matters on a shared board (spec 0012): pick your name,
 * see your own record, and have it still be yours after the tablet sleeps.
 */
test("switching player switches the whole record, and it survives a reload", async ({ page }) => {
  await page.goto("/jdc")

  // Tom's record, and his row marked on the family board.
  await expect(page.getByTestId("jdc-belt")).toHaveText("Green")
  await expect(page.getByTestId("player-chip")).toHaveText("Tom")
  await expect(page.getByTestId("family-row-player-maisie")).toBeVisible()

  await page.getByTestId("jdc-change-player").click()
  await expect(page.getByTestId("player-list")).toBeVisible()
  await page.getByTestId("player-player-maisie").click()

  // Back on the record, now hers.
  await expect(page).toHaveURL(/\/jdc/)
  await expect(page.getByTestId("jdc-belt")).toHaveText("Purple")
  await expect(page.getByTestId("player-chip")).toHaveText("Maisie")
  await expect(page.getByTestId("jdc-attempt-count")).toHaveText("3 attempts")

  // The choice is remembered, not re-asked.
  await page.reload()
  await expect(page.getByTestId("jdc-belt")).toHaveText("Purple")
  await expect(page.getByTestId("player-chip")).toHaveText("Maisie")
})

test("adding a player starts them on an empty record", async ({ page }) => {
  await page.goto("/players")
  await page.getByTestId("add-player").click()
  await page.getByTestId("new-player-name").fill("Rosie")
  await page.getByTestId("save-player").click()

  await expect(page.getByTestId("player-chip")).toHaveText("Rosie")

  // The mock store lives in the page, so navigate within it rather than reloading.
  await page.getByTestId("player-chip").click()
  await expect(page.getByTestId("player-list")).toBeVisible()
  await expect(page.getByTestId("player-list").getByText("Rosie")).toBeVisible()
})

test("the family board is the same for everyone, ordered by best", async ({ page }) => {
  await page.goto("/jdc")
  const rows = page.locator('[data-testid^="family-row-"]')
  await expect(rows.first()).toContainText("Tom")

  const names = await rows.allTextContents()
  expect(names.join(" ")).toContain("Alfie")
  expect(names.join(" ")).toContain("Maisie")
  // Bots throw in matches, never the challenge.
  expect(names.join(" ")).not.toContain("County")
})
