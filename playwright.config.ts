import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 360, height: 640 },
    // Use a system-provided Chromium when the environment sets one (e.g.
    // sandboxed CI images that pre-install browsers outside Playwright).
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  webServer: {
    // E2e runs against the mock backend so the suite is hermetic and never
    // touches a real database (ADR 0005).
    command: "NEXT_PUBLIC_ENABLE_MOCKS=1 pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
