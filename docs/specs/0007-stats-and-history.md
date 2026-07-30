# Spec 0007 — Stats, history and the doubles heatmap

**Status:** Implemented
**Implemented:** 30 July 2026
**Phase:** 1 (mock API)
**Depends on:** Spec 0003, Spec 0004, Spec 0005, Spec 0006, ADR 0003, PRD Sections 7.5 and 7.6

---

## Goal

The payoff. Every dart thrown in specs 0004 to 0006 has been recorded with its segment, its ring and, where known, its target. This spec turns that log into the three screens that make the app worth opening when you are not throwing.

The headline is the doubles heatmap. Every darts counter reports a three-dart average. Almost none tell you that you hit D16 sixty per cent of the time and D10 eleven per cent, which is the single most actionable fact a practising player can have.

---

## User stories

> As a **player**, I can see my three-dart average over time and tell whether I am improving or flattering myself.

> As a **player**, I can see my hit rate on every individual double, and find the ones I am quietly avoiding.

> As a **player**, I can look back at any game and step through it dart by dart.

> As a **player**, I can exclude games against bots, or two player games, from my own numbers if I want to.

---

## Screens

### `/stats`

Four bands, in this order:

1. **Headline.** Rolling three-dart average across the last ten sessions, with the change against the ten before it. One number, large, and one small delta. Nothing else
2. **Trend.** A line of three-dart average per session over time. Points, not a smoothed curve. A session with fewer than three legs is drawn hollow, because a two-leg average is noise
3. **The doubles heatmap.** See below
4. **Counts.** 180s, 140+, 100+, best leg in darts, best checkout. Four figures in a row

#### The doubles heatmap

Twenty-one cells: D1 through D20 and bull. For each, hit rate and attempt count.

- Cells are laid out **in board order**, not numeric order: 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, then bull. A player's mental model of the board is spatial, and D1 sitting next to D20 is meaningful because that is where the darts actually go
- Colour encodes hit rate on a single-hue ramp. Do not use red to green: it reads as good and bad rather than as a rate, and it fails for the eight per cent of men with a colour vision deficiency
- **Cells with fewer than five attempts are drawn as "not enough data", not as a low rate.** One miss out of one attempt is not a zero per cent double, and showing it as one is the fastest way to make the whole screen untrustworthy
- Attempt counts are shown, not hidden behind a tap. The count is what tells you whether to believe the rate
- A filter control switches between "practice only" (exact targets, from spec 0005) and "everything" (including inferred attempts from x01). The screen states which is active, and states plainly that x01 attempts are inferred. See the checkout attempt note in spec 0003

### `/history`

Sessions in reverse chronological order. Each row: date, duration, number of games, three-dart average, and a one-line summary of what was played. Tapping opens the session. Games within a session are listed with their mode, result and headline metric.

### `/history/[gameId]`

The dart-by-dart replay. Visits as rows, each showing its three darts with their labels and colours, the visit total, and the resulting remaining score. Busted visits are marked. The checkout visit is marked. This view is a straight render of the dart log, which is exactly why ADR 0003 exists.

---

## Filters

One control, applied across `/stats`, persisted per player:

- Include games against bots: on by default
- Include two player games: on by default
- Date range: all time, last 90 days, last 30 days

Filtering is applied to the dart log before the metrics are computed, never to already-computed metrics. Averaging averages is wrong and it will be tempting.

---

## API contract

### `GET /api/stats?from=&to=&includeBots=&includeTwoPlayer=&source=practice|all`

**Response (200):**
```ts
{
  headline: { threeDartAverage: number, sessionCount: number, deltaVsPrevious: number | null }
  trend: Array<{ sessionId: string, date: string, threeDartAverage: number, legCount: number }>
  doubles: Array<{ segment: number, ring: 'D', attempts: number, hits: number, rate: number | null }>
  counts: { count180: number, count140plus: number, count100plus: number, bestLegDarts: number | null, bestCheckout: number | null }
  attemptsAreInferred: boolean
}
```

`rate` is null when `attempts` is below the confidence threshold of five.

### `GET /api/sessions?limit=&cursor=`
**Response (200):** `{ sessions: SessionSummary[], nextCursor: string | null }`

### `GET /api/games/:gameId/replay`
**Response (200):** `{ game: Game, visits: Array<{ visit: Visit, darts: Dart[], visitScore: number, remainingAfter: number, bust: boolean, checkout: boolean }> }`

All three endpoints compute from the dart log. In Phase 1 the MSW handlers call the same `/lib/scoring` functions the client would. In Phase 2 they become SQL plus the same functions server-side.

---

## Acceptance criteria

- [ ] Every metric on `/stats` is computed from the dart log, not from a stored counter
- [ ] The `results` cache, where used, is verified against a live recomputation in a test
- [ ] The doubles heatmap lays out cells in board order, starting at 20 and ending with bull
- [ ] Doubles with fewer than five attempts render as "not enough data" and are excluded from any aggregate rate
- [ ] Attempt counts are visible on the heatmap without interaction
- [ ] Switching between "practice only" and "everything" changes the numbers, and the screen states which source is active and whether attempts are inferred
- [ ] Filters are applied to the dart log before metric computation, verified by a test that would fail if averages were averaged
- [ ] The trend line marks sessions with fewer than three legs as low confidence
- [ ] `/history/[gameId]` renders every visit of a game with correct running remaining scores, and marks busts and the checkout
- [ ] A game containing a bust renders the bust visit with the score correctly unchanged across it
- [ ] Empty states: no sessions, no doubles data, a single session with no trend to draw. Each states the action, not the absence
- [ ] The heatmap colour ramp is single-hue and passes contrast for its labels
- [ ] Stats screens render at 360px wide without horizontal scroll

---

## Data model changes

None. Everything here is derived. `results` remains a cache and remains non-authoritative.

---

## Out of scope

- Exporting data as CSV. Phase 2 backlog
- Comparing yourself against other players, or any benchmark other than your own history
- Predictive or coaching output of any kind: no "you should practise D10", no target suggestions. The heatmap shows the fact and the player draws the conclusion. This is explicit in PRD Section 3
- Per-treble heatmap. Interesting, but the scoring drill already gives a treble-20 strike rate and that covers the useful case in Phase 1
- Sharing or screenshots

---

## Notes for Claude Code

1. **Get the confidence threshold right before making the heatmap pretty.** A heatmap that lies about small samples is worse than no heatmap.
2. **Board order, not numeric order.** This is the one thing that makes this heatmap different from a bar chart, and it is the first thing that will get "tidied up" by someone who does not play darts.
3. **Recompute rather than trust the cache** wherever performance allows in Phase 1. The cache exists for Phase 2 query performance, not for correctness.
4. This spec is `Draft` rather than `Ready for implementation` because two open questions in PRD Section 13 land here: whether bot legs and two player legs count toward Tom's own stats. The filters above assume yes-with-a-toggle. Confirm before building.

## Implementation notes (30 July 2026)

- The two PRD Section 13 questions are implemented as assumed: bot legs and two-player legs count toward Tom's stats, on by default, filterable off. The filters slice the game list before any dart log is read; per-session averages are recombined from totals, never averaged from averages.
- Headline, trend and counts are computed from x01 logs; the heatmap uses exact recorded targets, plus inferred x01 attempts when the source filter is "Everything" (the screen states which is active and whether attempts are inferred).
- The heatmap colour ramp is a single-hue brass overlay whose opacity encodes rate; sub-threshold cells (< 5 attempts) show "not enough data".
