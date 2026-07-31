# CLAUDE.md

> Read this first in every session. This file is the source of truth for how the Arrows codebase is organised and how to work in it.

---

## What Arrows is

A per-dart darts scoring app for solo practice, with a set of practice games, a simulated opponent, and stats that show which doubles you actually miss.

The full product specification lives in `docs/PRD.md`. **Always read the PRD before starting any feature work.** It contains the data model, user roles, page-level requirements, and the build strategy.

Two things about this product that are easy to get wrong and are worth holding in your head from the start:

1. **It is used standing up, one handed, mid-throw.** Every interaction cost is real. A tap that takes half a second longer is a worse product, not a smaller detail.
2. **Every score is derived, never stored.** See ADR 0003. If you find yourself writing `score = score - dartValue` and saving it as the truth, stop.

---

## The two-phase build strategy

This is the most important thing to understand about how this project is structured.

### Phase 1 (done): Frontend with mock API

- The entire frontend is being built first, against a mock API
- Mock API is implemented with **MSW (Mock Service Worker)** intercepting `fetch()` calls in the browser
- Mock data lives in `mocks/data/seed.json` and is loaded into an in-memory store on app start
- The store supports full read AND write operations. State resets on page refresh
- There is **no real backend**: no Postgres, no Clerk
- Auth is mocked via a dev-only toggle (`/lib/auth/mock-auth.ts`) that lets us switch between anonymous, player and admin states

### Phase 2 (current — backend landed, Clerk pending): Real backend integration

> Status 30 July 2026: real API routes, Neon and Drizzle are live (see ADR 0005). `/mocks` was retained as an opt-in fixture for hermetic tests and zero-setup dev (`NEXT_PUBLIC_ENABLE_MOCKS=1`) rather than deleted. Clerk, Resend and PostHog are dropped — Arrows runs single-user (see ADR 0006); `lib/auth` remains the seam if that ever changes.

- MSW handlers are deleted
- Real Next.js API routes are added under `/app/api`
- Clerk replaces the mock auth wrapper
- Neon + Drizzle replaces the in-memory store
- The seed JSON migrates into the database

There is no Stripe step. Arrows is free. See PRD Section 8.

### Phase 3: Polish and launch prep

- Admin pages, edge cases, analytics, error handling, wake lock edge cases, full-fidelity stats visualisations

### The cardinal rule

**Frontend components must never change between Phase 1 and Phase 2.** The whole point of this strategy is that the frontend is built once. The only things that change between phases are:
- The MSW handlers go away
- Real API route handlers appear
- The auth wrapper switches implementations

If you find yourself wanting to change a component to "make it work with the real backend," **stop and re-read this section**. The component should not need to change. The API client layer is the only place where the implementation differs.

---

## Folder structure

```
/arrows
  /app                          ← Next.js App Router
    /(public)                   ← Public-facing routes
    /(auth)                     ← Auth routes
    /admin                      ← Admin routes
    /api                        ← Phase 2 only
  /components
    /ui                         ← shadcn components
    /play                       ← Pad, dart slots, score display, player rail
    /practice                   ← Practice list and per-game chrome
    /stats                      ← Trend line, doubles heatmap
    /admin                      ← Admin-specific components
  /lib
    /api                        ← API client (used by all components)
    /types                      ← Shared TypeScript types
    /auth                       ← Auth abstraction
    /scoring                    ← Pure engine: x01 rules, bust, checkout finder, stats
    /practice                   ← Pure engine: one rule module per practice game
    /bot                        ← Pure engine: board geometry and throw simulation
    /utils                      ← Helpers
  /mocks                        ← Phase 1 only — fully deletable in Phase 2
    /handlers                   ← MSW handlers
    /data                       ← Seed data + in-memory store
  /docs
    PRD.md                      ← Product Requirements Document
    CLAUDE.md                   ← This file
    WORKFLOW.md                 ← How specs become code
    PERFORMANCE.md              ← Performance defaults
    /specs                      ← Feature specs (one per shippable chunk)
    /decisions                  ← Decision log
  /public
  /tests
    /unit
    /integration
    /e2e
```

The full annotated structure is in `docs/PRD.md` Section 11.

### The three pure engines

`/lib/scoring`, `/lib/practice` and `/lib/bot` are the heart of this product and they follow one extra rule beyond everything below:

**They are pure. No fetch, no storage, no React, no `Date.now()` read from inside a scoring function, no `Math.random()` outside an injected seed.**

They take state in and return state out. Randomness in `/lib/bot` is supplied by an injected pseudo-random generator so bot throws are reproducible in tests. Time comes in as an argument.

This is not stylistic. It is what makes the rules testable against thousands of generated legs, and it is what lets the same engine run on a server in Phase 2 without changes.

---

## Cardinal rules for the codebase

These rules exist to make Phase 1 → Phase 2 painless. Breaking them creates work later.

### Rule 1: Components never import from `/mocks`

```ts
// ❌ NEVER
import { data } from '@/mocks/data/seed.json'
import { mockStore } from '@/mocks/data/store'

// ✅ ALWAYS
import { getGame } from '@/lib/api/game'
```

Components only know about `/lib/api`. The API client decides whether to hit MSW (Phase 1) or real routes (Phase 2). Components never know which.

### Rule 2: Types live in `/lib/types`, shared between mock and real

```ts
// /lib/types/dart.ts
export interface Dart {
  id: string
  // ...
}
```

Both the mock data and the eventual real backend conform to these types. There is one source of truth.

### Rule 3: Auth is abstracted in `/lib/auth`

Components never import from Clerk directly. They import from `/lib/auth`:

```ts
// ❌ NEVER
import { useUser } from '@clerk/nextjs'

// ✅ ALWAYS
import { useUser } from '@/lib/auth'
```

In Phase 1, `/lib/auth` exports a hook backed by a dev toggle. In Phase 2, the same module exports a hook backed by Clerk. Components don't change.

### Rule 4: The `/mocks` folder is fully deletable

When Phase 2 begins, deleting `/mocks` must not break the build. If anything outside `/mocks` ever needs to reach into it, that's a leak. Fix it.

### Rule 5: API client functions return promises and look like real fetch calls

Even in Phase 1, the API client must use real `fetch()` calls to real-looking URLs:

```ts
// /lib/api/dart.ts
export async function throwDart(gameId: string, dart: DartInput): Promise<GameState> {
  const res = await fetch(`/api/games/${gameId}/darts`, {
    method: 'POST',
    body: JSON.stringify(dart),
  })
  if (!res.ok) throw new Error('Failed to record dart')
  return res.json()
}
```

MSW intercepts this fetch in Phase 1. In Phase 2, the same fetch hits a real route handler. The API client doesn't change between phases.

### Rule 6 (Arrows only): the dart event log is the truth

Never store a running score as authoritative state. Never mutate a dart after it is written. Undo is implemented as "delete the last dart and re-derive", never as "add the value back on".

Full reasoning in ADR 0003. This rule is the reason undo, bust handling, retrospective stats and the dart-by-dart history replay are all cheap instead of each being their own feature.

---

## Working with specs

Feature work is driven by specs in `/docs/specs`. Each spec is a self-contained brief for one shippable chunk of work.

A spec contains:
- **Goal** — what we're building and why
- **User stories** — who does what
- **Acceptance criteria** — what counts as "done" (these become tests)
- **API contract** — endpoints, request shapes, response shapes
- **UI components** — what gets built and where it lives
- **Data model changes** — any new fields or tables (added to `lib/types` and the seed JSON)
- **Out of scope** — what we're explicitly NOT doing in this chunk

### How to work a spec

1. Read the spec in full
2. Read the relevant sections of `docs/PRD.md` for context
3. Read this file (CLAUDE.md) again if it's been a while
4. Read `docs/WORKFLOW.md` for the test-driven loop
5. Update `lib/types` first if the data shape is changing
6. Update `mocks/data/seed.json` to include any new test data
7. Write the API client functions in `lib/api/*` (with TypeScript types)
8. Write the MSW handlers in `mocks/handlers/*` to satisfy those API calls
9. Write failing tests for each acceptance criterion
10. Build the components to make the tests pass
11. Run the full test suite
12. Update the spec status

### Build order

Specs are ordered by build sequence. Do not jump ahead. The order exists because the pure engines have to be right before any UI is worth building.

| Spec | Title | Why it's here |
|---|---|---|
| 0001 | Seed data shape | Defines the types everything else conforms to |
| 0002 | Foundation | Project scaffolding, MSW wiring, mock auth |
| 0003 | Scoring engine | Pure x01 rules and the checkout finder. No UI |
| 0004 | Throw pad and live game screen | The product. Depends on 0003 |
| 0005 | Practice games engine and screens | Depends on 0003 and 0004 |
| 0006 | Bot opponent | Depends on 0003. Independent of 0005 |
| 0007 | Stats, history and the doubles heatmap | Depends on everything having produced dart events |

### Specs naming convention

`NNNN-feature-name.md` where NNNN is a four-digit number for ordering. New specs are added at the end with the next number.

---

## Decision log

Architectural and product decisions are recorded in `/docs/decisions/NNNN-decision-name.md` using a lightweight ADR format.

The existing ADRs are:

- **ADR 0001** — Mock-first build strategy with MSW
- **ADR 0002** — Stack selection
- **ADR 0003** — The dart event log is the single source of truth
- **ADR 0004** — Modifier pad as the only input method
- **ADR 0005** — Phase 2 backend: Neon + Drizzle behind the unchanged contract, mocks retained as a test fixture
- **ADR 0006** — Single-user posture: no Clerk, no Resend, no PostHog

When making any non-trivial decision (choice of library, architecture pattern, data model change), create an ADR. They live forever and explain the "why" behind the code. Use `docs/decisions/TEMPLATE.md` as the starting point.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Hosting | Vercel |
| Database (Phase 2) | Neon Postgres |
| ORM (Phase 2) | Drizzle |
| Auth | None — single-user, Vercel Deployment Protection (ADR 0006) |
| Billing | None. The product is free |
| UI components | shadcn/ui (copied into `/components/ui`) |
| Styling | Tailwind CSS |
| Mock API (Phase 1) | MSW (Mock Service Worker) |
| Forms | React Hook Form + Zod |
| Testing | Vitest (unit/integration), Playwright (e2e) |
| Email | None (ADR 0006) |
| Errors | Sentry |
| Analytics | None — the stats screens are the analytics (ADR 0006) |

**Stack override:** Stripe is removed. There is no billing in this product in any phase. Do not add it, do not scaffold for it. See ADR 0002 and PRD Section 8.

---

## Testing strategy

We use a test-driven approach. For each feature spec:

1. **Unit tests** for utility functions and data transformations
2. **Integration tests** for API client functions (using MSW in Phase 1, mocked routes in Phase 2)
3. **Component tests** for interactive UI (using Vitest + Testing Library)
4. **End-to-end tests** for critical user flows (using Playwright)

Tests live in `/tests`. Mirror the source structure.

**Arrows-specific testing requirement.** The scoring engine gets property-based tests as well as example-based ones. Generate thousands of random dart sequences and assert the invariants hold every time:

- Remaining score is never negative
- Remaining score is never exactly 1
- A leg only ends on a double (or bull)
- Replaying the full dart log always reproduces the current state exactly
- Undoing every dart in a leg returns the state to the starting score with zero darts thrown
- Total scored plus remaining always equals the starting score

**Run tests with:**
```bash
pnpm test          # all tests
pnpm test:unit     # unit only
pnpm test:e2e      # playwright
```

Tests must pass before any PR is merged.

---

## Conventions

### Naming

- Components: `PascalCase` — `ThrowPad.tsx`, `DartSlots.tsx`
- Functions and variables: `camelCase` — `getGame`, `findCheckout`
- Types and interfaces: `PascalCase` — `Dart`, `Visit`, `BotProfile`
- Files: `kebab-case` for non-component files — `checkout-finder.ts`, `board-geometry.ts`
- Routes: `kebab-case` — `/practice/random-checkout`

### Darts terminology

Use the real vocabulary consistently in code and in the UI. It is not decoration, it prevents ambiguity:

- **Visit** — one turn of up to three darts. Not "turn", not "round"
- **Leg** — one game to zero from the starting score
- **Ton** — 100 or more scored in a visit
- **Checkout** — the finishing visit. **Finish** is the route. **Double out** is the rule
- **Bust** — a visit that takes the score below zero, to exactly one, or to zero without a double
- **Oche** — the throwing line
- **Three-dart average** — total scored divided by darts thrown, times three. Always call it this, never just "average" in code

### User-facing copy

- CTA wording: the house rule is always "Subscribe" (never "Sign up" or "Join"). **Arrows has no subscription**, so this rule has nothing to apply to. Account creation uses "Create account". If a paid tier is ever added, the house rule applies from that day.
- Sentence case everywhere. No exclamation marks. The app does not congratulate the user
- Empty states state the action: "No sessions yet. Throw a leg."

### Imports

Use absolute imports via the `@/` alias:

```ts
import { getGame } from '@/lib/api/game'
import { Dart } from '@/lib/types/dart'
import { Button } from '@/components/ui/button'
```

### Styling

Tailwind utility classes only. No CSS modules, no styled-components. Follow shadcn/ui patterns. Dark mode is the default and the only mode in the throwing UI.

### State management

- Server state: React Query (or Next.js native fetch + revalidation)
- Local UI state: `useState`, `useReducer`
- The live game state is a `useReducer` over the dart event list. Not a global store
- No Redux, no Zustand, no global state libraries unless we hit a real need
- See `docs/PERFORMANCE.md` for data fetching patterns, skeleton timing, and optimistic mutation defaults

### Optimistic updates are mandatory in the throwing UI

A dart tap must update the screen immediately, before the network round trip. The dart is appended to local state, the state is re-derived, and the API call is fired after. If it fails, roll back and surface a toast. Nobody standing at the oche waits for a spinner.

### Forms

React Hook Form for the form layer, Zod for validation schemas. There are almost no forms in this product.

### Error handling

- API client functions throw on non-2xx responses
- Components use error boundaries for catastrophic failures
- User-facing errors use the shadcn `<Toast>` component

---

## How to start a session

When starting a new session on this project:

1. Read this file (`docs/CLAUDE.md`) first
2. Read `docs/PRD.md` for the product context
3. Read `docs/PERFORMANCE.md` before any UI work
4. Check `docs/specs/` for the spec you're working on, and respect the build order above
5. Check `docs/decisions/` for any recent ADRs that affect your work
6. Confirm the current phase (1, 2, or 3). Currently **Phase 2 complete** (see ADRs 0005 and 0006); Phase 3 is polish
7. Confirm what's in scope vs. out of scope before writing any code

---

## Things to never do

- Never store a running score as the source of truth. Derive it from the dart log
- Never mutate or edit a dart record after it is written
- Never add a second input method. One pad. See ADR 0004
- Never build offline support, sync, or a service worker. It is explicitly out of scope
- Never add billing, Stripe, or paywall logic
- Never put secrets or API keys in the codebase
- Never commit `.env` files (`.env.local` only, gitignored)
- Never push directly to `main` (use feature branches and PRs)
- Never merge a PR with failing tests
- Never import from `/mocks` outside of `/mocks` itself (or `/lib/api`)
- Never use `any` in TypeScript without a comment explaining why
- Never add a dependency without a reason recorded somewhere (ADR or PR description)
- Never change the database schema without updating `/lib/types` and the seed JSON in the same PR
- Never disable a test to make a build pass
