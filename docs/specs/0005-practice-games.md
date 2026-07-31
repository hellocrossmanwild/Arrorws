# Spec 0005 — Practice games engine and screens

**Status:** Implemented
**Implemented:** 30 July 2026
**Phase:** 1 (mock API)
**Depends on:** Spec 0003, Spec 0004, PRD Section 7.3 and 7.4

---

## Goal

Add the eight practice games. Each one is a rule module in `/lib/practice` plus a small amount of per-game chrome. They reuse the pad, the dart slots and the undo behaviour from spec 0004 without modification.

This is the reason the product exists. A 501 counter is a commodity. A practice suite that records what you aimed at, and therefore what you missed, is not.

---

## User stories

> As a **player**, I can pick a drill in two taps from the home screen and start throwing.

> As a **player**, I can see the current target and my running score without reading instructions.

> As a **player**, I can beat my personal best and be told so once, plainly.

> As a **player**, every dart I throw in a drill records what I was aiming at, so my doubles heatmap gets better every session.

---

## The engine

### `/lib/practice/types.ts`

```ts
export interface PracticeState {
  currentTarget: Target | null    // what to aim at right now
  targetLabel: string             // "D16", "Treble 20", "Score 41"
  roundIndex: number
  dartsThrown: number
  score: number                   // the running game score
  progressLabel: string           // "12 of 21", "round 7 of 20"
  complete: boolean
  eliminated: boolean             // Bob's 27 only
  finalScore: number | null
}

export interface PracticeEngine {
  key: PracticeGameKey
  initial(config: unknown, rng: Rng): PracticeState
  onDart(state: PracticeState, dart: Dart): PracticeState
  targetFor(state: PracticeState): Target | null
}
```

Same purity rules as `/lib/scoring`. State in, state out. Randomness is injected as `rng` so `random-checkout` is reproducible in tests.

**Every dart thrown during a practice game is written with `targetSegment` and `targetRing` populated from `targetFor(state)` before the dart is recorded.** This is the entire point. It is what makes the doubles heatmap real rather than inferred.

### The eight games

Each is a module in `/lib/practice/games/<key>.ts` exporting a `PracticeEngine`.

#### 1. `around-the-clock`
- Targets in order: 1, 2, 3 ... 20, then outer bull (25), then bull (50)
- Any ring of the target number counts as a hit. Advance on a hit
- Three darts per visit, no visit limit
- **Score:** total darts to complete all 22 targets. `lower-is-better`
- Config option `doublesOnly: boolean`, default false. When true this becomes game 2, so it is exposed only as a hidden variant, not in the picker

#### 2. `doubles-round-the-board`
- Targets in order: D1, D2 ... D20, then bull
- Only the double of the current number counts. Bull counts for the final target
- **Score:** total darts to complete all 21 targets. `lower-is-better`

#### 3. `bobs-27`
- Starting score 27. Twenty rounds. Round *n* targets D*n*
- Three darts per round. Each dart that hits D*n* adds 2*n* to the score
- If all three darts of a round miss, subtract 2*n*
- If the score goes below zero at any point the player is **eliminated** and the game ends immediately with the score at the point of elimination
- **Score:** the final total. `higher-is-better`
- A completed run with no eliminations and every double hit once scores 447. Use that as a test fixture

#### 4. `shanghai`
- Twenty rounds. Round *n* targets the number *n*, any ring
- Three darts per round. A hit scores the segment's real value, so a treble 7 in round 7 scores 21
- Hitting a single, a double and a treble of the number within one round is a **shanghai**: the game ends immediately as a win
- **Score:** total points, or a shanghai. `higher-is-better`
- Config option `rounds: 7 | 20`, default 20

#### 5. `halve-it`
- Seven rounds with these targets in order: 20, 19, 18, any double, 41, any treble, bull
- Three darts per round. Darts satisfying the round's target add their real value to the score
- **If no dart in the round satisfies the target, the score is halved, rounded down**
- The 41 round is satisfied by scoring exactly 41 with the three darts combined, not by any single dart
- Starting score 0, and the first round adds rather than halves
- **Score:** final total. `higher-is-better`

#### 6. `checkout-ladder`
- Start at a checkout of 41. Three darts to finish it exactly on a double
- Success advances the target by 1. Failure repeats the same target
- Three consecutive failures on the same target ends the game
- Impossible checkouts (159, 162, 163, 165, 166, 168, 169 and anything over 170) are skipped automatically
- **Score:** the highest checkout successfully taken out. `higher-is-better`

#### 7. `random-checkout`
- Twenty rounds. Each round the engine picks a random score between 41 and 170 that `findCheckout` can solve in three darts, using the injected `rng`
- Three darts to check out exactly on a double
- **Score:** number of checkouts taken out of 20. `higher-is-better`
- The suggested finish is **hidden by default** in this game. Config option `showFinish: boolean`, default false. Working out the route is half the drill

#### 8. `scoring-drill`
- Twenty visits, sixty darts, target is always treble 20
- No target advancement, no failure state
- **Score:** the three-dart average across the sixty darts. `higher-is-better`
- Because every dart carries `targetSegment: 20, targetRing: 'T'`, this game also produces an exact treble-20 strike rate, which is shown in the result

---

## Screens

### `/practice`
A list of the eight games. Each row: name, one-line blurb, personal best with its date, and a start button. No categories, no filters, no search. Eight rows fit on a screen.

### `/practice/[key]`
Rules in three lines maximum, the personal best, and a full-width start button. If a config option exists it is a single control, defaulted, and never blocks the start.

### The live practice screen
Renders through `LiveGame` from spec 0004 with two differences:

1. The score band shows **current target** and **running score** instead of remaining score. The target is the largest element
2. The finish strip is replaced by nothing, except in `checkout-ladder` and in `random-checkout` when `showFinish` is true

The pad is identical. Undo is identical. Do not fork the pad.

### Personal bests
A personal best is the best `results.metrics.gameScore` for that practice key for that player, respecting `personalBestDirection`. When a game ends on a new best, the result sheet says so once, in one line, without celebration graphics.

---

## API contract

Practice games use the same endpoints as spec 0004. `POST /api/games` with `mode` set to the practice key and `config` set to the per-game options. The `gameState` in every response gains an optional `practice: PracticeState` field, populated only for practice modes.

### `GET /api/practice-games`
**Response (200):** `{ definitions: PracticeGameDefinition[], personalBests: Record<PracticeGameKey, { score: number, achievedAt: string } | null> }`

---

## Acceptance criteria

- [ ] All eight games are listed at `/practice` with their personal bests
- [ ] Every dart thrown in a practice game is persisted with `targetSegment` and `targetRing` populated
- [ ] `around-the-clock` advances only on a hit of the current number, in any ring
- [ ] `doubles-round-the-board` advances only on the exact double, and bull completes it
- [ ] `bobs-27` scores 447 for a perfect run, subtracts on a three-dart miss, and eliminates below zero
- [ ] `shanghai` ends immediately on single, double and treble of the round's number
- [ ] `halve-it` halves and rounds down on a missed round, and the 41 round is satisfied by the three-dart total
- [ ] `checkout-ladder` skips impossible checkouts and ends after three consecutive failures on one target
- [ ] `random-checkout` produces only checkable scores, and is reproducible given a fixed rng seed
- [ ] `scoring-drill` ends after exactly sixty darts and reports both the three-dart average and the treble-20 strike rate
- [ ] Undo works identically in every practice game, including rewinding a target advancement and an elimination
- [ ] A new personal best is announced once, in one line
- [ ] Every game engine is pure and has unit tests covering its scoring, its advancement and its end condition
- [ ] The pad component is byte-identical to the one used in x01. No practice-specific fork exists

---

## Data model changes

`practiceGameDefinitions.rules` now has a defined shape per `targetType`:

```ts
type PracticeRules =
  | { targetType: 'sequence'; targets: Target[]; requireExactRing: boolean }
  | { targetType: 'rounds'; rounds: number; targetPerRound: 'index' | 'fixed'; fixedTarget?: Target }
  | { targetType: 'checkout'; start: number; mode: 'ladder' | 'random'; attempts: number }
```

Update spec 0001's seed to populate this for all eight games.

---

## Out of scope

- User-created custom drills
- Timed drills
- Multiplayer practice games
- Any drill programme, schedule or suggestion of what to practise next. Explicitly out of scope in the PRD
- Cricket, Killer, and other pub games

---

## Notes for Claude Code

1. **Write the eight engines before any practice UI.** They are small, pure, and each has an obvious test.
2. **Bob's 27 has the nastiest edge cases.** Elimination mid-round, undo across an elimination, and the fact that a round's miss penalty only applies after all three darts. Test it hardest.
3. **The rng must be injected.** `random-checkout` with a fixed seed must produce the same twenty scores every time, or its tests are worthless.
4. **Do not add a ninth game because it seems easy.** Eight is the scope.

## Implementation notes (30 July 2026)

- For `score`-type targets with no checkout route mid-attempt (e.g. 39 left with one dart), the recorded aim falls back to the single that leaves an even number of 40 or less — a dart always carries a target.
- Halve-it's 41 round records an aim hint (fat 20, then the single that completes 41); the bull round accepts the inner bull only.
- The practice screen renders through `LiveGame` with the target band swapping in for the score band; the pad component is the same `ThrowPad` used by x01 with no fork.
- "New personal best" is detected by re-fetching `/api/practice-games` after completion and comparing the best score with this run's final score.
