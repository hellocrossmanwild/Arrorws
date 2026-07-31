# Spec 0008 — Training programme

**Status:** Implemented
**Implemented:** 31 July 2026
**Phase:** post-launch feature (built against both mock and real backends)
**Depends on:** Specs 0003–0007, ADR 0007, `docs/research/darts-training-program-research.md`

---

## Goal

Give Arrows a fitness-app training layer: one built-in four-week
Foundation programme whose sessions are composed from the existing pure
engines, run block by block through the existing live game screen, with a
weekly target, a weekly streak, and a fortnightly graded assessment.

The dart log stays the only source of truth. The training layer plans and
links; it never scores.

## User stories

> As **Tom**, I open Training and the next session is simply waiting —
> warm-up, main work, finisher — and I can be throwing in two taps.

> As **Tom**, every second week the programme hands me the JDC Challenge
> and tells me my grade, so I know whether four weeks of work moved me.

> As **Tom**, I can see how many sessions I've done this week against the
> target, and how many weeks running I've hit it.

## The Foundation programme (static config)

Four weeks × four sessions, queue model. Session templates:

1. **Scoring** — Switching warm-up (6 rounds) → Scoring drill → Halve it
2. **Doubles** — Switching warm-up → Doubles round the board → Pressure doubles (D16 D20 D18 D10, two clean hits each)
3. **Finishing** — Switching warm-up → Checkout ladder → Random checkout
4. **Match / Assessment** — Switching warm-up → 501 first-to-3 vs County bot (odd weeks) **or** JDC Challenge (even weeks)

## New engines (all implement `PracticeEngine`, all `trainingOnly`)

### `jdc-challenge`
Three parts, 57 darts: Shanghai 10–15 (three darts per number, face-value
hits; single+double+treble of the number in one round scores 100 instead),
one dart at every double D1–D20 then bull (50 points per double, 100 for
bull), Shanghai 15–20. Grades: White 0–149, Purple –299, Yellow –449,
Green –599, Blue –699, Red –849, Black 850+.

### `target-switching`
N rounds (default 6), three darts per round, target cycles 20 → 19 → 18.
Any ring of the round's number scores face value. Score: total points.

### `pressure-doubles`
Config: ordered doubles list + hits required per double (default two).
Unlimited darts; advance only when the current double has its hits.
Score: darts taken, lower is better.

## Data model

- `PracticeGameDefinition` gains `trainingOnly: boolean` (default false).
  `/practice` filters them out — the picker keeps its eight games.
- New table/collection `trainingSessions`: `id`, `programId`,
  `sessionIndex`, `week`, `kind`, `startedAt`, `completedAt | null`,
  `blockGameIds: (string | null)[]`.
- Programme definitions live in `lib/training/program.ts` as pure config.

## API contract

- `GET /api/training` → `{ program, active, nextSession, completedCount,
  sessionsThisWeek, weeklyTarget, weekStreak, assessments }`
- `POST /api/training/sessions` → starts (or returns) the active session
  for the next template in the queue. 409 when the programme is complete.
- `PATCH /api/training/sessions/:id` with `{ blockIndex, gameId | null }`
  → records a block as done; sets `completedAt` when every block is done.

Blocks create games through the existing `POST /api/games`; the runner
passes the mode and config from the template.

## UI

- Header/nav and home gain **Training** (home becomes five entries).
- `/training`: programme name and week, sessions-this-week ring against
  the weekly target, week streak, next session card (blocks listed), JDC
  grade history, start button.
- `/training/run/[id]`: the runner — block list with done/current state;
  the current block's button creates the game and opens `/play/[gameId]`
  with a return parameter; finishing (or quitting) the game returns to the
  runner, which records the block.
- `LiveGame` completion actions return to the runner when the game was
  launched from one (query param), otherwise behave as today.

## Acceptance criteria

- [ ] The three engines are pure, registered, `trainingOnly`, and absent from `/practice`
- [ ] JDC: shanghai bonus scores 100 for the round; doubles part scores 50/100; grade thresholds exact; 57 darts total
- [ ] Pressure doubles advances only on the required hits and scores darts taken
- [ ] Target switching cycles 20/19/18 and scores face value on the round's number only
- [ ] `GET /api/training` reports next session, sessions-this-week, weekly target and week streak computed from completed sessions
- [ ] Starting a session is idempotent (an active session is returned, not duplicated)
- [ ] Recording the last block completes the session
- [ ] The runner drives a full session end to end through the ordinary game endpoints, and every dart lands in the ordinary dart log
- [ ] Assessment sessions appear on even weeks and their grades list on `/training`
- [ ] Mock handlers and the real service implement the same contract; tests are green on the mock fixture

## Out of scope (backlog)

121 safehouse ladder; adaptive weakness blocks from the heatmap; 12-week
periodisation; double-conversion/sub-60/darts-per-finish metrics; multiple
programmes; rest-day scheduling.

## Implementation notes (31 July 2026)

- The runner's end-to-end path is covered by the integration suite (start
  session -> create game per block -> record -> completion -> streak), which
  drives the same API the browser does; no dedicated Playwright flow was
  added.
- `buildTrainingSummary` is a pure assembler shared verbatim by the MSW
  handler and the server service, so the two implementations cannot drift
  on the summary shape.
- Weeks are Monday-based. The current week counts toward the streak only
  once it has met the target; a gap week breaks it.
- Blocks can be skipped from the runner; a skipped block records
  "skipped" and still completes the session — queue model, no guilt.
