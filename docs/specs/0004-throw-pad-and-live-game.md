# Spec 0004 — Throw pad and live game screen

**Status:** Implemented
**Implemented:** 30 July 2026
**Phase:** 1 (mock API)
**Depends on:** Spec 0003, ADR 0004, PRD Sections 7.1 and 7.2

---

## Goal

Build the screen the whole product exists for: `/play/[gameId]`. A player standing at the oche enters three darts, sees the score fall, and throws again. This screen serves every mode. 501 solo, two player, versus bot and every practice game render through the same shell with a different header and a different rules engine behind it.

If this screen is slow or ambiguous, nothing else in the product matters.

---

## User stories

> As a **player**, I can enter a dart in at most two taps without looking away from the board for long.

> As a **player**, I can see at a glance what my next tap will do, so an armed Double never surprises me.

> As a **player**, I can undo a mis-tap in one tap, at any point.

> As a **player**, I can see my finish when one exists, and take it in one tap per dart.

> As **two players**, we can pass the phone between visits and always know whose throw it is.

---

## Layout

Portrait only. Full viewport height, no page scroll. Five bands, top to bottom:

```
┌─────────────────────────────────┐
│ player rail   (1 or 2 cells)    │  fixed
├─────────────────────────────────┤
│  REMAINING             [ UNDO ] │  fixed
│  ▢ ▢ ▢   dart slots             │
│  Finish · T20 D18               │
├─────────────────────────────────┤
│ [ T20 ] [ D18 ]   finish strip  │  conditional
├─────────────────────────────────┤
│ [  DOUBLE  ] [  TREBLE  ]       │
│  1   2   3   4   5              │
│  6   7   8   9  10              │  flex
│ 11  12  13  14  15              │
│ 16  17  18  19  20              │
│ [ 25 ] [ BULL ] [ MISS ]        │
└─────────────────────────────────┘
```

Rules for the layout:

- The remaining score is the largest element on the screen by a wide margin. Readable from two and a half metres
- The pad occupies at least half the viewport height on a 667px-tall phone
- No element below the fold. Ever. The pad must not scroll
- Nothing moves position when state changes, with the single exception of the finish strip appearing and disappearing

---

## Components

| Path | Notes |
|---|---|
| `/components/play/LiveGame.tsx` | The shell. Owns the reducer. Renders the bands |
| `/components/play/PlayerRail.tsx` | One cell per participant: name, live three-dart average, darts thrown, legs won. The active player's cell is the only one at full opacity |
| `/components/play/ScoreDisplay.tsx` | Remaining score, dart slots, finish line |
| `/components/play/DartSlots.tsx` | Three slots. Fill as darts land. Coloured by ring |
| `/components/play/FinishStrip.tsx` | Conditional. The segments of the current checkout route as one-tap keys |
| `/components/play/ThrowPad.tsx` | The pad. The only input component in the app |
| `/components/play/UndoButton.tsx` | Permanent, full size |
| `/components/play/LegCompleteSheet.tsx` | Bottom sheet on leg end: darts, average, checkout, next leg |

### ThrowPad behaviour

1. Sticky `DOUBLE` and `TREBLE` toggles. Mutually exclusive. Tapping an armed one disarms it
2. **When armed, the entire 1 to 20 grid changes colour to the ring colour and every label rewrites to `D1`...`D20` or `T1`...`T20`.** Not a border, not a badge. The whole grid. This is an acceptance criterion, not a suggestion
3. The modifier clears after exactly one dart, and on undo, and on visit change
4. `25` is outer bull. `BULL` is 50. Neither is affected by an armed modifier. Tapping either while a modifier is armed enters the bull segment and clears the modifier
5. `MISS` records `segment: 0, ring: 'MISS', score: 0`. A miss is a dart and counts toward darts thrown
6. Keys respond on `pointerdown`, not on click, and render their pressed state immediately
7. Minimum touch target 44px. On a 667px-tall viewport the number keys are comfortably larger than that

### Colour encoding

Red is double. Green is treble. Everywhere, without exception: pad keys, armed grid, dart slots, finish strip. Colour carries the ring so the labels do not have to be read. Contrast must pass WCAG AA against the key text at the sizes used.

---

## State handling

The live game is a `useReducer` over the dart array. Not a global store. Not a `useState` holding a score. See ADR 0003.

```ts
type Action =
  | { type: 'THROW'; segment: Segment; latencyMs: number | null }
  | { type: 'UNDO' }
  | { type: 'NEXT_LEG' }
```

On every action, the reducer produces the new dart array and calls `deriveGameState` from spec 0003. The rendered score is always derived, never accumulated.

**Optimistic by default.** The reducer updates immediately. The API call is fired after. On failure, roll back the local dart and show a toast. No spinner ever blocks a tap.

`latencyMs` is measured as the gap since the previous dart in the same visit, and is null for the first dart of a visit. It is recorded silently and is not shown in the UI in Phase 1.

---

## Screen wake lock

Request `navigator.wakeLock` on mount of a live game, release on unmount or game end. Guard for unsupported browsers and for the promise rejecting when the tab is backgrounded. Re-acquire on `visibilitychange` back to visible. A phone that sleeps mid-leg is the second most annoying possible failure after a wrong score.

---

## API contract

### `POST /api/games`

**Request:**
```ts
{ mode: 'x01' | PracticeGameKey, config: GameConfig, participantPlayerIds: string[] }
```
**Response (201):** `{ game: Game, gameState: GameState }`

### `GET /api/games/:gameId`

**Response (200):** `{ game: Game, darts: Dart[], gameState: GameState }`

### `POST /api/games/:gameId/darts`

**Request:**
```ts
{ segment: number, ring: Ring, targetSegment: number | null, targetRing: Ring | null, latencyMs: number | null }
```
**Response (201):** `{ dart: Dart, gameState: GameState }`
**Response (409):** the game is already complete

### `DELETE /api/games/:gameId/darts/last`

Removes the most recent dart of the game. Rejects with 409 if the game has ended or has no darts.

**Response (200):** `{ gameState: GameState }`

### `POST /api/games/:gameId/legs`

Starts the next leg. Alternates `startingPlayerId`.

**Response (201):** `{ leg: Leg, gameState: GameState }`

The server returns the full `GameState` on every mutation. The client does not trust its own optimistic derivation as final, it reconciles against the response. Both run the same pure function, so a mismatch is a bug and should be logged loudly in development.

---

## Acceptance criteria

- [ ] A full 501 leg can be played to a checkout using only taps
- [ ] Entering a treble takes exactly two taps, a single exactly one
- [ ] Arming Double turns the whole grid red and rewrites every label to `D1` through `D20`
- [ ] Arming Treble turns the whole grid green and rewrites every label to `T1` through `T20`
- [ ] The modifier clears after one dart
- [ ] The modifier clears on undo
- [ ] Undo removes exactly one dart and restores the previous state, including across visit, bust and leg boundaries
- [ ] A bust immediately restores the visit's starting score, shows a clear bust state, and passes the throw without waiting for three darts
- [ ] The finish strip appears only when `findCheckout` returns a route, and offers that route's segments as one-tap keys
- [ ] Tapping a finish strip key records the same dart as tapping it on the grid would
- [ ] The score display never shows a negative number or exactly one
- [ ] Nothing on the screen requires scrolling at 360×640
- [ ] The dart slots colour red for doubles and green for trebles
- [ ] In two player mode the active player's rail cell is visually unambiguous from two metres
- [ ] Leg complete sheet shows darts thrown, three-dart average, and the checkout, and offers "Next leg"
- [ ] Wake lock is requested on mount and released on unmount, without throwing on unsupported browsers
- [ ] A tap renders its pressed state within one frame, before any network activity
- [ ] Every acceptance criterion above has a test, and the full-leg flow has a Playwright test that includes a bust and a checkout

---

## Data model changes

None. Spec 0001 covers everything.

---

## Out of scope

- Practice game rules and their per-game header content, spec 0005
- Bot throws appearing in the game, spec 0006
- Post-game stats beyond the leg complete sheet, spec 0007
- Landscape layout
- Any second input method, forever. See ADR 0004
- Haptics. Worth trying in Phase 3, not now
- Sound

---

## Notes for Claude Code

1. **Build this against a fake game in Storybook or a test page before wiring the API.** The pad's feel is the deliverable and it should be tuned before persistence exists.
2. **The reducer holds darts, not a score.** If you find yourself writing `score: state.score - value`, stop and re-read ADR 0003.
3. **Test the bust path early.** It is the path that breaks undo, and undo is the path that breaks trust.
4. **Resist adding animation.** A dart lands in a slot, that is all. Movement on a screen someone glances at between throws is noise. Respect `prefers-reduced-motion` regardless.
5. There is a working prototype of the pad, including the finish strip and the colour encoding, in the project's design notes. Its layout and interaction model are the intended starting point. It is not production code and should not be copied wholesale.

## Implementation notes (30 July 2026)

- `GET /api/games/:gameId` additionally returns `players` and `botProfiles` so the live screen needs one fetch; the contract is otherwise as specified.
- A small ✕ quit control sits at the end of the player rail; leaving an unfinished game marks it abandoned.
- In bot games, undo is disabled while the bot throws and when the human's current visit is empty, so a completed bot visit can never be disturbed (spec 0006 criterion). In solo and two-player games undo walks the full tail as specified.
- API calls are serialised through a queue so server ordering always matches the optimistic local log.
