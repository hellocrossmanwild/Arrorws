# Spec 0001 — Seed Data Shape

**Status:** Ready for implementation
**Phase:** 1 (mock API)
**Depends on:** PRD Section 4 (Data Model), ADR 0001 (Mock-first build), ADR 0003 (Dart event log)

---

## Goal

Define the exact shape of `mocks/data/seed.json`, the single source of truth for all data during Phase 1. This file:

- Hydrates the in-memory store on app start
- Is hand-editable by Tom
- Conforms to the TypeScript types in `/lib/types`
- Becomes the production seed data in Phase 2

The seed must cover every state the UI needs to render, so Phase 1 components can be built and tested against realistic data without touching a backend.

Two entities in this seed are **not sample data, they are product configuration**: `practiceGameDefinitions` and `botProfiles`. They ship as real content and survive into production unchanged.

---

## What the seed file must contain

1. **One human player** and the four bot players, one per bot profile
2. **All four bot profiles**, fully specified
3. **All eight practice game definitions**, fully specified with machine-readable rules
4. **At least three completed sessions** spread over different dates, so the stats trend line has something to draw
5. **At least one completed 501 solo game** with a full, legal dart log from 501 to a checkout on a double
6. **At least one completed game containing a bust**, so bust rendering and bust stats can be tested
7. **At least one two player game** with alternating visits and both players' darts interleaved correctly
8. **At least one game against a bot**, with bot darts carrying `targetSegment` and `targetRing`
9. **At least one completed practice game of each of `around-the-clock`, `bobs-27` and `random-checkout`**, so all three scoring models are exercised
10. **One abandoned game** (`abandoned: true`, `endedAt: null` on the leg), to test how history renders an unfinished game
11. **A session with no games** in it, to test empty-state rendering
12. **Enough double attempts across the whole seed that the doubles heatmap renders with real variation**: some doubles with high hit rates, some with low, and at least three doubles with zero attempts so the "no data" cell state is exercised

Point 12 matters. A heatmap where every cell has the same value tells you nothing about whether the component works.

---

## Top-level structure

```json
{
  "players": [],
  "botProfiles": [],
  "sessions": [],
  "games": [],
  "legs": [],
  "visits": [],
  "darts": [],
  "practiceGameDefinitions": [],
  "results": []
}
```

Flat collections, joined by id. Do not nest darts inside visits inside legs in the JSON. Nesting makes the file painful to hand-edit and hides ordering bugs.

---

## Entity schemas

Field lists and types are in PRD Section 4. The notes below cover only what the PRD table cannot express.

### players

The human player is seeded with `id: "player-tom"`, `isBot: false`, `botProfileId: null`. Bot players are `id: "bot-<profileKey>"` and must reference a real profile.

### botProfiles

Seed exactly four:

| id | name | targetAverage | description |
|---|---|---|---|
| `pub` | Pub player | 45 | Enthusiastic. Finds treble 20 by accident |
| `county` | County | 75 | Solid scoring, shaky on the doubles |
| `tour-card` | Tour card | 95 | Punishes a missed double |
| `elite` | Elite | 105 | Assume the leg is over in fifteen darts |

`scoringSigmaMm` and `doubleSigmaMm` are **placeholders in this spec**. Seed them with `null` and a comment. Spec 0006 calibrates them by running the simulator and finding the scatter values that produce each target average. Do not invent numbers here.

### darts

The rules that keep the dart log legal. Anything violating these is a bug in the seed, and the seed validation test must catch it:

- `score` always equals `segment × multiplier`, where multiplier is 1 for `S`, 2 for `D`, 3 for `T`, and the whole thing is 0 for `MISS`
- Bull is `segment: 25, ring: "D", score: 50`. Outer bull is `segment: 25, ring: "S", score: 25`. There is no treble 25
- A miss off the board is `segment: 0, ring: "MISS", score: 0`
- `index` is 0, 1 or 2 and is unique within a visit
- Every dart belongs to a visit that belongs to a leg that belongs to a game
- `latencyMs` is null for the first dart of a visit, and a plausible 600 to 2500 for subsequent darts
- `targetSegment` and `targetRing` are null in x01 games for human players, and populated for every bot dart and every practice game dart

### legs and visits

- `visits.index` is per player, per leg, zero based
- A leg's visits, sorted by `(index, playerId)`, must reconstruct the correct throwing order given `startingPlayerId`
- `startingPlayerId` alternates between legs within a game

### practiceGameDefinitions

Seed all eight from PRD Section 7.4. The `rules` object is machine-readable and its exact shape per game is defined in spec 0005. Seed the eight records with `name`, `blurb`, `targetType`, `scoringModel` and `personalBestDirection` populated, and `rules` populated per spec 0005. If spec 0005 has not been written yet when this spec is implemented, seed `rules: {}` and mark it as a known gap. Do not invent rule shapes.

### results

Every completed game in the seed has a `results` row per participant. These rows must be **exactly** what the derivation produces from that game's darts. The seed validation test recomputes them and fails on any mismatch. See ADR 0003.

---

## TypeScript types

Every entity above has a corresponding TypeScript interface in `/lib/types/<entity>.ts`.

The types are the contract. Both the mock data and the eventual Phase 2 backend conform to them.

```ts
// /lib/types/dart.ts
export type Ring = 'S' | 'D' | 'T' | 'MISS'

export interface Dart {
  id: string
  visitId: string
  index: 0 | 1 | 2
  segment: number          // 1-20, 25 for the bull area, 0 for a miss
  ring: Ring
  score: number            // must equal segment * multiplier(ring)
  targetSegment: number | null
  targetRing: Ring | null
  thrownAt: string         // ISO 8601
  latencyMs: number | null
}
```

Notes:
- All timestamps are ISO 8601 strings in the JSON. The store converts to `Date` on hydration where app logic needs it
- All IDs are strings, not branded types. In Phase 2 they become real UUIDs on the backend
- Nullable fields use `| null`, not `?:`. Nullability is explicit
- `Ring`, `PracticeGameKey` and `GameMode` are union types, not strings. Widening them to `string` defeats the point

---

## The in-memory store

`/mocks/data/store.ts` provides a CRUD interface over the hydrated seed:

```ts
interface MockStore {
  players: Collection<Player>
  botProfiles: Collection<BotProfile>
  sessions: Collection<Session>
  games: Collection<Game>
  legs: Collection<Leg>
  visits: Collection<Visit>
  darts: Collection<Dart>
  practiceGameDefinitions: Collection<PracticeGameDefinition>
  results: Collection<Result>
}

interface Collection<T> {
  list: (filter?: Partial<T>) => T[]
  get: (id: string) => T | null
  create: (data: Omit<T, 'id'>) => T
  update: (id: string, data: Partial<T>) => T | null
  delete: (id: string) => boolean
}
```

Two store requirements specific to Arrows:

1. **`darts.delete` is used by undo** and must be safe to call on the most recent dart of a game. The store does not enforce tail-only deletion. The API layer does.
2. **`darts.list({ visitId })` must return darts sorted by `index`.** Order is not incidental here, it is the data.

The store is a singleton, initialised on first import by deep-cloning `seed.json`. State resets on page refresh.

---

## Acceptance criteria

- [ ] `mocks/data/seed.json` exists and is valid JSON
- [ ] Every entity from PRD Section 4 has a corresponding top-level key
- [ ] The seed covers all twelve items in "What the seed file must contain"
- [ ] TypeScript types exist in `/lib/types` for every entity, with `Ring`, `GameMode` and `PracticeGameKey` as unions
- [ ] The types match the seed exactly (`pnpm build` passes with strict mode)
- [ ] `/mocks/data/store.ts` exists and provides the `Collection<T>` interface for every entity
- [ ] The store is hydrated from `seed.json` on first import and deep-clones it
- [ ] `darts.list({ visitId })` returns darts ordered by `index`
- [ ] A seed validation test asserts: every `score` equals segment times multiplier; every foreign key resolves; every visit has one to three darts; every completed leg ends on a double or bull; no leg reaches a negative score or exactly one
- [ ] A seed validation test recomputes every `results` row from the dart log and asserts an exact match
- [ ] All four bot profiles and all eight practice game definitions are present

---

## Out of scope

- MSW handlers. Those come in each feature spec as they are needed
- Components that render the data
- The `/lib/api` client functions, which come in spec 0002
- The scoring derivation itself, which is spec 0003. This spec only needs the seed to be *legal*, and the validation test above is allowed to import from `/lib/scoring` once spec 0003 exists

---

## Notes for Claude Code

1. **Read PRD Section 4 and ADR 0003 first.** The event-sourced shape is the reason this seed looks the way it does.
2. **Generate the full seed in one pass, not incrementally.** Consistency across the joins is much easier to hold when it is written as one blob.
3. **Write the dart logs by hand from a real leg, not randomly.** A leg that goes 180, 140, 100, 81 checkout is realistic. A leg of random numbers is not, and it will make every screen look wrong in a way that is hard to diagnose.
4. **The seed is demo data and it will be looked at a lot.** Make Tom's averages plausible for a decent club player, somewhere in the high 50s to mid 60s, not 100.
5. **Do not invent the bot sigma values or the practice game rule shapes.** Both are owned by later specs. Leaving them null and flagged is correct.
