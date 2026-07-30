# 0003 — The dart event log is the single source of truth

**Status:** Accepted
**Date:** 30 July 2026
**Deciders:** Tom Wild

---

## Context

Arrows records darts one at a time, not three at a time. That decision (ADR 0004) has a consequence that reaches all the way into the data model: the app holds a fine-grained stream of events, and almost everything the product does is a question asked of that stream.

The things the product has to do, all at once:

- Show a remaining score that updates on every tap
- Apply x01 rules correctly, including the three bust conditions
- Undo a single dart at any point, including a dart that caused a bust, including the last dart of a leg
- Compute a three-dart average, a first-nine average, a checkout percentage and a per-double hit rate
- Replay any historical game dart by dart
- Answer questions retrospectively that were not anticipated when the game was played, for example "what is my hit rate on D16 specifically, on Tuesdays, after 40 darts"

Three approaches were considered.

**1. Store the running score as state.** The obvious approach. Each dart mutates `remainingScore`. Fast and simple until undo arrives, at which point a bust has to be un-applied, which means the pre-bust score has to have been stored somewhere, which means there is now a second source of truth. Checkout percentage needs a record of which visits were attempts at a double, which was never stored, so it has to be recorded separately at the time, and any stat nobody thought of in advance is gone forever.

**2. Store visit totals.** What most darts counters do. A visit is "140" and that is all that is kept. It is compact and it makes the average trivial. It also makes every stat that matters impossible: you cannot know which double was missed, or whether a 140 was three treble 20s or something scruffier. Since the whole reason for building this app rather than using an existing one is the doubles heatmap, this approach defeats the purpose.

**3. Store the darts, derive everything else.** Every dart is an immutable event. Score, bust state, whose turn it is, averages and every statistic are computed by folding over the events.

---

## Decision

**The `darts` table is the only place a score is recorded. Every other piece of state in the game is derived from it.**

Concretely:

1. A dart is written once and never updated. It records segment, ring, resulting score, and, when the game mode knows it, what was being aimed at.
2. The live game state (remaining score, current visit, whose throw it is, whether the last visit busted, current average) is produced by a pure function `deriveGameState(darts, config)` in `/lib/scoring`.
3. **Undo is implemented as: remove the last dart, re-derive.** There is no inverse operation to write and therefore no inverse operation to get wrong.
4. Bust handling lives entirely in the derivation. A bust is not a stored flag that someone has to remember to set. It is what the fold computes when a dart would take the score below zero, to exactly one, or to zero without a double.
5. `visits.bust` and the entire `results` table are **caches**. They may be written for query convenience. They must always be reproducible by replaying the darts, and a test asserts that they are.
6. The derivation function is pure: no I/O, no clock, no randomness. It takes darts in and returns state out.

---

## How this decision is enforced

- `deriveGameState` lives in `/lib/scoring` and has no imports outside `/lib/types`. A lint rule or a test asserts this.
- The reducer behind the live game screen holds a dart array, not a score. Reviewers reject any component state shaped like `const [score, setScore] = useState(501)`.
- Property-based tests (see CLAUDE.md, testing strategy) generate thousands of random dart sequences and assert the invariants hold: score never negative, never exactly one, legs only end on a double, full replay always reproduces current state, undoing every dart returns the starting position exactly.
- A dedicated test asserts that recomputing a `results` row from its game's darts produces byte-identical metrics to the cached row.
- CLAUDE.md carries this as Rule 6 and as a "never do" item.

---

## Consequences

### Positive

- **Undo is free and always correct**, including across bust and checkout boundaries, which are the two places every darts counter gets it wrong.
- **Stats are retrospective.** Any question that can be asked of a dart stream can be answered about games played months ago, including questions nobody had thought of when those games were played. The doubles heatmap is the first example, not the last.
- **History replay is free.** The dart-by-dart game view is just the same fold, stopped early.
- **The rules live in one pure function** that can be tested exhaustively without a browser, a database or a render.
- **Phase 1 to Phase 2 is trivial for the engine.** The same function runs unchanged on the server.
- **Bugs are reproducible.** A broken game can be reproduced exactly by replaying its dart log.

### Negative

- **More rows.** A leg is roughly fifteen to twenty rows instead of six. At personal-use volume this is irrelevant. At any plausible future volume it is still irrelevant.
- **Derivation runs on every tap.** A fold over about twenty items, sixty times a leg. Immaterial, but it means the fold must stay pure and cheap, and must not be accidentally made O(n²) by re-deriving inside a loop.
- **The temptation to "just store the score" will recur** every time someone is in a hurry. Hence the enforcement section.
- **Deleting a dart on undo means the event log is not strictly append-only.** Accepted: undo only ever removes from the tail, and only within a live game. Once a game ends, its darts are frozen.

### Neutral

- The `targetSegment` and `targetRing` fields are null in free scoring and populated in practice games and bot throws. That asymmetry is deliberate. In a 501 leg the app genuinely does not know what was being aimed at and must not guess.

---

## Related documents

- `docs/PRD.md` Section 4 (Data Model) — the table shapes this decision produces
- `docs/CLAUDE.md` — Rule 6 and the property-based testing requirement
- ADR `0004-modifier-pad-as-only-input.md` — the input decision that makes per-dart data available in the first place
- `docs/specs/0003-scoring-engine.md` — the implementation of the derivation
- `docs/specs/0007-stats-and-history.md` — the payoff
