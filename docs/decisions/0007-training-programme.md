# ADR 0007 — The training programme: PRD reversal, fitness-app framing

**Status:** Accepted
**Date:** 31 July 2026

---

## Context

PRD Section 3 excluded "coaching content, drill programmes, or anything
that tells the user what to practise next". After living with the app, Tom
reversed that: he wants a structured training programme, framed like a
fitness app. The design is grounded in
`docs/research/darts-training-program-research.md` (motor-learning
evidence: interleaving, variable practice, pressure inoculation, spacing;
the four-pillar practice canon; the JDC Challenge grading system).

## Decision

Arrows gains a **Training** area. Four design decisions, made by Tom on
31 July 2026:

1. **Queue model, not fixed days.** The next session waits whenever the
   app opens. A weekly target (the programme's sessions/week) and a weekly
   streak provide the cadence; there are no missed-day mechanics.
2. **Unified sessions.** A training session is an ordinary app session —
   its games are ordinary `games` rows created through the same endpoints,
   so history, stats and the heatmap remain one record. A
   `training_sessions` row is only a thin planner: which programme, which
   session template, which game fulfilled which block.
3. **Fortnightly assessment.** The JDC Challenge replaces the match-sim
   session every second week, producing a graded score
   (White → Black at 850+) whose trend is the programme's before/after.
4. **Bot match-sim day by default.** One session per week is 501 against
   a bot, for pressure inoculation. Bot legs remain filterable out of
   personal stats.

Structural consequences:

- New engines implement the existing `PracticeEngine` interface and new
  definitions carry `trainingOnly: true`, so the practice picker keeps its
  eight games (spec 0005's scope rule stands).
- The dart log remains the single source of truth (ADR 0003); the
  programme layer stores no scores, only references to games.
- Programmes are static product configuration (like practice game
  definitions), shipped in code; MVP ships one four-week Foundation
  programme.

## Consequences

- PRD Sections 3, 5 and 7 are amended: Training is in scope, `/training`
  routes exist, and the home screen carries a fifth entry.
- Deferred to the backlog: the 121 safehouse ladder engine, adaptive
  weakness blocks driven by the doubles heatmap, 12-week periodisation
  (expansion and compression phases), and the extra metrics (double
  conversion split, sub-60 visit frequency, darts per finish).
