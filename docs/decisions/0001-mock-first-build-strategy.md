# 0001 — Mock-first build strategy with MSW

**Status:** Accepted
**Date:** 30 July 2026
**Deciders:** Tom Wild

---

## Context

Arrows needs to be built quickly and validated before any significant time is invested in backend infrastructure. The product is a relatively standard subscription web app — and the value of the MVP lies in the user experience and the data, not in the underlying infrastructure.

Several constraints shape this decision:

1. **Iteration speed matters more than infrastructure.** Every hour spent wiring up auth, billing, database migrations, and webhooks is an hour not spent on the actual user experience.
2. **The data shape is still being refined.** Building a real backend before the data shape is locked in would mean rework.
3. **Validation is the highest priority.** We need to know whether the product has legs before investing in production infrastructure, payment processing, and data licensing.

The traditional approach — build the backend first, then the frontend on top — would mean weeks of work before anything tangible exists. It would also lock in data shapes prematurely and make iteration painful.

Three alternatives were considered:

1. **Backend first, then frontend** — traditional approach. Slow, locks in data shapes early.
2. **Hardcoded JSON imported into components** — fastest to start, but components become coupled to mock data and have to be rewritten when the real backend arrives. Also doesn't support write operations.
3. **Mock API layer with MSW (Mock Service Worker)** — frontend uses real `fetch()` calls to real-looking URLs; MSW intercepts them in the browser and returns mocked responses from an in-memory store. Components are written exactly as they will exist in production.

---

## Decision

Arrows will be built in two distinct phases, with a hard separation between them:

### Phase 1 — Frontend with mock API

The entire frontend is built against a mock API layer powered by **Mock Service Worker (MSW)**. The mock API:

- Intercepts real `fetch()` calls in the browser
- Returns responses from an in-memory store
- Supports both reads and writes
- Is hydrated on app start from a hand-editable JSON seed file (`mocks/data/seed.json`)
- Resets state on page refresh (acceptable for prototype use)

Auth in Phase 1 is mocked via a dev-only toggle in `/lib/auth/mock-auth.ts` that lets the developer switch between anonymous, subscriber, lapsed, and admin states without any real authentication infrastructure.

There is no Postgres, no Clerk, no Stripe, and no real users in Phase 1.

### Phase 2 — Real backend integration

When Phase 1 is complete and the experience has been validated, the real backend is added:

- MSW handlers are deleted
- Real Next.js API routes are added under `/app/api`
- Clerk replaces the mock auth wrapper
- Stripe handles real billing
- Neon Postgres + Drizzle ORM replaces the in-memory store
- The seed JSON migrates into the database as production seed data

### The cardinal rule

**Frontend components must not change between Phase 1 and Phase 2.** The whole point of this architecture is that the frontend is built once. Only three things change between phases:

1. MSW handlers go away
2. Real API route handlers appear
3. The auth wrapper switches its underlying implementation

If a component needs to change to "make it work with the real backend," that's a sign that an abstraction has leaked and needs fixing.

---

## How this decision is enforced

The cardinal rule is enforced by five conventions, codified in `docs/CLAUDE.md`:

1. **Components never import from `/mocks`.** They only import from `/lib/api/*`. The API client decides whether to hit MSW (Phase 1) or real routes (Phase 2). Components never know which.

2. **Types live in `/lib/types`, shared between mock and real.** Both the mock data and the eventual real backend conform to the same TypeScript types. There is one source of truth for the data shape.

3. **Auth is abstracted in `/lib/auth`.** Components import `useUser()` from `/lib/auth`, never from Clerk directly. In Phase 1, this returns mock user state. In Phase 2, it wraps Clerk. Components don't change.

4. **The `/mocks` folder is fully deletable.** Deleting `/mocks` in Phase 2 must not break the build. Anything outside `/mocks` that needs to reach into it is a leak — fix it.

5. **API client functions use real `fetch()` calls to real-looking URLs.** Even in Phase 1. MSW intercepts them. In Phase 2, the same calls hit real Next.js route handlers without any code changes in the client layer.

---

## Consequences

### Positive

- **An interactive prototype is available within days, not weeks.** Full search, browse, and interaction, all backed by the seed JSON.
- **The mock API is the API contract.** The MSW handlers literally define the URL structure, request shapes, and response shapes. When we build the real backend, the contract is already specified.
- **Frontend iteration is dramatically faster.** No backend means no waiting for migrations, no auth flows to navigate, no Stripe webhooks to test. Changes appear in the browser immediately.
- **The data model can be refined without database migrations.** During Phase 1, changing the data shape is just editing the seed JSON and the TypeScript types. No `ALTER TABLE`, no migration scripts, no production data to worry about.
- **Phase 2 is a swap, not a rewrite.** When the real backend is added, components don't change. Only the API client implementation and the auth wrapper swap. The transition is mechanical.
- **The seed JSON becomes production seed data.** The same data curated during Phase 1 becomes the launch dataset in Phase 2.
- **Clear handoff points for Claude Code.** Each phase has unambiguous success criteria, making each phase a discrete piece of work that can be handed to Claude Code as a single brief.

### Negative

- **Discipline is required to avoid leaking mocks into components.** Without the cardinal rule and the five conventions, components can drift into importing from `/mocks` directly, which then makes Phase 2 a rewrite. The rules in CLAUDE.md exist to prevent this.
- **Some backend behaviour can't be modelled in the mock.** Things like cron jobs, webhooks, race conditions, and database constraints don't exist in MSW. These need to be tested in Phase 2 or with integration tests.
- **State doesn't persist across page refreshes in Phase 1.** This is acceptable for prototype work. Could be mitigated with localStorage hydration if it becomes a problem.

---

## What this means in practice

For the rest of Phase 1, every feature spec follows the same shape:

1. Update `/lib/types` if the data shape is changing
2. Update `mocks/data/seed.json` to include any new test data
3. Write the API client functions in `/lib/api/*` (real fetch calls, properly typed)
4. Write the MSW handlers in `/mocks/handlers/*` to satisfy those API calls
5. Build the components against the API client
6. Test the whole thing end-to-end with Vitest + Playwright

When Phase 2 begins, the only steps that change are 3 and 4 — the API client functions stay the same, but the MSW handlers are replaced by real route handlers. Everything else (types, components, tests) remains untouched.

---

## Related documents

- `docs/PRD.md` Section 10 (Build Strategy) — the high-level explanation of the two-phase approach
- `docs/PRD.md` Section 11 (Project Structure) — the folder layout that supports this decision
- `docs/CLAUDE.md` — the cardinal rule and the five conventions in their authoritative form
- ADR `0002-stack-selection.md` — the technology choices that flow from this decision
