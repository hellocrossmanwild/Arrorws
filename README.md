# Arrows

A per-dart darts scoring app for solo practice, with a set of practice games, a simulated opponent, and stats that show which doubles you actually miss.

Currently in **Phase 1**: the entire frontend runs against a mock API (MSW + a hand-editable JSON seed). There is no real backend yet — see `docs/PRD.md` Section 10 and ADR 0001.

## Setup

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Tests

```bash
pnpm test         # Vitest unit + integration (includes 10k-sequence property tests)
pnpm test:unit    # unit only
pnpm test:e2e     # Playwright (starts the dev server itself)
pnpm build        # production build, strict TypeScript
pnpm lint         # ESLint
```

## Useful scripts

```bash
pnpm seed:generate   # regenerate mocks/data/seed.json deterministically
pnpm bot:calibrate   # re-derive bot sigma values (commit into lib/bot/calibration.ts)
```

## Where things live

Read `docs/CLAUDE.md` first — it is the source of truth for how this codebase is organised, the Phase 1 → Phase 2 strategy, and the cardinal rules (components never import from `/mocks`; every score is derived from the dart event log, never stored).

- `lib/scoring`, `lib/practice`, `lib/bot` — the three pure engines. Production code from day one.
- `lib/api` — the API client every component uses. MSW intercepts it in Phase 1.
- `mocks/` — Phase 1 only. Fully deletable when the real backend lands.
- `docs/` — PRD, workflow, performance defaults, ADRs and feature specs.
