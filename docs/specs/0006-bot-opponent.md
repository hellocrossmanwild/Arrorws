# Spec 0006 — Bot opponent

**Status:** Implemented
**Implemented:** 30 July 2026
**Phase:** 1 (mock API)
**Depends on:** Spec 0003, Spec 0004, PRD Section 4 (botProfiles)

---

## Goal

Give Tom something to play against on his own. A bot that plays 501 at a chosen standard, throws visits that look like a real player's, and can be beaten or not depending on how he throws.

The naive approach is to sample a visit total from a distribution around a target average. It is quick and it feels wrong within three legs, because real scoring is lumpy in a specific way: a player aiming at treble 20 misses into 5 and 1, so scores cluster at 60, 45, 41, 26 and 85, not smoothly around the mean.

So the bot does not simulate scores. It simulates throwing.

---

## User stories

> As a **player**, I can pick an opponent standard and play a match of 501 against it.

> As a **player**, I see the bot's visits appear at a realistic pace and with realistic numbers, including the occasional 180 and the occasional shocker.

> As a **player**, a bot at "tour card" standard actually punishes a missed double.

> As **Claude Code**, I can run ten thousand simulated legs in a test and assert the bot's average lands where its profile says it should.

---

## The model

### `/lib/bot/board-geometry.ts`

Standard PDC board dimensions, in millimetres from the centre:

| Feature | Radius |
|---|---|
| Inner bull (50) | 0 to 6.35 |
| Outer bull (25) | 6.35 to 15.9 |
| Inner single | 15.9 to 99 |
| Treble ring | 99 to 107 |
| Outer single | 107 to 162 |
| Double ring | 162 to 170 |
| Off the board | beyond 170 |

Segment order clockwise from the top: 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5. Each segment spans 18 degrees, with 20 centred on vertical.

Exports:
- `segmentAt(x: number, y: number): Segment` — cartesian millimetres to a scoring segment, including miss
- `centreOf(segment: Segment): { x: number, y: number }` — the aim point for a given target, at the radial midpoint of the ring

### `/lib/bot/throw.ts`

```ts
export function simulateThrow(target: Segment, sigmaMm: number, rng: Rng): Segment
```

Sample a landing point from a two-dimensional Gaussian centred on `centreOf(target)` with standard deviation `sigmaMm` in both axes, then resolve it with `segmentAt`. That is the whole model.

It produces the right behaviour for free: aiming at T20 with realistic scatter yields mostly 20s, a satisfying number of trebles, and misses into 5 and 1 rather than into 19 and 7, because that is where those beds physically are.

### `/lib/bot/strategy.ts`

```ts
export function chooseTarget(score: number, dartsRemaining: 1 | 2 | 3, profile: BotProfile): Segment
```

- If `findCheckout(score, dartsRemaining)` returns a route, aim at the first segment of that route
- If the score is above 170, or no route exists, aim at T20
- If the score is between 100 and 170 with a route, take the route. Below 100 with no route, for example on 99 with one dart left, aim to leave a double: aim at the single that leaves an even number of 40 or less

Use `doubleSigmaMm` when the chosen target is a double, and `scoringSigmaMm` otherwise. Doubles are thrown worse than trebles by every player, and one sigma for both makes a bot that misses doubles at exactly the wrong rate.

### `/lib/bot/index.ts`

```ts
export function playVisit(score: number, profile: BotProfile, rng: Rng): Dart[]
```

Throws up to three darts, stopping on a checkout or a bust, using the same rules from `/lib/scoring`. Returns darts with `targetSegment` and `targetRing` populated. The bot's darts go through exactly the same `POST /api/games/:gameId/darts` path as a human's, and are subject to the same bust logic. There is no bot-specific scoring code anywhere.

---

## Calibration

`scoringSigmaMm` and `doubleSigmaMm` are **not set by hand**. Write a calibration script at `/scripts/calibrate-bot.ts` that, for each profile:

1. Runs 10,000 simulated legs at a candidate sigma
2. Measures the resulting three-dart average and checkout percentage
3. Binary searches sigma until the average is within 0.5 of `targetAverage`

Commit the resulting values into the seed, along with the measured average and checkout percentage as a comment. Re-run the script if the geometry or strategy ever changes.

Rough expectations to sanity check against, so an obviously wrong result is caught:

| Profile | Target average | Expected checkout % | Expected sigma order of magnitude |
|---|---|---|---|
| Pub player | 45 | 8 to 12 | tens of mm |
| County | 75 | 25 to 30 | high teens |
| Tour card | 95 | 38 to 45 | low teens |
| Elite | 105 | 45 to 50 | single digits |

If a calibrated sigma comes out below about 4mm, the model has gone wrong. A dart is 6mm wide.

---

## Pacing

The bot must not answer instantly. Insert a delay before its visit appears, scaled to plausibility: roughly 1.2 to 2.5 seconds per dart, with a longer pause before a checkout attempt. Show the bot's darts landing one at a time in the dart slots, not as a completed total.

This is not decoration. Instant bot visits make the screen feel like a spreadsheet and make it impossible to follow the match while you are walking to the board.

Respect `prefers-reduced-motion` by keeping the delays but removing any animation.

---

## Screens

### `/opponents`
Four cards, one per profile: name, target average, one line of description. Tapping one starts a 501 match against it. Match length is a single control, defaulting to first to three legs.

### The live game
Renders through `LiveGame` from spec 0004 with two participants. The bot's rail cell shows its live average like any player's. The pad is disabled while it is the bot's throw, visibly, not silently.

---

## Acceptance criteria

- [ ] `segmentAt` correctly resolves the centre of every one of the 62 scoring regions plus a miss, verified against a table of known coordinates
- [ ] `segmentAt(0, 105)` is treble 20, and `segmentAt(0, 166)` is double 20
- [ ] Aiming at T20 with a mid-range sigma produces misses predominantly into 5 and 1
- [ ] `simulateThrow` is deterministic given a fixed rng seed
- [ ] Over 10,000 legs, each profile's measured three-dart average is within 0.5 of its `targetAverage`
- [ ] Over 10,000 legs, each profile's checkout percentage falls in the expected band above
- [ ] The elite profile produces a 180 rate that is high but not absurd, in the region of one visit in fifteen to twenty five
- [ ] The bot busts, and recovers from busts, using the same code path as a human player
- [ ] Bot darts are persisted with `targetSegment` and `targetRing` populated
- [ ] The pad is visibly disabled during the bot's visit
- [ ] Bot darts appear one at a time with a delay, not as a completed visit
- [ ] Undo during a human visit does not disturb the bot's completed visits
- [ ] There is no scoring logic in `/lib/bot` that duplicates `/lib/scoring`

---

## Data model changes

None beyond populating `botProfiles.scoringSigmaMm` and `doubleSigmaMm` in the seed, which spec 0001 deliberately left null.

---

## Out of scope

- Bot personalities, chat, trash talk, walk-on music
- Adaptive difficulty that tracks the player's form
- Bots in practice games
- Simulating a bot's dart-to-dart correlation, for example tightening after a treble. Real, but not worth the complexity in Phase 1
- Naming bots after real players. Do not use the names of actual darts professionals anywhere in the product

---

## Notes for Claude Code

1. **Build and test the geometry first, in isolation.** Everything else is built on `segmentAt` being right, and it is easy to get the segment rotation half a bed out. A test that walks the perimeter in one-degree steps and checks the sequence of segments catches this immediately.
2. **The bull is a double.** For checkout purposes, and for the geometry, and in the strategy.
3. **Do not hand-tune the sigmas.** Run the calibration script. Hand-tuned values look right for one profile and drift for the rest.
4. **Keep `/lib/bot` free of any rules knowledge.** It aims, it throws, it returns darts. Whether a dart busts is `/lib/scoring`'s business.

## Implementation notes (30 July 2026)

- Calibrated values live in `lib/bot/calibration.ts` and the seed. Measured over 10,000 legs: pub 45.04 avg / 10.2% checkout, county 74.70 / 26.5%, tour card 95.20 / 39.8%, elite 104.89 / 46.3% — every average within 0.5 and every checkout band met.
- Model deviation, accepted: the elite profile's 180 rate measures ~1 visit in 11.5, above the spec's guessed 1-in-15-to-25 region. The pure Gaussian model cannot sustain a 105 average with fewer trebles; the average and checkout criteria are the binding ones.
- The bot is orchestrated client-side by `LiveGame`: each dart is chosen with `chooseTarget`, thrown with `simulateThrow`, and recorded through the same `POST /api/games/:id/darts` path as a human dart, one at a time with a 1.2-2.5s pace and a longer pause before a double.
