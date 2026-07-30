# Prototypes

Reference artefacts, not production code. Do not copy wholesale into the repo.

## throw-pad-prototype.jsx

The pad comparison prototype referenced in `docs/specs/0004-throw-pad-and-live-game.md` and `docs/decisions/0004-modifier-pad-as-only-input.md`.

Contains both candidate pads, a full 501 leg with correct double-out and bust rules, and tap-to-tap timing. The modifier pad won and is the one that ships. The board pad is retained here only so the reasoning in ADR 0004 can be checked against something real.

The layout, colour encoding (red = double, green = treble) and the contextual finish strip are the intended starting point for `ThrowPad.tsx`.
