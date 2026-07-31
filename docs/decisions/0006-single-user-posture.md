# ADR 0006 — Single-user posture: no Clerk, no Resend, no PostHog

**Status:** Accepted
**Date:** 30 July 2026

---

## Context

The stack selection (ADR 0002) listed Clerk for auth, Resend for account
emails and PostHog for analytics, all Phase 2 items. ADR 0005 deferred
Clerk pending keys. Arrows is Tom's personal practice app: one player, one
board, no audience.

## Decision

Clerk, Resend and PostHog are dropped, not deferred. Tom's call, 30 July 2026.

- **Auth:** the app runs single-user. The anonymous flow maps to the seeded
  `player-tom`; the mock auth toggle remains a dev-only convenience. Access
  control in production is Vercel Deployment Protection (Vercel
  Authentication), which limits the app to Tom's Vercel login — an
  appropriate lock for personal data with zero auth code.
- **Email:** there are no accounts, so there is nothing to email.
- **Analytics:** the product's analytics are the stats screens themselves.

`lib/auth` stays as the abstraction seam. If the app ever grows a second
real user, Clerk drops in behind it exactly as ADR 0002 planned, with a new
ADR superseding this one.

## Consequences

- The `/login` and `/signup` placeholder pages are now permanently
  placeholders; the account-creation copy in the PRD describes a future
  that is currently not planned.
- `userId` on the players table stays null forever under this posture —
  harmless, and cheap to keep for the drop-in path.
- Sentry remains the only listed third-party service still unwired; it is
  optional Phase 3 polish.
