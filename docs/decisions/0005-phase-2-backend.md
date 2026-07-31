# ADR 0005 — Phase 2 backend: Neon + Drizzle behind the unchanged API contract, mocks retained as a test fixture

**Status:** Accepted
**Date:** 30 July 2026

---

## Context

Phase 1 shipped the full frontend against MSW (ADR 0001). Phase 2 replaces the mock backend with real infrastructure. ADR 0001 planned for `/mocks` to be deleted at this point, and for Clerk to replace mock auth.

## Decision

1. **Real API routes** live under `/app/api`, served by `lib/server/service.ts` over Neon Postgres via Drizzle (`lib/db`). The routes implement byte-for-byte the same contract the MSW handlers mocked. Frontend components, the API client and the pure engines did not change — the cardinal rule held.

2. **The dart event log stays the truth in the database.** The `darts` table is append-only with a `seq` total order; undo deletes the tail row; every response state is derived by replaying the log through `lib/scoring` / `lib/practice` on the server. `results` remains a non-authoritative cache written at game end.

3. **`/mocks` is retained, not deleted — as an opt-in fixture.** Deviation from ADR 0001, for two reasons:
   - The Vitest integration suite and the whole Playwright suite run hermetically against the mock backend, with no database, no network and no test-data pollution. Playwright boots the app with `NEXT_PUBLIC_ENABLE_MOCKS=1`.
   - Zero-setup dev: a contributor without a `DATABASE_URL` can still run the entire app.

   The mock worker only starts when `NEXT_PUBLIC_ENABLE_MOCKS=1`. Nothing outside `/mocks` imports from it (rule 4 intact), and production never loads it. Cost: the MSW handlers and `lib/server/service.ts` implement the contract twice and can drift; the shared pure engines carry almost all the logic, and the integration suite pins the contract.

4. **Clerk is deferred.** Wiring Clerk needs an app + keys created in Tom's Clerk account, which did not exist at implementation time. Production currently runs the anonymous flow mapped to the seeded `player-tom` — correct for a single-user personal app. `lib/auth` remains the only auth import site, so the Clerk swap stays a two-file change. This is the top remaining Phase 2 item.

5. **Production seed is configuration only** — players, bot profiles and practice game definitions. The sample game history in `mocks/data/seed.json` is demo data for the mock store and does not go to production; Tom's live stats start from his real darts.

6. **Sessions** reuse an open session younger than three hours; older open sessions are closed automatically when a new game starts.

## Consequences

- Deleting `/mocks` later (once route-handler tests run against a Neon test branch) is still possible and still cheap.
- The contract has one implementation per environment: MSW in tests/demos, Postgres in dev-with-database and production.
- Anyone adding an endpoint must add it in both `mocks/handlers` and `lib/server/service.ts` until the mock fixture is retired.
