# Arrows — Build PRD

*Living document. Source of truth for the MVP build. Update as decisions are made.*

**Status:** Draft v0.1
**Last updated:** 30 July 2026
**Owners:** Tom Wild

---

## 1. Product Summary

**Name:** Arrows

**One-liner:** A per-dart darts scoring app for solo practice, with a set of practice games, a simulated opponent, and stats that show which doubles you actually miss.

**Target user:** Tom. A club-standard darts player practising alone at his own board, phone propped up or held in one hand, mid-session, throwing three darts at a time. Every design decision assumes a single user standing at the oche who wants to keep throwing, not a user sitting down browsing.

**Core use case:** Open the app, tap one of four things, and be throwing within five seconds. Enter each dart as it lands. At the end of the leg or drill, see the average, the checkout percentage, and whether it was better or worse than usual. Then throw again.

**Pricing:** Free. There is no paid tier, no billing, and no Stripe integration in any phase. See Section 8.

---

## 2. User Roles

Arrows has no subscription. The role model is deliberately thin.

### Anonymous (not logged in)
- Can play everything: 501, all practice games, the bot opponent
- Results are held in memory for the current session only and are lost on refresh
- Sees one persistent, non-blocking prompt offering to save history by creating an account

### Player (logged in)
- Everything an anonymous user can do
- Results persist across sessions and devices
- Full access to history, trends, and the doubles heatmap

### Admin (Tom)
- Everything a player can do
- Can view and edit practice game definitions and bot profiles
- Can view basic usage stats

There is no subscriber role and no lapsed role, because there is nothing to subscribe to.

---

## 3. MVP Scope

### In scope

**Scoring**
- Per-dart entry as the only input method. Every dart is recorded as a segment plus a ring, never as a visit total
- The modifier pad as the default and only pad: sticky Double and Treble toggles above a 1 to 20 grid, plus 25, Bull and Miss. See ADR 0004
- Contextual finish strip: when a checkout exists from the current score, the segments of that route appear as one-tap keys above the grid
- Single-dart undo, always visible, never behind a menu
- Full x01 rules: 501 start, straight in, double out, correct bust handling (score below zero, score of exactly one, or reaching zero without a double)

**Game modes**
- 501 solo
- 501 two player, pass the phone, alternating throw, first to N legs
- 501 against a simulated bot opponent at selectable skill levels
- Eight practice games (see Section 7.4)

**Stats**
- Three-dart average, first-nine average, checkout percentage, doubles hit rate by individual double, 180s, 140+, 100+, best leg in darts
- Session history and a trend line of average over time
- Per-double heatmap showing hit rate on every double from D1 to D20 plus bull

**Platform**
- Mobile-first responsive web app, portrait only in the throwing UI
- Screen wake lock while a game is live
- Dark by default

### Out of scope (explicitly)

- Offline mode and service worker caching. Tom has wifi wherever he plays. Do not build a sync layer
- Online multiplayer, friend lists, challenges, leaderboards, anything social
- Camera or automatic scoring hardware integration
- Tournaments, leagues, ladders, seasons
- Native iOS or Android apps
- Any relationship with, or shared code from, the OCHE fantasy darts project. Separate products, separate repos
- Cricket, Killer and other multiplayer pub games. Two player is 501 only in Phase 1
- Voice input
- Any paid tier, billing, or Stripe integration
- Coaching content, drill programmes, or anything that tells the user what to practise next

---

## 4. Data Model

Arrows is event sourced. The `darts` table is the only place a score is recorded. Everything else here is either structure that groups darts, static configuration, or a derived cache. See ADR 0003, the most important architectural decision in this project.

### players

| Field | Type | Notes |
|---|---|---|
| id | string | |
| displayName | string | |
| isBot | boolean | |
| botProfileId | string \| null | Set when `isBot` is true |
| userId | string \| null | Phase 2 only. Links to the Clerk user |
| createdAt | string | ISO 8601 |

### botProfiles

| Field | Type | Notes |
|---|---|---|
| id | string | |
| name | string | For example "Pub player", "County", "Tour card", "Elite" |
| targetAverage | number | The three-dart average this profile should converge on |
| scoringSigmaMm | number | Standard deviation of throw scatter when aiming at a treble |
| doubleSigmaMm | number | Separate, usually larger, scatter when aiming at a double |
| description | string | Shown in the opponent picker |

### sessions

| Field | Type | Notes |
|---|---|---|
| id | string | |
| playerId | string | The human player |
| startedAt | string | ISO 8601 |
| endedAt | string \| null | Null while live |
| note | string \| null | Free text, for example "new flights" |

### games

| Field | Type | Notes |
|---|---|---|
| id | string | |
| sessionId | string | |
| mode | string | `x01`, or the key of a practice game definition |
| config | object | Mode-specific. For x01: startingScore, legsToWin. For practice: per-game options |
| participantPlayerIds | string[] | One entry for solo and practice, two for versus |
| startedAt | string | |
| endedAt | string \| null | |
| abandoned | boolean | True if the user left mid-game |

### legs

| Field | Type | Notes |
|---|---|---|
| id | string | |
| gameId | string | |
| index | number | Zero based |
| startingScore | number \| null | 501 for x01. The game's own starting value for practice, or null |
| startingPlayerId | string | Alternates each leg |
| winnerPlayerId | string \| null | |

### visits

| Field | Type | Notes |
|---|---|---|
| id | string | |
| legId | string | |
| playerId | string | |
| index | number | Zero based within the leg, per player |
| bust | boolean | Derived from the darts in the visit |

A visit holds one, two or three darts. It holds fewer than three when the leg is won or when a bust ends the visit early.

### darts

The event log. Immutable. Nothing here is ever updated, only appended or, on undo, deleted from the tail.

| Field | Type | Notes |
|---|---|---|
| id | string | |
| visitId | string | |
| index | number | 0, 1 or 2 within the visit |
| segment | number | 1 to 20, 25 for the bull area, 0 for a miss off the board |
| ring | string | `S`, `D`, `T` or `MISS`. Bull is segment 25 ring D. Outer bull is segment 25 ring S |
| score | number | Stored for convenience. Must always equal segment times the ring multiplier |
| targetSegment | number \| null | What the player was aiming at, when the mode knows it. Populated for practice games and bot throws. Null in free scoring |
| targetRing | string \| null | As above |
| thrownAt | string | ISO 8601 |
| latencyMs | number \| null | Milliseconds since the previous dart in the same visit. Used to measure pad speed. Not shown to the user by default |

### practiceGameDefinitions

Static configuration. Seeded, not user created in Phase 1.

| Field | Type | Notes |
|---|---|---|
| key | string | For example `around-the-clock` |
| name | string | |
| blurb | string | One line, shown in the picker |
| targetType | string | `sequence`, `score` or `checkout` |
| rules | object | Machine-readable rule config. See spec 0005 |
| scoringModel | string | `darts-to-complete`, `points` or `hit-rate` |
| personalBestDirection | string | `lower-is-better` or `higher-is-better` |

### results

A derived cache, written when a game ends. Never the source of truth. Must be reproducible by replaying the darts.

| Field | Type | Notes |
|---|---|---|
| id | string | |
| gameId | string | |
| playerId | string | |
| metrics | object | threeDartAverage, firstNineAverage, dartsThrown, checkoutPct, doublesAttempted, doublesHit, bestVisit, count180, count140plus, count100plus, plus the game-specific score for practice games |
| computedAt | string | |

*Each entity above has its full shape defined in spec 0001 (Seed Data Shape).*

---

## 5. URL Structure

| Path | Page |
|---|---|
| `/` | Home. Start a game. Four entry points |
| `/play/[gameId]` | The live throwing screen. Used by every mode |
| `/practice` | Practice game list |
| `/practice/[key]` | A single practice game: rules, personal best, start |
| `/opponents` | Bot opponent picker |
| `/stats` | Averages, trends, the doubles heatmap |
| `/history` | Session and game history |
| `/history/[gameId]` | A single game, dart by dart |
| `/account` | Account and sign out |
| `/login` | Login |
| `/signup` | Create account |
| `/admin` | Admin dashboard |

---

## 6. Confirmed Decisions

### 6.1 Mock-first build strategy ✅
See ADR 0001. Phase 1 uses MSW + seed.json. Phase 2 replaces with a real backend. Phase 3 is polish.

### 6.2 Stack selection ✅
See ADR 0002. Standard stack: Next.js, TypeScript, Vercel, Neon, Drizzle, Clerk, shadcn/ui, Tailwind, MSW, Vitest, Playwright. Stripe is removed because the product is free.

### 6.3 The dart event log is the single source of truth ✅
See ADR 0003. Every score, average, bust, checkout percentage and undo is derived by replaying immutable dart events. No running total is stored as authoritative state.

### 6.4 Modifier pad as the only input method ✅
See ADR 0004. Both a frequency-first "board pad" and a "modifier pad" with sticky Double and Treble toggles were prototyped and thrown against. The modifier pad won on predictability. Only one pad ships.

---

## 7. Pages and Screens

### 7.1 Home (`/`)
- Four entry points, thumb sized, nothing else: **501 solo**, **501 vs bot**, **Two player**, **Practice**
- Below them, one line of context: last session average and date
- No marketing, no onboarding carousel. This screen exists to get out of the way

### 7.2 Live game (`/play/[gameId]`)
The only screen that really matters. Detailed in spec 0004.

- Player rail at the top: name, live average, darts thrown, legs won
- Remaining score as the largest element on screen
- Three dart slots that fill as darts are entered
- Contextual finish line under the score when a checkout exists
- The modifier pad occupying the bottom half
- Undo dart, always visible
- Screen wake lock active for the duration

### 7.3 Practice (`/practice`, `/practice/[key]`)
- List of the eight games with the personal best against each
- A game page states the rules in three lines maximum, shows the personal best, and starts the game

### 7.4 The practice games (Phase 1 set)

| Key | Name | What it trains |
|---|---|---|
| `around-the-clock` | Around the clock | Board coverage. 1 to 20, then 25, then bull, in order |
| `doubles-round-the-board` | Doubles round the board | D1 to D20 then bull, in order |
| `bobs-27` | Bob's 27 | Doubles under pressure, with a running score |
| `shanghai` | Shanghai | Single, double and treble of the same number |
| `halve-it` | Halve it | Target discipline. Score halves on a missed target |
| `checkout-ladder` | Checkout ladder | Finishing. Starts at 41 and climbs on success |
| `random-checkout` | Random checkout | Finishing cold from a random score between 41 and 170 |
| `scoring-drill` | Scoring drill | Twenty visits at treble 20, logs the average |

### 7.5 Stats (`/stats`)
- Headline: rolling three-dart average across the last 10 sessions
- Trend line of average over time
- The doubles heatmap: hit rate for every double from D1 to D20 plus bull, coloured by rate, with attempt counts. This is the signature screen of the product
- 180s, 140+, 100+ counts
- Best leg in darts

### 7.6 History (`/history`, `/history/[gameId]`)
- Sessions in reverse chronological order
- A game page replays the game dart by dart, visit by visit

### 7.7 Account (`/account`)
- Sign out
- Delete all data

### 7.8 Login and create account (`/login`, `/signup`)
- Clerk hosted, Phase 2
- The CTA is "Create account", not "Subscribe", because there is no subscription. See the note in CLAUDE.md

### 7.9 Admin (`/admin`)
- Practice game definitions and bot profiles
- Basic usage counts

---

## 8. Pricing & Billing

There is none. Arrows is free and has no paid tier.

- No Stripe account, no Stripe integration, no billing code, in any phase
- No subscription state on the user record
- No paywall, no gated features, no upgrade prompts
- Hosting runs on free tiers. If that changes, Tom absorbs the cost

If a paid tier is ever added it needs a new ADR and a PRD revision. Do not build hooks "ready for" billing in the meantime.

---

## 9. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Server components, RSC, route handlers |
| Language | TypeScript (strict mode) | |
| Hosting | Vercel | Hobby tier |
| Database (Phase 2) | Neon Postgres | Serverless, free tier, branches per environment |
| ORM (Phase 2) | Drizzle | Type-safe, SQL-first |
| Auth | None | Dropped — single-user app behind Vercel Deployment Protection. See ADR 0006 |
| Billing | None | Removed. The product is free. See Section 8 |
| UI | Tailwind + shadcn/ui | Components copied into repo |
| Mock API (Phase 1) | MSW | Browser-based fetch interception |
| Forms | React Hook Form + Zod | Barely used. There are almost no forms in this product |
| Testing | Vitest + Playwright | |
| Email | None | Dropped with accounts. See ADR 0006 |
| Errors | Sentry | Free tier |
| Analytics | None | Dropped. See ADR 0006 |

**Stack override:** Stripe is removed from the standard stack. Everything else is standard. See ADR 0002.

---

## 10. Build Strategy

The MVP is built in three distinct phases.

### Phase 1: Frontend with mock API

Build the entire frontend against a mock API powered by Mock Service Worker (MSW) and a hand-editable JSON seed file. The frontend uses real `fetch()` calls to real-looking URLs; MSW intercepts them in the browser and returns mocked responses from an in-memory store hydrated from the seed file.

This produces a fully interactive prototype that:
- Lets Tom throw real legs against it and find out whether the pad is fast enough
- Defines the API contract that the real backend must implement
- Allows the entire frontend to be built without any backend infrastructure
- Uses mock auth (a dev-only toggle for anonymous / player / admin states)
- Has no Clerk, no Postgres, no real users

One Arrows-specific note: the engines in `/lib/scoring`, `/lib/practice` and `/lib/bot` are pure TypeScript with no I/O. They are not mocks. They are production code from day one and they do not change in Phase 2. Only their persistence changes.

### Phase 2: Real backend integration

Replace MSW with real Next.js API routes. Add Clerk for auth. Add Neon + Drizzle for the database. Migrate the seed data into the database.

Critically: **frontend components do not change between Phase 1 and Phase 2.** They continue to use the same `lib/api/*` client functions. The only changes are:
- MSW handlers are deleted
- Real API route handlers are added
- The API client switches from being intercepted by MSW to hitting real routes

### Phase 3: Polish and launch prep

Admin pages, edge cases, error handling, analytics, wake lock edge cases, the stats visualisations at full fidelity.

See ADR 0001 for the full rationale.

---

## 11. Project Structure

```
/arrows
  /app                          ← Next.js App Router
    /(public)                   ← Public-facing routes
    /(auth)                     ← Auth routes
    /admin                      ← Admin routes
    /api                        ← Phase 2 only — real API routes
  /components
    /ui                         ← shadcn components
    /play                       ← Pad, dart slots, score display, player rail
    /practice                   ← Practice game list and per-game chrome
    /stats                      ← Trend line, doubles heatmap
    /admin                      ← Admin-specific components
  /lib
    /api                        ← API client used by all components
    /types                      ← Shared TypeScript types (used by mock + real)
    /auth                       ← Auth helpers (mock in Phase 1, Clerk in Phase 2)
    /scoring                    ← Pure engine: x01 rules, bust, checkout finder, derived stats
    /practice                   ← Pure engine: one rule module per practice game
    /bot                        ← Pure engine: board geometry and throw simulation
    /utils
  /mocks                        ← Phase 1 only — deleted in Phase 2
    /handlers                   ← MSW handlers, one file per resource
    /data
      seed.json                 ← Hand-editable seed data
      store.ts                  ← In-memory store, hydrated from seed
    browser.ts                  ← MSW browser setup
    setup.ts                    ← Conditional initialiser (dev only)
  /docs
    PRD.md                      ← This document
    CLAUDE.md                   ← Instructions for Claude Code
    WORKFLOW.md                 ← How specs become shipped code
    PERFORMANCE.md              ← Performance defaults
    PHASE-2-BACKLOG.md          ← Deliberately deferred items
    environment-setup.md        ← Env vars + infrastructure
    /decisions                  ← ADRs
    /specs                      ← Feature specs (one per shippable chunk)
  /public
  /tests
    /unit
    /integration
    /e2e
```

### Key principles

- **Components never import from `/mocks`.** They only import from `/lib/api/*`. This is the contract that lets us swap mock for real without component changes.
- **Types in `/lib/types` are shared.** Both the mock data and the real API return data conforming to these types.
- **The `/mocks` folder is fully deletable in Phase 2.** Nothing outside `/mocks` depends on anything inside it (except via `/lib/api`, which switches implementation).
- **`/lib/auth` is a thin abstraction over the auth provider.** In Phase 1 it returns mock user state from a dev toggle. In Phase 2 it wraps Clerk. Components call `useUser()` from this module, never from Clerk directly.
- **`/lib/scoring`, `/lib/practice` and `/lib/bot` are pure.** No fetch, no storage, no React. State in, state out. This is what makes the product testable.

---

## 12. Environments

| Environment | Branch | Database | URL |
|---|---|---|---|
| Local dev | feature branches | Neon dev branch | localhost:3000 |
| Preview | PRs | Neon dev branch (preview auto-branching disabled) | Vercel preview URL |
| Production | `main` | Neon main branch | <DOMAIN — not decided yet> |

---

## 13. Things Still to Decide

- **Domain name.** Not chosen. `arrows` is a working name and the repo does not exist yet. Fill in `environment-setup.md` before Phase 2
- **Whether legs against a bot count toward career stats.** Current assumption: yes, tagged with the opponent so they can be filtered out. Confirm before spec 0007
- **Whether two player legs count toward Tom's own stats.** Current assumption: yes, tagged, filterable
- **Bot sigma calibration values.** The simulation model is decided in spec 0006, but the millimetre scatter values that produce each target average must be found empirically by running the simulator
- **Whether practice game personal bests need a conditions note** (new darts, tired, and so on). Probably Phase 3
- **Sets as well as legs in two player mode.** Deferred to the Phase 2 backlog unless it turns out to be trivial

*Move items to confirmed sections above as they're answered.*
