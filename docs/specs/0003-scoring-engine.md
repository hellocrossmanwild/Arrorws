# Spec 0003 — Scoring engine

**Status:** Implemented
**Implemented:** 30 July 2026
**Phase:** 1 (mock API)
**Depends on:** Spec 0001, Spec 0002, ADR 0003, PRD Section 4

---

## Goal

Build `/lib/scoring`: the pure, dependency-free engine that turns a list of darts into game state, and answers the two questions the rest of the app keeps asking. What is the state right now, and what is the finish from here.

There is no UI in this spec. It ships as TypeScript modules and a test suite. Every subsequent spec depends on it, so it needs to be right before anything is drawn.

---

## User stories

> As a **player**, I can throw a dart that takes me below zero and have the visit correctly declared a bust with my score restored, so the rules are the real rules.

> As a **player**, I can undo any dart, including the one that busted or won the leg, and land back exactly where I was.

> As a **player**, I can see the finish from my current score, so I do not have to do the arithmetic while holding three darts.

> As **Claude Code**, I can compute any historical statistic by replaying a dart log, without needing anything to have been recorded at the time beyond the darts themselves.

---

## Modules

### `/lib/scoring/segments.ts`

The vocabulary. A `Segment` is `{ segment, ring }`. Exports:

- `SEGMENTS` — every legal segment: singles 1 to 20, doubles 1 to 20, trebles 1 to 20, outer bull (25 S), bull (25 D), and miss
- `scoreOf(segment: Segment): number`
- `isDouble(segment: Segment): boolean` — true for `D` rings and for bull. **Bull counts as a double for checkout purposes.** This is the single most commonly mis-implemented rule in darts software
- `labelOf(segment: Segment): string` — `T20`, `D16`, `BULL`, `25`, `MISS`

### `/lib/scoring/derive.ts`

The heart of the product.

```ts
export function deriveGameState(darts: Dart[], config: X01Config): GameState
```

A pure fold. No I/O, no clock, no randomness. Given the ordered dart log for a game and its config, it returns:

```ts
interface GameState {
  players: PlayerState[]        // score, dartsThrown, visits, legsWon
  currentPlayerId: string
  currentVisit: Dart[]          // 0 to 2 darts already thrown this visit
  visitStartScore: number       // what the score reverts to on a bust
  lastVisit: VisitSummary | null
  legComplete: boolean
  winnerPlayerId: string | null
  gameComplete: boolean
}
```

The fold, per dart:

1. Append the dart to the current visit and increment the thrower's darts thrown. **Darts thrown always increments, including on a bust.** A busted dart is still a dart
2. Compute `next = score - dartScore`
3. If `next < 0`, or `next === 1`, or (`next === 0` and the dart is not a double): the visit is a **bust**. Restore the score to `visitStartScore`, end the visit, pass the throw
4. Otherwise set the score to `next`
5. If `next === 0`: the leg is won by the current player. End the visit and the leg
6. Otherwise, if the visit now has three darts: end the visit, pass the throw

Ending a visit sets the next player, resets the visit, and sets `visitStartScore` to the new player's current score.

### `/lib/scoring/checkout.ts`

```ts
export function findCheckout(score: number, dartsRemaining: 1 | 2 | 3): Segment[] | null
```

Returns a route that finishes exactly, ending on a double, or null if there is none.

- Returns null for any score above 170, for 169, 168, 166, 165, 163, 162 and 159, and for scores below 2. Do not special-case these. A correct search returns null for them naturally, and a test asserts exactly this set is unreachable in three darts
- Search is depth-first with a fixed preference order so it is deterministic and returns the route a player would actually choose:
  - **Finishing dart:** doubles in the order D20, D16, D18, D12, D10, D8, D14, D6, D4, D2, D1, then the odd doubles ascending, then bull
  - **Setup darts:** trebles T20 down to T1, then bull, then singles 20 down to 1, then outer bull
- Memoise on `(score, dartsRemaining)`. The full table is small and fixed
- The preference order is a product decision, not an implementation detail. It is why 96 returns T20 then D18 rather than an equally valid but stupid alternative

### `/lib/scoring/stats.ts`

```ts
export function computeStats(darts: Dart[], playerId: string, config: X01Config): Metrics
```

All derived, all from the dart log:

- `threeDartAverage` — total scored divided by darts thrown, times three. Busted visits contribute zero scored and their darts still count
- `firstNineAverage` — the same over the first nine darts of each leg
- `checkoutPct` — successful checkouts divided by **checkout attempts**. An attempt is any dart thrown at a double while a finish existed. The engine identifies attempts using `targetRing === 'D'` where present, and otherwise by "the score before the dart was a finishable score of 50 or less and the dart was aimed at a double"; see the note below
- `doublesHit` and `doublesAttempted`, broken down per double, which is what feeds the heatmap in spec 0007
- `count180`, `count140plus`, `count100plus` — per visit, not per dart
- `bestVisit`, `bestLegInDarts`

**Note on checkout attempt detection.** In free x01 scoring the app does not know what the player aimed at, so `targetRing` is null. The engine therefore infers an attempt as: the remaining score before the dart was 50 or less and even, or exactly 50, and the dart landed anywhere. This over-counts when a player deliberately sets up rather than shooting for the double. That inaccuracy is accepted in Phase 1 and documented in the UI as an approximation. Practice games and bot throws carry a real `targetRing`, and for those the engine uses it and is exact. Do not silently mix the two. `Metrics` carries `checkoutPctIsInferred: boolean`.

### `/lib/scoring/undo.ts`

```ts
export function undoLastDart(darts: Dart[]): Dart[]
```

Returns the log without its final element. That is the entire implementation. It exists as a named function so the intent is greppable and so a test can assert that nothing more elaborate ever creeps in.

---

## Acceptance criteria

- [ ] `deriveGameState` is pure: no imports outside `/lib/types` and `/lib/scoring`, no `Date`, no `Math.random`
- [ ] Score below zero busts, score of exactly one busts, score of zero on a non-double busts
- [ ] A bust restores the score to the start of the visit and passes the throw immediately, even mid-visit
- [ ] Darts thrown increments on busted darts
- [ ] A leg ends only on a double or bull
- [ ] `isDouble` returns true for bull
- [ ] The throw alternates correctly across visits and legs, and `startingPlayerId` alternates between legs
- [ ] `findCheckout(170, 3)` returns T20, T20, bull
- [ ] `findCheckout(96, 3)` returns T20, D18
- [ ] `findCheckout(2, 1)` returns D1
- [ ] `findCheckout(169, 3)`, and each of the other impossible scores, returns null
- [ ] `findCheckout(x, 1)` returns non-null only for even x from 2 to 40 and for 50
- [ ] Undoing every dart in a game returns state identical to a fresh game
- [ ] Undoing the dart that caused a bust restores the pre-bust in-visit state, not the post-bust state
- [ ] Undoing a winning dart un-wins the leg
- [ ] `computeStats` returns `checkoutPctIsInferred: true` for free x01 and `false` when every relevant dart carries a `targetRing`
- [ ] A 180 is counted per visit, and three treble 20s across two visits is not a 180

### Property-based tests (required, not optional)

Generate at least 10,000 random legal dart sequences and assert on every one:

- [ ] Remaining score is never negative and never exactly one
- [ ] Total scored plus remaining always equals the starting score
- [ ] Replaying the full log always reproduces the same final state
- [ ] Undoing every dart returns the starting position exactly
- [ ] Every completed leg's final dart is a double or bull
- [ ] `deriveGameState` never throws

---

## API contract

None. This spec adds no endpoints. It is a pure library consumed by the API layer in spec 0004.

---

## UI components

None.

---

## Data model changes

None. Spec 0001 defines the shapes this spec consumes.

---

## Out of scope

- Practice game rules, which have their own engine in `/lib/practice`, spec 0005
- Bot throw simulation, spec 0006
- Any rendering of any of this
- Persistence of derived results, which is spec 0007
- x01 variants other than 501 straight-in double-out. The config type should accommodate `startingScore` and a future `doubleIn` flag, but only 501 straight-in ships

---

## Notes for Claude Code

1. **Write the tests first for this one, properly.** This is the module where a subtle bug is worst: it is silent, it corrupts stored history, and the user will not notice until a leg ends wrong.
2. **The three bust conditions are one branch, not three.** Writing them as three separate `if`s is where the "score of one" case usually gets forgotten.
3. **Do not optimise the fold.** It runs over roughly twenty items. Clarity wins.
4. **The checkout preference order is in this spec for a reason.** It is not the shortest route, it is the route a darts player takes. Do not replace it with a generic shortest-path search.
5. Real reference values to sanity check against: 501 in nine darts is T20 T20 T20, T20 T20 T20, T20 T19 D12 (or T17 T18 D18). A 60 finish is T20 then D0, which is illegal, so 60 must return 20 then D20.

## Implementation notes (30 July 2026)

- `findCheckout` uses iterative deepening (shortest route first) over the spec's preference orders; setup darts for a two-dart finish are chosen against each preferred finishing double in turn. This satisfies every pinned route (170 = T20 T20 BULL, 96 = T20 D18, 60 = 20 D20) and returns exactly the impossible set as null. One consequence: 41 returns 1 then D20 rather than 9 then D16 — deliberate, since D20 outranks D16 in the spec's finishing order.
- The annotated replay (`lib/scoring/annotate.ts`) is shared by stats, the results cache and the history replay endpoint.
