# ADR 0009 — Player profiles are a name on the chalkboard, not an account

**Status:** Accepted
**Date:** 20 September 2026
**Amends:** ADR 0006 (single-user posture)

---

## Context

ADR 0006 settled that Arrows is single-user: no Clerk, no Resend, no
analytics, protected by Vercel Deployment Protection and nothing else.
`lib/auth` was kept as the seam in case that ever changed.

It has changed, but not in the direction that ADR anticipated. Tom's children
now throw at the same board, and the JDC Challenge's belts (spec 0011) are the
thing they want to be measured on. Every attempt has to belong to whoever
threw it.

The obvious reading — "multiple users means authentication" — is wrong here.
The app runs on one device beside a dartboard, used standing up, one-handed,
between visits. A login wall on that device would be friction at exactly the
wrong moment, and the threat model is a household, not the internet: the
device is already behind Deployment Protection, and nothing on it is worth
protecting from the people in the room.

## Decision

**A player profile is a name on the chalkboard, not a user account.**

1. **Tap your name.** `/players` lists every player as a large tap target.
   One tap selects; the choice persists in `localStorage`. No password, no
   PIN, no email, no Clerk. ADR 0006's stack decisions are unchanged.
2. **The current player is not authentication,** and lives beside it rather
   than inside it. `lib/auth` still exports `useUser`/`useIsAdmin` for the
   dev-only role toggle; it now also exports `usePlayerId`, backed by the
   persisted selection instead of a hardcoded constant. Components keep
   importing from `@/lib/auth` and know nothing of either implementation
   (CLAUDE.md rule 3).
3. **`playerId` is a request parameter, not a session.** Every scoped
   endpoint takes it explicitly and defaults to `player-tom`. There is no
   server-side notion of "who is logged in", because there is no login.
4. **The whole app scopes to it** — stats, history, practice personal bests
   and the training programme, not only the challenge. A child's JDC belt
   being theirs while their doubles heatmap is mixed in with everyone's would
   be plainly wrong.
5. **Anyone can select anyone.** This is accepted, not overlooked. A child can
   throw as a sibling, by accident or on purpose. The mitigation is
   visibility rather than authorisation: the current player is named in the
   header on every screen, and again immediately above the JDC start button,
   which is where a mis-attribution is most likely and most annoying.

## Consequences

- **A PIN is the upgrade path if mischief becomes real.** It slots in at the
  picker without touching the scoping, the API or the data model — the
  selection would simply need confirming before it takes effect. Nothing in
  this decision forecloses it, and nothing in it assumes it.
- **No delete.** Removing a player would orphan or destroy their games.
  Rename covers the real case and keeps the record attached.
- **One schema change:** `training_sessions.player_id`. Everything else
  already carried its player — the app just never asked which one it wanted.
- **The `player-tom` default is load-bearing.** It is what lets an
  un-updated caller behave exactly as before, and what the first render uses
  while the stored choice hydrates. Removing it would turn every missing
  parameter into an empty screen.
- **The remembered player is per-browser.** Consistent with ADR 0006's
  no-sync posture: there is no account to attach it to, by design.
- **Turn-taking play was considered and set aside.** Several children
  alternating through one challenge with a live side-by-side scoreboard is a
  better sibling experience, but it is an engine change rather than a screen,
  and per-child records were what was asked for. Spec 0012 records it as out
  of scope rather than pretending it is not wanted.
