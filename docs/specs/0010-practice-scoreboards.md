# Spec 0010 — Per-drill scoreboards on the live game screen

**Status:** Implemented
**Phase:** 3 (polish)
**Depends on:** Spec 0004, Spec 0005, Spec 0008, ADR 0003, ADR 0004

> Numbering note: the in-app guides work (commit `feat(0009)`) shipped without
> a spec file, so 0009 is taken as a number but has no document. This spec is
> the next in sequence.

---

## Goal

The live game top band was designed for x01: a player rail with a three-dart
average and a big remaining score. In a match those numbers are the game. In a
drill they are noise — the three-dart average across Round the Clock darts is
meaningless, and the generic "Score" figure silently changes meaning per mode
(darts thrown in the sequence drills, rungs climbed in the ladder, points in
Shanghai).

Give each practice and training drill its own scoreboard vocabulary: one hero
figure (the thing that drill is actually about), a few labelled chips, pips
where the drill has lives/hits/rings, and a progress bar. The target stays the
biggest thing on screen — it is what the player aims at next. The entry pad,
dart slots, undo and finish strip are untouched (ADR 0004).

---

## User stories

> As a **player mid-drill**, I can **glance at the top band and see figures
> that mean something in this drill** so that **the screen helps rather than
> confuses**.

> As a **player in Bob's 27**, I can **see when a blank round would eliminate
> me** so that **the pressure is visible, not remembered**.

> As a **player chasing a personal best**, I can **see my PB next to my
> running figure** so that **I know the pace I'm against**.

> As a **player inside a training session**, I can **see which block of the
> session I'm throwing** so that **I know where I am without leaving the board**.

---

## Acceptance criteria

- [x] In every practice mode the player rail (name, three-dart average, darts)
      is replaced by a slim header naming the drill.
- [x] The sequence drills (Round the Clock, Doubles Round the Board) show the
      dart count as the hero, a darts-per-target pace chip, and a progress bar
      over targets — no figure labelled "Score".
- [x] Bob's 27 shows the running score as the hero with the round's miss
      penalty as a stake line; when a blank round would eliminate, the score
      turns red and the stake line says so.
- [x] Shanghai shows points with S/D/T pips that light as rings land this
      round and reset when the round rolls over.
- [x] Halve-It shows points with "a blank halves to N"; the 41 round tracks
      the running three-dart total instead.
- [x] Checkout Ladder shows the best checkout taken out, three life dots
      (danger at one), and the live attempt (to go / darts left) as chips.
- [x] Random Checkout shows checkouts taken out with the live attempt as chips.
- [x] The Scoring Drill shows the running three-dart average as the hero (the
      one drill where it belongs), the T20 strike rate, and the last visit.
- [x] The JDC Challenge shows points with the provisional grade ("On for
      Purple") and darts out of 57.
- [x] Target Switching and Pressure Doubles show their own figures; Pressure
      Doubles lights a pip per clean hit on the current double.
- [x] A PB chip appears when a personal best exists (never more than three
      chips).
- [x] Arriving from a training session, the header shows "Training · block
      N of M".
- [x] x01 (solo, two-player, vs bot — including training match blocks) is
      pixel-identical to before.

---

## API contract

No new endpoints. The band reuses `GET /api/practice-games` (personal bests)
and `GET /api/training/sessions/:id` (block count), both existing.

---

## UI components

- `/lib/practice/hud.ts` — **new, pure.** `hudFor(key, state, extras)` maps a
  `PracticeState` to a `PracticeHud` descriptor: `eyebrow`, `hero {label,
  value, tone}`, `sub`, `chips[]`, `pips`, `progress`. Engines already carry
  the needed fields internally (rings hit, consecutive failures, hits on the
  current double); the HUD reads them with fallbacks and the engines are
  unchanged.
- `/components/play/PracticeBand.tsx` — **new.** Renders a `PracticeHud` plus
  the existing target display, dart slots, finish hint and undo button.
- `/components/play/LiveGame.tsx` — practice renders `PracticeBand` instead of
  the generic band, and a slim drill-title header instead of `PlayerRail`.
  Fetches the PB once and the training block context when arriving from a
  session.

---

## Data model changes

None. Everything is derived from the dart log (ADR 0003) plus data already
served.

---

## Out of scope

- Any change to the entry pad, dart slots, undo, or finish strip (ADR 0004).
- Changing what any engine scores or how drills complete.
- The x01 score display and player rail.
- Historical/stats screens (spec 0007 owns those).

---

## Notes for Claude Code

- `hudFor` is pure and lives with the engines; test it by replaying label
  strings through `derivePracticeState` (see `tests/unit/practice/hud.test.ts`).
- The `data-testid="practice-target"` contract is load-bearing for e2e; the
  generic `practice-score` testid was replaced by `practice-hero`.
- House tone: no exclamation marks, no congratulation. Danger states state
  the rule ("A blank round ends it"), they do not shout.

---

## Implementation notes (31 Jul 2026)

- Engine internals are read via a typed `EngineInternals` view with fallbacks
  rather than widening `PracticeState`; a missing field degrades gracefully.
- The band adds at most ~24px over the old layout (chips row + 4px progress
  bar), verified against the 360×640 no-scroll budget.
