# 0004 — Modifier pad as the only input method

**Status:** Accepted
**Date:** 30 July 2026
**Deciders:** Tom Wild

---

## Context

Arrows records every dart individually rather than a visit total. That is what makes the doubles heatmap and every other meaningful statistic possible, and it is the reason to build this rather than use an existing counter.

The cost is that the user taps three times per visit instead of once, standing at a board, holding darts. Input speed is therefore not a detail of the UI. It is the product's central risk. If entering three darts is slower than the time between throws, the app is worse than a chalkboard and will not get used.

A dartboard has sixty-two distinct scoring outcomes plus a miss. No pad can give all of them a one-tap key at a usable size on a phone. So something has to give, and there were three candidate compromises.

**1. Board pad (frequency first).** Six large keys for the segments actually thrown most often, contextually replaced by the segments of the current checkout route when one exists, plus 25, bull, miss, and a two-tap sheet for anything rare. Most darts are one tap.

**2. Modifier pad.** Sticky Double and Treble toggles above a 1 to 20 grid, plus 25, bull and miss. The modifier clears after each dart. Every treble and double is two taps, every single is one, and the layout never moves.

**3. Tappable board image.** The best data and the most natural mental model. Rejected before prototyping: hitting a treble bed accurately on a phone screen, with the hand you also throw with, is slower and more error-prone than either pad, and a mis-tap costs a bust.

Both surviving candidates were built as a working prototype and thrown against, with the gap between consecutive taps measured, so the comparison was empirical rather than theoretical.

---

## Decision

**The modifier pad is the only input method in Arrows. The board pad is not built.**

The modifier pad wins on predictability. The board pad is measurably fewer taps, but its hero row rearranges as the score changes, which means the user has to look at the pad and read it. The modifier pad's grid never moves, so after a session it is thrown blind. Muscle memory beats tap count.

Specific rules that follow:

1. **One pad. No setting, no toggle, no alternative layout.** A second input method would split the muscle memory the whole design depends on and would double the surface area of the most safety-critical component in the app.
2. **The modifier is sticky for exactly one dart**, then clears. It never persists across darts and it never persists across visits.
3. **The armed state must be unmissable at arm's length.** When Double is armed the entire 1 to 20 grid turns the double colour and every label changes to read `D1` through `D20`. Same for Treble. The user must be able to tell what the next tap will do without reading small text.
4. **One idea is carried over from the losing prototype:** the contextual finish strip. When a checkout exists from the current score, a single slim row above the grid offers the segments of that route as one-tap keys. It is additive, it appears above the grid without moving it, and it saves the two-tap cost on the dart that matters most. This is the only contextual element on the pad.
5. **Undo is a permanent, full-size control**, never inside a menu, never a swipe, never behind a long press. It removes exactly one dart.
6. **A tap registers on touch start, optimistically**, without waiting for the network. See CLAUDE.md, optimistic updates.

---

## How this decision is enforced

- There is exactly one pad component, `/components/play/ThrowPad.tsx`. Any pull request adding a second is rejected.
- Spec 0004 carries the pad's acceptance criteria, including the armed-state colour change and the label change.
- CLAUDE.md carries "never add a second input method" in the never-do list.
- An end-to-end test enters a full leg through the pad, including a bust and a checkout, using only taps a real user could make.

---

## Consequences

### Positive

- **The pad can be thrown blind.** Fixed positions mean the user looks at the board, not the phone.
- **One component to get right,** and it is the component everything else depends on.
- **Every dart carries a segment and a ring**, which is what ADR 0003 needs and what the doubles heatmap is built from.
- **Two-tap trebles are predictable**, so the rhythm is even. An input method with variable cost per dart feels slower than a slightly slower one with constant cost.

### Negative

- **Trebles and doubles cost two taps.** Roughly a third more taps per leg than the board pad. This is the price of predictability and it was paid knowingly.
- **A mis-armed modifier is a real error class.** Tapping 20 while Treble is armed from the previous thought produces 60 instead of 20. Mitigated by the full-grid colour change and by undo being one tap away. Worth watching in real use.
- **No progressive disclosure for beginners.** The pad assumes the user knows what a treble is. Given the target user is Tom, this is not a problem.

### Neutral

- The board pad prototype is retained as a reference artefact but is not ported into the repo.

---

## Related documents

- ADR `0003-dart-event-log-as-source-of-truth.md` — what the per-dart data is for
- `docs/PRD.md` Section 3 (MVP Scope) and Section 7.2 (Live game)
- `docs/specs/0004-throw-pad-and-live-game.md` — the implementation
