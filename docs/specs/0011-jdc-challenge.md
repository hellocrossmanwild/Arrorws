# Spec 0011 — The JDC Challenge: correct scoring, a front door, and a progress record

**Status:** Implemented
**Phase:** 3 (polish)
**Depends on:** Spec 0005, Spec 0008, Spec 0010, ADR 0003, ADR 0007, PRD Section 7

---

## Goal

The JDC Challenge already exists in this codebase. `lib/practice/games/jdc-challenge.ts`
implements all 57 darts, `lib/practice/hud.ts` gives it a live scoreboard,
`lib/content/guides.ts` explains it, and `lib/training/summary.ts` grades past
attempts White → Black. It is wired into the Foundation programme as the
fortnightly assessment (ADR 0007, decision 3).

Three things are wrong with it, and together they mean the feature is not
actually doing its job:

1. **The scoring is wrong.** A Shanghai scores 100 *instead of* the three
   darts' face value, where the real rule is 100 *on top of* it. Today a
   Shanghai on the 15 scores 100 and three treble 15s score 135 — so the
   engine actively punishes the best outcome in the round. Every stored grade
   is on a scale nobody else uses.
2. **There is no front door.** The definition carries `trainingOnly: true`, so
   `/practice` filters it out. The only route to it is the Foundation
   programme's week-two assessment — the eighth session in the queue. A player
   who wants to throw the challenge today cannot find it.
3. **Progress is a flat list.** `/training` renders grade, score and date in a
   row per attempt. There is no trend, no personal best, no part breakdown,
   and nothing that tells a player *where* their score came from. The seed
   ships zero JDC games, so this list has never rendered with data in it.

This spec fixes the scoring, gives the challenge its own screen at `/jdc`, and
turns the flat list into a record worth opening. It keeps the fortnightly
assessment exactly as ADR 0007 specified.

---

## The rules, as verified

Three independent sources agree on the structure and on the Shanghai bonus
being additive. Cited in full at the bottom of this document.

| Part | Targets | Darts | Scoring |
|---|---|---|---|
| 1 | 10, 11, 12, 13, 14, 15 in order | 3 per number (18) | Face value of any hit on the round's number. Single **and** double **and** treble of it in the same visit: **+100 on top of the face values** |
| 2 | D1 → D20, then the bull | 1 per target (21) | 50 per double hit. Bull 100 (50 + a 50 bonus). Misses score nothing |
| 3 | 15, 16, 17, 18, 19, 20 in order | 3 per number (18) | As part 1 |

**57 darts. Theoretical maximum 3,380** (1,050 + 1,100 + 1,230), assuming a
Shanghai on every number in parts 1 and 3.

Grades: White 0, Purple 150, Yellow 300, Green 450, Blue 600, Red 700,
Black 850. The current `JDC_GRADES` table is correct and stays as it is.

### What the engine does today

```ts
score += shanghai ? 100 : roundPoints   // lib/practice/games/jdc-challenge.ts
```

Verified by running the engine:

| Visit on the 15 | Current engine | Correct |
|---|---|---|
| S15, D15, T15 (Shanghai) | 100 | 190 |
| T15, T15, T15 | 135 | 135 |
| S15, T15, miss | 60 | 60 |

The fix is one line — `score += roundPoints + (shanghai ? 100 : 0)` — but it
also touches the test that asserts the wrong number
(`tests/unit/practice/training-engines.test.ts:23`), the guide copy that
describes the wrong rule (`lib/content/guides.ts:146`), and the tip that
advises against Shanghais, which is only good advice *because* of the bug.

---

## User stories

> As a **player**, I can **throw the JDC Challenge whenever I want** so that
> **I can take the test without waiting for week two of a programme**.

> As a **player who has thrown it more than once**, I can **see my scores as a
> trend against the grade bands** so that **I know whether the programme moved
> me**.

> As a **player looking at an attempt**, I can **see the three parts
> separately** so that **I know whether my score came from scoring or from
> doubles**.

> As a **player mid-challenge**, I can **see whether I am ahead of my best
> attempt at this point** so that **the last twenty darts have something at
> stake**.

> As a **player in the Foundation programme**, I can **still meet the
> challenge as the fortnightly assessment** so that **the programme's
> before/after is unchanged**.

---

## Acceptance criteria

### Scoring correctness

- [x] A visit containing a single, a double and a treble of the round's number
      scores the three darts' face value **plus 100**. S15/D15/T15 scores 190.
- [x] A visit without all three rings scores face value only, unchanged.
- [x] Part 2 is unchanged: 50 per double, 100 for the inner bull, 0 for the
      outer 25 and for misses.
- [x] The challenge still completes at exactly 57 darts and ignores darts
      after that.
- [x] `lib/content/guides.ts` describes the additive bonus, and the tip no
      longer advises against Shanghais.
- [x] Every past attempt's `results.metrics.gameScore` is recomputed to the
      corrected scale, so no chart mixes the two.

### The front door

- [x] `/jdc` exists and is reachable from `/training` and from `/practice`.
- [x] `/jdc` has a start button that creates a `jdc-challenge` game and opens
      the normal pad.
- [x] The challenge remains absent from the `/practice` drill grid: it is a
      test, not a drill, and spec 0005's eight-game scope rule stands.
- [x] With no attempts, `/jdc` states the action: "No attempts yet. Throw the
      challenge."

### The progress record

- [x] `/jdc` shows the current grade, the best score, the latest score, and
      the change on the previous attempt.
- [x] `/jdc` shows the distance to the next grade in points.
- [x] `/jdc` charts every attempt in order with the belt thresholds ruled
      behind it, and shows the belt ladder with each belt's earned date.
- [x] Attempts thrown as a programme assessment are marked distinctly from
      ad-hoc attempts.
- [x] `/jdc` breaks the latest attempt into part 1, part 2 and part 3 points,
      each against its own personal best.
- [ ] **Deferred.** Tapping an attempt opens its detail: part totals,
      Shanghais hit, and which doubles were hit and missed in part 2. See
      "What was deferred, and why" below. The hub shows the latest attempt's
      part totals, Shanghais and doubles hit; only the per-attempt screen is
      outstanding.
- [x] Every figure on `/jdc` is derived from the dart log, not stored
      (ADR 0003).

### Mid-challenge

- [x] The live band shows the running points against the same point in the
      best attempt ("PB pace +24" / "−15"), when a best attempt exists.
- [x] Parts 1 and 3 show S/D/T pips that light as rings land and reset each
      round, matching the Shanghai drill's existing pattern.
- [x] Part 2 shows doubles hit out of 21.
- [x] The progress bar reads as three parts rather than one run of 57.

---

## API contract

### `GET /api/jdc`

**Request:** none.
**Response (200):** the `JdcSummary` in `lib/types/jdc.ts` —

```ts
{
  attempts: Array<{
    gameId: string
    endedAt: string
    score: number
    grade: string
    parts: [number, number, number]
    shanghais: number
    doublesHit: number            // of 21, part 2
    fromProgramme: boolean        // fulfilled a training assessment block
  }>                              // oldest first
  best: JdcAttempt | null         // the attempt that sets the belt
  latest: JdcAttempt | null
  latestDelta: number | null      // vs the attempt before it
  belts: Array<{ name: string; min: number; earned: boolean; earnedAt: string | null; current: boolean }>
  belt: JdcBelt | null
  nextBelt: { name: string; pointsAway: number } | null
  partBests: [number, number, number]
  partMaximums: [number, number, number]
  bestCumulative: number[] | null // the best attempt's running score, for PB pace
}
```

**Response (4xx/5xx):** the existing `HttpError` shape.

Served by `lib/server/jdc.ts` and mirrored by an MSW handler in
`mocks/handlers/jdc.ts`, per Rule 5. Both derive every figure by replaying
each attempt's darts through `jdcReport`; neither reads the cached
`results.metrics.gameScore`, so a scoring change re-scores history instead of
stranding it.

### `GET /api/jdc/:gameId` — **deferred, not built**

Would return the single attempt plus its per-double and per-round detail, for
the attempt detail screen. `jdcReport` already returns both (`doubles`,
`rounds`), so this is a route handler and a screen, not new logic.

`GET /api/training` keeps its `assessments` array unchanged so `/training`
does not regress; it may be reduced to a link once `/jdc` lands.

---

## UI components

### `/app/jdc/page.tsx` — the hub

As built, top to bottom, in the app's existing idiom (dark, sentence case, no
congratulation):

```
JDC CHALLENGE                                    5 attempts

  ▇ GREEN                                             520
    BEST 520 PTS                        +143 ON THE LAST

  Blue at 600 — 80 points away

  [ Throw the challenge ]

  BELTS
  ▇     ▇      ▇      ▇      ▢     ▢    ▢
  WHITE PURPLE YELLOW GREEN  BLUE  RED  BLACK
  4 Aug 4 Aug  18 Aug 15 Sep 600   700  850

  TREND
  BLACK ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  RED   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  BLUE  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  GREEN ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄▇▇▇▇
  YELLOW┄┄┄┄┄┄┄┄▇▇▇▇┄▇▇▇▇┄▇▇▇▇┄┄┄┄┄┄▇▇▇▇
  PURPLE┄▇▇▇▇┄┄┄▇▇▇▇┄▇▇▇▇┄▇▇▇▇┄┄┄┄┄┄▇▇▇▇

  LATEST ATTEMPT                  latest / best / max
  Part 1  Shanghai 10-15     238 / 238 best of 1050
  Part 2  Doubles            200 / 200 best of 1100
  Part 3  Shanghai 15-20      82 / 185 best of 1230
  1 shanghai · 4 of 21 doubles

  ATTEMPTS
  ▇ Green   520 pts · 15 Sept
  ▇ Yellow  377 pts · 8 Sept
  ...
```

The belt ladder is the spine of the screen: seven cells, earned ones filled
with the JDC's own colour and dated, unearned ones dimmed and showing the
threshold instead, so the ladder doubles as the target list. The belt held
carries a chalk outline.

- `/lib/jdc/belts.ts` — the seven belt colours and the chart ceiling. The
  colours are the JDC's own award shirts, not an Arrows invention; they are
  deliberately outside the Tailwind palette so nobody restyles them.
- `/components/jdc/BeltLadder.tsx` — the seven belts in order.
- `/components/jdc/TrendChart.tsx` — bars, not a line: attempts are discrete
  fortnightly events, not a continuous series. Belt thresholds are ruled
  behind the bars, with their names in a left gutter so no bar can cover
  them. Hand-rolled CSS; no charting dependency and no axis furniture.
- `/components/jdc/PartBars.tsx` — three rows, latest against best. The bars
  scale against the **personal best**, not the part maximum: a part tops out
  at 1,050 with a shanghai on every number, so scaling to that would leave
  every real bar a stub. The maximum is printed as a caption instead.

### `/app/jdc/[gameId]/page.tsx` — attempt detail

Part totals, Shanghais hit, and a 21-cell doubles strip for part 2 (D1…D20,
bull) with hits filled and misses hollow. The misses already land in the
doubles heatmap via `dartTargetFor`, so this screen links to
`/stats` rather than redrawing it.

### Changed

- `/app/training/page.tsx` — the assessments block becomes one card: current
  grade, last score, and a link to `/jdc`.
- `/app/practice/page.tsx` — a single full-width row below the drill grid:
  "JDC Challenge — the graded assessment", linking to `/jdc`. The grid itself
  keeps its eight drills.
- `/lib/practice/hud.ts` — the `jdc-challenge` case gains the PB-pace sub
  line, S/D/T pips in parts 1 and 3, a doubles chip in part 2, and a
  part-aware progress fraction. `HudExtras` gains
  `pbCumulative?: number[]` (the best attempt's running score by dart index)
  so the pace line stays a pure lookup.

---

## Data model changes

**None.** This is the point.

Everything above derives from the dart log by replaying it through the engine,
exactly as `derivePracticeState` already does. A new pure module,
`/lib/practice/games/jdc-report.ts`, exposes:

```ts
export interface JdcReport {
  score: number
  grade: string
  parts: [number, number, number]
  shanghais: number
  doubles: Array<{ target: number; hit: boolean }>  // 21 entries
  cumulative: number[]                              // running score by dart index
}

export function jdcReport(darts: Dart[]): JdcReport
```

It is pure — darts in, report out, no clock, no randomness — and therefore
testable the same way the engines are.

Two consequences worth stating plainly:

- **The scoring fix repairs history for free.** Because the report replays the
  log, every past attempt is rescored the moment the engine changes. This is
  ADR 0003 paying for itself.
- **The cached projection is the exception.** `results.metrics.gameScore` is a
  stored copy and *will* be stale after the fix. Recompute it for
  `jdc-challenge` games in the same PR, and derive `/jdc` from darts rather
  than from the cache so it cannot drift again.

`mocks/data/seed.json` gains **five completed JDC attempts** — 282, 341, 398,
377 and 520 points, an improving arc with one dip, crossing Purple, Yellow and
Green. Each is a full 57-dart log generated by throwing at the real targets
through the same scatter model the bots use (`simulateThrow`), seeded per
attempt so the arc is deterministic and re-tunable.

The programme's own assessment rows are deliberately **not** seeded: a fresh
seed must still start the Foundation queue empty (spec 0008), so the seeded
attempts are all ad-hoc and `fromProgramme` lights up on its own the first
time a real assessment block records one. The integration test exercises that
path directly rather than leaning on seed fixtures.

One consequence worth noting: part 2 throws a dart at every double, so the
seed no longer leaves any double untried. The doubles heatmap is better for
it — 21 targets, 5 to 13 attempts each, hit rates from 0 to 45% — and
`seed-validation` now asserts a spread of attempts plus cold doubles (tried,
never hit) where it used to assert untried ones.

---

## Out of scope

- Changing the Foundation programme's shape, cadence or block order (ADR 0007
  stands).
- A second programme, or JDC-driven adaptive blocks.
- Any leaderboard, sharing, export or comparison against other players. Arrows
  is single-user (ADR 0006).
- Age-banded or academy-official grade tables, if such a thing exists — we
  ship the seven-colour scale and nothing more.
- Reworking the doubles heatmap. Part 2's misses already reach it.
- Offline capture of an attempt thrown away from the app.

---

## Decisions taken

Settled by Tom on 20 September 2026. The point of the feature, in his words,
is "to track progress against the proper challenge and belt/score awards" —
which is why slice A is not optional polish but the whole foundation.

1. **The belt follows the best attempt; every attempt is tracked.** A grade is
   something you reached, and one bad night does not take it back off you. The
   trend chart carries the honesty, and `buildJdcSummary` earns each belt at
   the date it was *first* reached.
2. **Ad-hoc attempts count.** They set the belt exactly like assessments do.
   The trend marks programme assessments with a brass tick so the fortnightly
   cadence is still readable, but nothing is hidden or discounted.
3. **The outer bull scores nothing in part 2.** Only the double counts, and
   D25 is the double of 25. Unchanged from the existing engine.
4. **History is backfilled, not reset.** `/jdc` derives from the dart log so
   it re-scored itself the moment the engine was fixed;
   `scripts/backfill-jdc.ts` repairs the cached `results.metrics.gameScore`
   that `/history` and the practice personal bests read.

## Build order

Three slices, each shippable on its own.

| Slice | Contents | Status |
|---|---|---|
| **A — correctness** | The engine fix, its test, the guide copy and tip, `scripts/backfill-jdc.ts` | shipped |
| **B — front door and record** | `jdc-report.ts`, `lib/jdc/summary.ts`, `GET /api/jdc`, the MSW handler, `/jdc` with the belt ladder, trend and attempt list, entry points from `/training` and `/practice`, five seeded attempts | shipped |
| **C — depth** | Part bars against per-part bests, PB pace and shanghai pips in the live band | shipped |
| **D — deferred** | The per-attempt detail screen (`/jdc/[gameId]`) and `GET /api/jdc/:gameId` | not built |

Slice A landed first: every number the rest draws depends on it being right,
and it is the only part of this spec that changes what a score *means*.

### What was deferred, and why

The **per-attempt detail screen** is specified above but not built. The hub
already answers the questions worth asking between attempts — which belt, how
the trend moved, which part is weak — and part 2's misses reach the doubles
heatmap on their own through `dartTargetFor`. A screen showing which of the
21 doubles a single attempt missed duplicates the heatmap at a smaller sample
size. Build it when the heatmap proves not to be enough, not before.

---

## Notes for Claude Code

- The engine stays pure. `jdcReport` belongs beside the engine in
  `/lib/practice/games/`, not in a route handler, and takes darts as an
  argument — never a fetch, never a clock.
- Reuse `derivePracticeState`; do not write a second replay loop.
- `/jdc` is a reading screen, not a throwing one, so the performance rules
  that govern the pad do not apply — but follow `docs/PERFORMANCE.md` for
  skeleton timing. An attempt is 57 darts and the cadence is fortnightly, so
  loading full logs for every attempt is cheap and needs no pagination.
- The trend chart is hand-rolled SVG. Do not add a charting dependency for
  one bar chart (ADR 0002's spirit; a new dependency needs a recorded
  reason).
- House copy rules apply: sentence case, no exclamation marks, the app does
  not congratulate. "Black" is a grade, not a celebration. Empty states state
  the action.
- Do not remove `trainingOnly: true` from the definition — the seed validation
  test asserts exactly eight non-training drills
  (`tests/unit/seed/seed-validation.test.ts:54`), and that rule is correct.
- `/practice/jdc-challenge` already works as a direct URL today, since only
  the picker filters on `trainingOnly`. Slice B's start button can route
  through it unchanged.

---

## Sources

- [DolfDarts — How to Play JDC Challenge Darts](https://dolfdarts.com/games/jdc-challenge):
  part order, darts per target, "a 100-point bonus **in addition to** the face
  values", bull 100, and the seven-colour band table.
- [Decent Darts — JDC Darts Practice Routine](https://decentdarts.com/jdc-darts/):
  worked example — single, double and treble 10 is "a total of 60 points plus
  a 100 points bonus for Shanghai, so 160 points".
- [GoDartsPro — JDC](https://www.godartspro.com/jdc/): the three parts, and
  "50 points for each double and a bonus of 50 points for BULL".
- [Junior Darts Corporation](https://www.juniordarts.com/): the governing body
  the routine and its grading come from.
