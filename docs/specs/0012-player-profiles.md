# Spec 0012 — Player profiles: a household on one board

**Status:** Implemented
**Phase:** 3 (polish)
**Depends on:** Spec 0011, ADR 0003, ADR 0006, ADR 0009, PRD Section 7

---

## Goal

Arrows was built for one person. Tom's children now throw at the same board,
and the JDC Challenge is the thing they want to be measured on — so every
attempt, belt and personal best has to belong to whoever actually threw it.

The plumbing was half there. `players` has always been a table, `games` have
always carried `participantPlayerIds`, and `/api/stats`, `/api/sessions` and
`/api/practice-games` have always accepted a `playerId` query parameter. What
was missing:

1. **Nothing ever sent it.** Every API client called those endpoints without a
   player, so they all fell back to `player-tom` — the hardcoded id in
   `usePlayerId()`.
2. **`/api/jdc` and `/api/training` had no notion of a player at all.** The
   JDC record loaded *every* attempt on the board regardless of who threw it,
   and `training_sessions` had no `player_id` column, so one Foundation queue
   was shared by everyone.
3. **There was no way to say who you are,** and no way to add a player.

This spec makes the current player a real, persisted, switchable thing;
scopes the whole app to it; and adds the family board, which is most of the
motivation when siblings are involved.

It is **not** authentication. See ADR 0009.

---

## Decisions taken

Settled by Tom on 20 September 2026, in answer to four questions:

1. **Tap your name.** A profile picker, no password, no PIN, no accounts. The
   app is used standing at the oche one-handed; a keyboard login there is
   friction nobody would tolerate. ADR 0006's single-user, no-Clerk posture
   stands — this is a name on the chalkboard, not a login.
   *Accepted risk:* a child can throw as a sibling, by accident or on purpose.
   Mitigated by making who is throwing permanently visible, never inferred.
2. **Separate records, one at a time.** Each child switches to their profile
   and throws all 57 darts. No shared turn-taking session; the engine tracks
   one player's attempt, and that is enough for what was asked.
3. **The whole app scopes to the current player** — stats, history, practice
   personal bests and the training programme, not only the challenge.
4. **A family board**, comparing everyone's belt and best on one screen.

---

## User stories

> As **a child at the board**, I can **tap my name before I throw** so that
> **my darts count as mine**.

> As **a parent**, I can **add a profile for each child** so that **everyone
> gets their own belt without me setting up accounts**.

> As **any player**, I can **see my own stats, history, personal bests and
> training queue** so that **the app is about me while I am the one throwing**.

> As **a sibling**, I can **see everyone's belts on one board** so that
> **there is something to chase**.

> As **whoever picks up the tablet**, I can **see who it currently thinks is
> throwing** so that **an attempt never lands on the wrong record by
> surprise**.

---

## Acceptance criteria

### Choosing a player

- [x] `/players` lists every human player as a large tap target and switches
      to whoever is tapped.
- [x] The choice persists across a reload (localStorage), and across
      navigation within a session.
- [x] The current player is named in the header on every screen except the
      pad, and tapping it opens the picker and returns where it came from.
- [x] `/jdc` names who is about to throw immediately above the start button,
      with a "Change" link — the moment a mis-attribution is most likely.
- [x] A player can be added with a name alone; the app switches to them.
- [x] A player can be renamed, keeping the same profile, so their record
      follows the new name.
- [x] Blank, over-long (>24 char) and duplicate names are refused with a
      message; names are trimmed and inner whitespace collapsed.
- [x] Bots never appear in the picker and cannot be renamed.
- [x] If the remembered player no longer exists, the app falls back to the
      first player on the board rather than scoping everything to a ghost id.

### Scoping

- [x] `/jdc` shows only the current player's attempts, belts, trend and part
      bests. Two players never share an attempt.
- [x] A player with no attempts gets an empty record, not somebody else's.
- [x] `/stats`, `/history` and practice personal bests are the current
      player's.
- [x] Each player walks their own Foundation queue: starting or completing a
      session advances only that player's count.
- [x] A game thrown by one player appears in their history and nobody else's.
- [x] `/api/training`'s assessments are the current player's attempts only.

### The family board

- [x] `/jdc` shows every human player with their belt, best and attempt
      count, best score first.
- [x] A player who has never thrown it still appears, last, saying so.
- [x] Bots never appear.
- [x] The board is identical whoever is looking at it; the viewer's own row
      is marked.
- [x] Each row's figures match that player's own record exactly.

---

## API contract

Three endpoints gain a `playerId` query parameter; two are new. Every one of
them already defaulted to `player-tom` server-side, so an un-scoped call
behaves exactly as before — which is what kept this change from being a
breaking one.

### `GET /api/jdc?playerId=…`

Now scoped. The `JdcSummary` gains:

```ts
{
  ...                              // as spec 0011
  playerId: string                 // whose record this is
  family: Array<{
    playerId: string
    displayName: string
    attempts: number
    belt: string | null            // null until they have thrown one
    best: number | null
    latest: number | null
    lastThrownAt: string | null
  }>                               // best first, unthrown players last
}
```

### `GET /api/training?playerId=…`, `POST /api/training/sessions`

Scoped. The POST takes `{ playerId }` in its body and stamps the new session
with it.

### `POST /api/players`

**Request:** `{ displayName: string }`
**Response (201):** `{ player: Player }`
**Errors:** 400 blank or over-long, 409 duplicate name (case-insensitive).

### `PATCH /api/players/:playerId`

**Request:** `{ displayName: string }`
**Response (200):** `{ player: Player }`
**Errors:** 400 blank, over-long or a bot; 404 unknown; 409 duplicate.

There is deliberately **no delete**. Removing a player would orphan or destroy
their games, and a household of a handful of people does not need it. Rename
covers the real case (a typo, or a profile being handed on).

---

## UI components

- `/lib/auth/current-player.ts` — the persisted store. Reads and writes
  `localStorage` inside try/catch: private browsing must degrade to the
  default player, never throw at the oche.
- `/lib/auth/player.ts` — `usePlayerId`, `useSetPlayer`, `usePlayerHydrated`,
  re-exported from `@/lib/auth` so components still import from one place
  (CLAUDE.md rule 3). The stored value is read in an effect, not during
  render, so server and first client render agree.
- `/lib/players/store.ts` — the roster, loaded once and shared, with
  `reload()` for after a create or rename. Without it the header chip and the
  picker would each fetch on every navigation, and a rename would show in one
  and not the other.
- `/app/players/page.tsx` — the picker. Wrapped in `<Suspense>` because
  `useSearchParams` cannot prerender without a boundary.
- `/components/layout/PlayerChip.tsx` — the current player in the header, and
  the place the ghost-id recovery lives.
- `/components/jdc/FamilyBoard.tsx` — one row per player, belt swatch, best.

Every screen that fetches now passes `usePlayerId()` and lists it in its
effect's dependencies, so switching player refetches rather than showing the
previous player's data until a reload.

---

## Data model changes

One column:

```ts
export const trainingSessions = pgTable("training_sessions", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull(),   // ← new
  programId: text("program_id").notNull(),
  // …unchanged
})
```

Nothing else needed migrating. Games, legs, visits, darts, sessions and
results have always carried their player; the app simply never asked which
one it wanted.

`scripts/migrate-multiplayer.ts` adds the column, backfills existing rows to
`player-tom`, then marks it `NOT NULL`. It is idempotent.

> **Tooling gap, pre-existing.** `docs/environment-setup.md` documents
> `pnpm db:migrate` and `pnpm db:push`, but neither script, `drizzle-kit`,
> nor a `drizzle.config.ts` exists in the repo, and there is no migrations
> directory. This migration therefore ships as a script, following the
> `scripts/backfill-jdc.ts` precedent. Worth closing properly before the
> schema changes again.

### Seed

`mocks/data/seed.json` gains two children — **Alfie** (four attempts, White up
to Yellow) and **Maisie** (three, still climbing out of White) — alongside
Tom's five. They are placeholder demo names: real profiles are added in the
app. Their attempts are generated the same way as Tom's, through the bot's
scatter model with a wider sigma, so the family board has a believable spread
rather than three players on the same belt.

`buildPracticeGame` and `sessionAt` in `scripts/generate-seed.ts` now take a
`playerId` instead of hardcoding `player-tom`.

---

## Out of scope

- Any form of authentication, password or PIN. See ADR 0009.
- Turn-taking or head-to-head play: several players alternating through one
  challenge with a live side-by-side scoreboard. Considered and set aside —
  per-child records were what was asked for. The engine tracks one player's
  57 darts, so this would be a real change, not a screen.
- Deleting players.
- Per-player settings, avatars or photos.
- Any cross-device sync: the remembered player is per-browser, as is the
  whole app (ADR 0006).
- A family view of anything other than the JDC belt — no shared stats,
  averages or heatmap comparison.

---

## Notes for Claude Code

- The current player is **not** auth. Do not reach for Clerk, sessions or
  tokens; ADR 0006 still holds and ADR 0009 explains why.
- Every scoped endpoint defaults to `player-tom` when no `playerId` arrives.
  That default is load-bearing: it is what makes an un-updated caller behave
  as it did before, and it is what the first render uses before the stored
  choice hydrates.
- Any new screen that fetches player data must pass `usePlayerId()` **and**
  list it in the effect's dependency array. Forgetting the dependency is the
  failure mode here: the screen keeps showing the previous player until a
  reload, which looks like a data bug and is not.
- `localStorage` can throw. Every read and write goes through try/catch, and
  the app works without it.
- The mock store resets on page refresh (CLAUDE.md, Phase 1), so a player
  added in mock mode vanishes on reload while their id stays remembered. The
  ghost-id recovery in `PlayerChip` handles exactly that, and it is why the
  e2e test navigates within the page rather than reloading after an add.
