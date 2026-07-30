import { test, expect } from "@playwright/test"

test("homepage loads with the four entry points", async ({ page }) => {
  await page.goto("/")
  const main = page.getByRole("main")
  await expect(main.getByText("501 solo")).toBeVisible()
  await expect(main.getByText("501 vs bot")).toBeVisible()
  await expect(main.getByText("Two player")).toBeVisible()
  await expect(main.getByText("Practice")).toBeVisible()
})

test("the mock auth toggle switches user states", async ({ page }) => {
  await page.goto("/")
  const toggle = page.getByTestId("mock-auth-toggle")
  await expect(toggle).toBeVisible()
  await toggle.getByRole("button", { name: /mock auth/i }).click()
  await toggle.getByRole("button", { name: "Anonymous" }).click()
  await expect(page.getByText(/playing without an account/i)).toBeVisible()
})
