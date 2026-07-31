# Research: a training programme for Arrows

**Status:** Research only — nothing here is committed product scope
**Date:** 31 July 2026
**Sources:** Exa web research, 31 July 2026 (links inline)

Tom's brief: research the best way to train darts and design a training
programme feature for Arrows — think of it like a fitness app. This
reverses PRD Section 3, which explicitly excluded "drill programmes or
anything that tells the user what to practise next"; building it needs a
PRD revision and an ADR.

---

## 1. What the motor-learning research says

Darts is unusually well studied because dart throwing is a standard lab
task for motor-learning experiments. Five findings matter for programme
design:

1. **Interleaved (random) practice beats blocked practice for retention.**
   The contextual-interference effect: practising varied targets in mixed
   order feels worse in the session but produces better retention and
   transfer than grinding one target. Nuance: the effect is strongest on
   ~24-hour retention tests, and one study found *systematically
   increasing* interference (blocked early, random later) outperformed
   both extremes ([Karimiyani et al. 2013](https://scindeks.ceon.rs/article.aspx?artid=1451-740X1303239K),
   [Frontiers 2019 review](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.01359/full),
   [SCIRP 2014](https://www.scirp.org/journal/paperinformation?paperid=45903)).
   → Sessions should mix targets and switch drills; programmes should move
   from blocked toward interleaved as weeks progress.

2. **Variable practice improves transfer.** Practising from varied
   distances/targets beat constant-condition practice on transfer tests
   ([Perceptual & Motor Skills 1998](https://journals.sagepub.com/doi/10.2466/pms.1998.87.1.147)).
   → Don't only train T20; vary the aim point within a theme.

3. **Pressure inoculation works.** Practising under simulated pressure
   (stakes, being observed, consequences) prevented choking on
   high-pressure tests, and explicit instruction + high-pressure practice
   was the best combination ([IJESAB 2024](https://digitalcommons.wku.edu/ijesab/vol16/iss3/127)).
   → Drills need pressure variants: lives, must-finish-on-a-streak,
   deciding-leg simulations, "one dart at each double".

4. **Deliberate practice hours predict standing in darts specifically.**
   Ericsson's framework applied to professional vs amateur dart players:
   accumulated *solitary structured* practice differentiates levels
   ([Duffy, Baluch & Ericsson 2004](https://graphics8.nytimes.com/images/blogs/freakonomics/pdf/DartPerformance.pdf)).
   → Structure and measurement are the product; volume alone is not.

5. **Spacing beats massing.** Every practitioner source repeats it: an
   hour a day beats seven hours on Sunday; effective session length tops
   out around 60–90 minutes; warm up 10–15 minutes before scoring anything
   ([GoDartsPro](https://www.godartspro.com/practice/),
   [Skipjack](https://www.skipjackdarts.com/how-many-hours-a-day-should-i-practice-darts-skipjack.html)).
   → Short scheduled sessions with streaks — exactly the fitness-app loop.

## 2. The practice canon (what good players actually throw)

**The four pillars** appear in nearly every credible routine
([D-Artist](https://d-artist.com/darts-practice-routine.html),
[GoDartsPro](https://www.godartspro.com/practice/),
[Dartbox](https://dartbox.co.uk/blogs/news/how-to-build-a-darts-practice-routine-that-actually-works)):

1. Scoring consistency (T20 blocks, grouping, drift awareness)
2. Target switching (20↔19↔18 discipline)
3. Checkout execution (routes 40–170, by band)
4. Pressure doubles (the four primary finishing doubles D16/D20/D18/D10)

**Named routines worth knowing** (rules verified):

- **JDC Challenge** — the Junior Darts Corporation's official grading
  routine, now used virally by adults. Three parts: Shanghai 10–15 (3
  darts per number, 100-pt Shanghai bonus), one dart at every double
  1–20 + bull (50 pts each, bull 100), Shanghai 15–20. Graded like belts:
  White 0–149, Purple –299, Yellow –449, Green –599, Blue –699, Red –849,
  **Black 850+**. Takes 15–20 minutes; JDC academies run it weekly as
  their ranking assessment ([DolfDarts](https://dolfdarts.com/games/jdc-challenge),
  [Darts Planet TV](https://dartsplanet.tv/darts-games-the-jdc-challenge-explained/)).
- **121** — start on 121, nine darts to check out; success +1, failure −1;
  checking out in 3 darts **locks a base** you can't fall below
  ("safehouse"). Variants: 3-dart sprint (+10 per success), progressive
  dart allowance, configurable safehouse rules
  ([DolfDarts](https://dolfdarts.com/games/121),
  [DartCounter](https://dartcounter.net/games/121-checkout)).
- **Checkout Challenge** — adaptive: start 21/61/91, finish in 3 darts →
  +10, fail → −1. Timed or lives mode
  ([DolfDarts](https://dolfdarts.com/games/checkout-challenge)).
- **Nine Lives** — around the clock with lives: miss the target with all
  three darts, lose a life ([DolfDarts](https://dolfdarts.com/games/nine-lives)).
- Plus the ones Arrows already has: Bob's 27, Shanghai, Halve-it,
  Around the clock, Doubles round the board, Checkout ladder, Random
  checkout, Scoring drill.

**Session shape** (consistent across sources): 10–15 min warm-up (arm
loose, then target switching), 30–60 min main work with one clear
objective, short pressure finisher / match simulation. Club-level dose:
**30–45 minutes, 3–5 days a week.**

**Programme shape:** weekly split by pillar (scoring day, doubles day,
finishing day, match-sim day, mixed day) and, at the ambitious end,
**12-week periodisation** in three phases — foundation (scoring floor,
mechanics, blocked work), controlled expansion (trebles + finishing under
moderate pressure), competitive compression (deciding-leg reps, fatigue,
taper) ([D-Artist Practice Trainer](https://d-artist.com/practice-trainer.html)).
A real touring pro's week is 3+ structured sessions plus competition used
as practice ([Aim180 pro interview](https://aim180.org/2020/01/25/practice-and-preparation-our-coach-mystery-pro-talk-specifics/)).

**Metrics that matter beyond the 3-dart average:** double conversion %
(practice vs match separated), sub-60-visit frequency (scoring floor),
darts per finish, volatility between best and worst visits, and
longitudinal benchmark scores (JDC grade) — general averages hide
structural weaknesses.

## 3. Competitor scan

- **My Dart Training** (the category leader): ~20 training variants (incl.
  JDC, 121, Bob's 27, A1 drill, Catch 40, Finishing 50), CPU opponents at
  15 levels, per-profile stats. It is a *library* of drills — no plans, no
  programming, no guidance. Reviews praise depth, call the UX clunky.
- **GoDartsPro**: web training games + "Performance Center" graphs;
  publishes the four-skill-areas week but the user assembles it manually.
- **DartCounter Ultimate**: strong 121 implementation with configurable
  safehouse rules; training games behind subscription.
- **Dartsmind**: camera auto-scoring + drills; hardware angle, not
  programming.

**The gap:** every app is a drill library plus a stats page. None of them
does what a fitness app does — *compose drills into scheduled sessions,
sessions into a progressive programme, adapt the programme to your
measured weaknesses, and hold you to it with streaks.* Arrows is uniquely
positioned because it already records **exact per-dart targets**, so the
doubles heatmap can drive drill selection with real data rather than
guesswork.

## 4. Proposed design: Training in Arrows (fitness-app framing)

| Fitness concept | Arrows equivalent |
|---|---|
| Workout | **Session**: ordered blocks (warm-up → main sets → finisher), each block an existing engine with a config + dart/visit budget |
| Exercise | **Block**: a practice game (or x01/bot leg) with parameters |
| Plan / programme | **Programme**: N weeks × sessions/week, themed by pillar, difficulty phased blocked → interleaved → pressure |
| Fitness test | **Assessment**: the JDC Challenge, graded White→Black, scheduled fortnightly; before/after per programme |
| Progressive overload | 121-style ladders with safehouse locking; Checkout Challenge +10/−1; bot difficulty stepping up when you win a set |
| Streaks / rings | Session-complete ring, weekly session streak, minutes at the oche |
| Adaptive coaching | **Weakness block**: worst 3 doubles with ≥5 recorded attempts become a targeted doubles block in the next session |

**A concrete week (Foundation phase, ~35 min/session, 4 days):**

- *Day 1 · Scoring:* warm-up (3 visits free + 3 visits switching 20/19/18)
  → Scoring drill (20 visits at T20) → finisher: Halve-it.
- *Day 2 · Doubles:* warm-up → Doubles round the board → pressure
  finisher: hit your 3 weakest doubles twice each to end the session.
- *Day 3 · Finishing:* warm-up → Checkout ladder (or 121 ladder) →
  Random checkout ×10.
- *Day 4 · Match:* warm-up → 501 vs bot one level above comfort, first to
  3 → JDC Challenge every second week instead.

**What already exists vs what's new:**

- Existing engines cover most blocks: scoring-drill, doubles-round-the-board,
  checkout-ladder, random-checkout, halve-it, shanghai, bobs-27, x01 + bot.
- New engines needed (all small, same PracticeEngine interface):
  **JDC Challenge** (assessment), **121 ladder** (generalise
  checkout-ladder: configurable start/darts/increment/safehouse),
  **target-switching drill**, **pressure doubles** (N clean hits to
  finish, lives variant).
- New data: `trainingPrograms` (static config, like practiceGameDefinitions),
  `trainingSessions` (planned instances with completion state), block
  results linking to existing `games` rows — the dart log stays the only
  source of truth; a session is just a named, ordered wrapper around games.
- Stats additions: JDC grade trend, double conversion split
  (practice/match), sub-60 visit frequency, darts per finish.

**Suggested MVP slice** (one spec's worth): one built-in 4-week Foundation
programme, the session runner (chains existing games with a progress rail
and completion ring), the JDC Challenge engine as the assessment, and
session streaks. Adaptive weakness blocks and 12-week periodisation come
second — the heatmap data that powers them gets richer with every session
Tom completes in the meantime.

**Things deliberately NOT proposed:** coaching content/videos, technique
advice, social leaderboards, timed drills (Arrows records latency but the
PRD keeps time out of the user's face) — all still out of scope.

## 5. Open questions for Tom before speccing

1. Programme rigidity: fixed session days with rest days (fitness-app
   strict) or "next session whenever you open the app" (queue model)?
   Research favours spacing; life favours the queue. Recommendation: queue
   with a weekly target and streak, no guilt mechanics.
2. Does a training session live inside the existing `sessions` concept or
   alongside it? Recommendation: a training session *is* an app session
   with a programme tag, so history and stats stay unified.
3. Assessment cadence: JDC fortnightly (academy-style weekly feels heavy
   at 15–20 min on top of a session).
4. Should the bot feature in programmes by default (match-sim day)?
   Current stats filters make bot legs excludable either way.
