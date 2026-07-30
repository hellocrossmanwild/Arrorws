# Spec 0002 — Foundation

**Status:** Draft
**Phase:** 1 (mock API)
**Depends on:** Spec 0001 (Seed Data Shape), ADR 0001 (Mock-first build), ADR 0002 (Stack selection)

---

## Goal

Set up the Arrows project from scratch with everything needed before any feature work begins:

- Next.js project initialised with TypeScript and Tailwind
- shadcn/ui installed and configured for dark mode
- Folder structure matching CLAUDE.md
- MSW installed and intercepting `fetch()` calls in development
- The seed data loaded into the in-memory store on app start
- Mock auth wrapper with a dev toggle to switch between user states
- Base API client structure (empty, ready for feature specs to extend)
- Routing skeleton with a layout shell and placeholder pages
- Testing infrastructure (Vitest + Playwright) ready to run

When this spec is done, the app boots, MSW is intercepting calls, the mock auth toggle works, and there's a navigable but empty shell ready for feature work.

---

## Acceptance criteria

- [ ] `pnpm dev` boots a Next.js app at `localhost:3000`
- [ ] Visiting `/` shows a placeholder homepage
- [ ] Dark mode is the default theme
- [ ] MSW is initialised in development and logs intercepted requests to the console
- [ ] The seed JSON is loaded into the in-memory store on app start
- [ ] A dev-only floating "Mock Auth" toggle button in the bottom-right corner of every page lets the developer switch between: Anonymous, Player, Admin
- [ ] The current mock auth state persists across page navigations within a session (resets on refresh)
- [ ] `useUser()` from `@/lib/auth` returns the currently selected mock user
- [ ] All TypeScript types from spec 0001 exist in `/lib/types`
- [ ] `pnpm test` runs Vitest and reports zero tests passing (no tests yet)
- [ ] `pnpm test:e2e` runs Playwright and the basic smoke test passes (the app loads)
- [ ] `pnpm build` produces a clean production build with no TypeScript errors
- [ ] `pnpm lint` runs ESLint and reports no errors
- [ ] The repository has a `.gitignore` that excludes `node_modules`, `.next`, `.env.local`, and Playwright artifacts
- [ ] A `README.md` exists with setup instructions: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm test:e2e`

---

## Folder structure to create

This is the full Phase 1 starting structure. Empty files / placeholder content where noted.

```
/arrows
  /app
    layout.tsx                          ← Root layout, dark mode default, MSW init
    page.tsx                            ← Placeholder homepage
    /(public)
      (product-specific routes go here as feature specs are added)
    /(auth)
      /login
        page.tsx                        ← Placeholder login (no real auth)
      /signup
        page.tsx                        ← Placeholder signup (no real auth)
      /account
        page.tsx                        ← Placeholder account page
    /admin
      page.tsx                          ← Placeholder admin dashboard
  /components
    /ui                                 ← shadcn components (button, input, dialog, etc.)
    /layout
      Header.tsx                        ← Site header
      Footer.tsx                        ← Site footer
    /dev
      MockAuthToggle.tsx                ← Dev-only floating toggle
  /lib
    /api
      client.ts                         ← Base fetch wrapper with error handling
      (empty stubs, filled by feature specs)
    /types
      (from spec 0001)
      index.ts                          ← Re-exports everything
    /auth
      mock-auth.ts                      ← Mock auth state, useUser() hook
      index.ts                          ← Re-exports useUser, useIsAdmin, etc.
    /utils
      cn.ts                             ← Tailwind class merger (from shadcn)
  /mocks
    /handlers
      index.ts                          ← Empty array for now (filled in subsequent specs)
    /data
      seed.json                         ← From spec 0001
      store.ts                          ← In-memory store (from spec 0001)
    browser.ts                          ← MSW browser worker setup
    setup.ts                            ← Conditional MSW init (dev only)
  /docs
    (existing — PRD, CLAUDE, WORKFLOW, etc.)
  /public
    /logo.svg                           ← Placeholder logo
  /tests
    /unit                               ← Empty
    /integration                        ← Empty
    /e2e
      smoke.spec.ts                     ← Basic "app loads" test
  .gitignore
  .eslintrc.json
  next.config.js
  package.json
  postcss.config.js
  README.md
  tailwind.config.ts
  tsconfig.json
  vitest.config.ts
  playwright.config.ts
```

---

## Key implementation details

### 1. Next.js project setup

```bash
pnpm create next-app@latest arrows --typescript --tailwind --eslint --app --src-dir false --import-alias "@/*"
```

After creation, install the additional dependencies:

```bash
pnpm add msw@latest react-hook-form zod @hookform/resolvers zustand
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
pnpm add -D @playwright/test
```

*Zustand is used solely for the mock-auth toggle (a small dev-only state container). It does NOT imply using zustand for app state — see CLAUDE.md state management rules.*

### 2. shadcn/ui setup

```bash
pnpm dlx shadcn@latest init
```

Configure for dark mode by default. Install the initial components:

```bash
pnpm dlx shadcn@latest add button input dialog dropdown-menu toast sonner card
```

### 3. Dark mode by default

In `app/layout.tsx`:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground">
        <MSWProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <MockAuthToggle />
        </MSWProvider>
      </body>
    </html>
  )
}
```

### 4. MSW initialisation

In `mocks/setup.ts`:

```ts
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const { worker } = await import("./browser")
  worker.start({ onUnhandledRequest: "warn" })
}
```

In `mocks/browser.ts`:

```ts
import { setupWorker } from "msw/browser"
import { handlers } from "./handlers"

export const worker = setupWorker(...handlers)
```

The `MSWProvider` component in `/components/dev/MSWProvider.tsx` runs the setup on mount in dev only.

### 5. Mock auth wrapper

In `lib/auth/mock-auth.ts`:

```ts
import { create } from "zustand"
import type { User } from "@/lib/types"

type MockAuthState =
  | { type: "anonymous" }
  | { type: "user"; user: User }

interface MockAuthStore {
  state: MockAuthState
  setState: (state: MockAuthState) => void
}

export const useMockAuthStore = create<MockAuthStore>((set) => ({
  state: { type: "anonymous" },
  setState: (state) => set({ state }),
}))

export function useUser(): User | null {
  const state = useMockAuthStore((s) => s.state)
  return state.type === "user" ? state.user : null
}

export function useIsAdmin(): boolean {
  const user = useUser()
  return user?.role === "admin"
}
```

In `lib/auth/index.ts`:

```ts
export { useUser, useIsAdmin } from "./mock-auth"
```

In Phase 2, `mock-auth.ts` is deleted and `index.ts` becomes a Clerk wrapper. Components only import from `@/lib/auth`.

### 6. Base API client

In `lib/api/client.ts`:

```ts
export async function apiClient<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Unknown error" }))
    throw new Error(error.message || `Request failed: ${res.status}`)
  }
  return res.json()
}
```

### 7. Vitest config

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
})
```

### 8. Playwright config

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
})
```

### 9. Smoke test

```ts
// tests/e2e/smoke.spec.ts
import { test, expect } from "@playwright/test"

test("homepage loads", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("body")).toBeVisible()
})
```

---

## Out of scope

- Real auth (Clerk) — Phase 2
- Billing — never. Arrows is free. There is no subscription state on the user record. See ADR 0002
- Real database — Phase 2
- Any actual product feature — those are in subsequent specs
- Designed pages — placeholder layouts only
- Logo design — use a temporary text-only wordmark

---

## Notes for Claude Code

1. Work through the folder structure top to bottom — create the empty placeholder files first, then fill in the implementation files
2. Get `pnpm dev` working with a placeholder homepage before installing MSW
3. Add MSW after the basic app boots — verify the worker is intercepting at least one test request before moving on
4. The mock auth toggle should be tested manually by switching between users and confirming `useUser()` returns the right thing
5. The smoke test is the only test in this spec — we're not building features yet, just the foundation
6. If anything in this spec conflicts with CLAUDE.md or any ADR, the ADR/CLAUDE.md wins. Flag the conflict and ask for clarification.
