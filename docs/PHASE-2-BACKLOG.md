# Phase 2 Backlog

> Things we know we'll need before public launch but don't need for the Phase 1 prototype. Captured here so they're not forgotten. NOT specs — just notes. Real specs get written after Phase 1 is in hand and we know which of these turn out to be priorities vs paranoia.

**Last updated:** 30 July 2026

> ⚠️ **Before Phase 2 starts:** fill in the placeholders in `environment-setup.md`. The GitHub repo, the Vercel project and the domain do not exist yet. See PRD Section 13.
>
> **There is no billing work in Phase 2.** Arrows is free. Stripe has been removed from every list in this document. See ADR 0002 and PRD Section 8.

---

## How to read this document

Each item below is a thing that's been discussed or identified as needed, but explicitly deferred from Phase 1. They're grouped by category. When Phase 1 is complete and we're ready to start Phase 2 specs, this document is the input.

Items here are:
- **Not** detailed specs — notes, not implementations
- **Not** prioritised within their categories — that happens at Phase 2 planning time
- **Not** committed to — some might turn out to be unnecessary based on Phase 1 learnings

---

## Backend infrastructure (the core Phase 2 work)

These are the inevitable Phase 2 specs. They replace the mock layer with real services.

- **Real database setup** — Neon Postgres provisioning, Drizzle schema mirroring `/lib/types`, migrations from the seed JSON
- **Real auth integration** — Clerk drop-in, user sync via webhook into the local users table, replacing `/lib/auth/mock-auth.ts` with a Clerk-backed implementation in the same module
- **Real API routes** — `/app/api/*` route handlers replacing the MSW handlers, one route per resource, matching the contracts established in Phase 1
- **Transactional email** — Resend integration for welcome emails, payment receipts, password resets
- **Production observability** — Sentry for errors, PostHog for product analytics
- **Cron jobs / scheduled tasks** — anything that needs to run on a schedule
- **Background workers** — anything that needs to happen async

---

## SEO and discoverability

- **Page title and meta description templates** for every page type
- **Open Graph and Twitter card tags** for social sharing
- **JSON-LD structured data** where relevant
- **Sitemap generation** — dynamic
- **robots.txt** — allow crawling, point to sitemap
- **Canonical URLs** — handle variations cleanly
- **301 redirect strategy** for slug changes
- **Breadcrumbs schema markup**

---

## Performance

- **Performance budget** — set targets for LCP, FID, CLS, INP, JS bundle size per route
- **Font loading strategy** — preload critical fonts
- **Edge caching** — Vercel edge config for cacheable pages
- **Database query optimisation** — indexes on the search columns, the slug column, the user lookup columns
- **Bundle splitting** — make sure admin code isn't shipped to public users
- **Lighthouse audit** — automated check in CI

---

## Security and abuse prevention

- **Rate limiting** — per-user and per-IP rate limits on all write endpoints
- **Bot detection** — Cloudflare Turnstile or hCaptcha on signup
- **Input sanitisation** — markdown rendering must strip script tags, links must be safe
- **CSRF protection** — Next.js route handlers protected against cross-site requests
- **Content Security Policy** — strict CSP headers
- **Environment secret management** — Vercel environment variables, no secrets in the codebase
- **Audit log** — track admin actions
- **Account ban enforcement** — actually block banned users
- **GDPR compliance** — privacy policy, cookie banner, data export and deletion endpoints

---

## Legal and policy

- **Privacy policy** — GDPR compliant, mentions Clerk, PostHog, Sentry, Resend as processors
- **Terms of service** — light, since nothing is sold
- **Cookie policy** — what cookies we set and why
- **Content policy** — what's allowed where users can post
- **DMCA / takedown policy**
- **DPAs with processors**

---

## Operations and reliability

- **Backups** — verify Neon's point-in-time recovery is enough
- **Disaster recovery plan**
- **Migration runbook** — how to safely run a database migration in production
- **Rollback procedure** — how to revert a bad deploy
- **Status page** — Instatus, BetterStack, or similar
- **Uptime monitoring** — pinging key pages every minute
- **Alerting** — Sentry alerts for new errors, PostHog alerts for traffic anomalies

---

## Content and voice (deferred to end of Phase 1 polish)

- **Voice and tone guide** — covers empty state messages, button labels, confirmation dialogs, error messages, success messages, email subject lines, onboarding microcopy
- **Content style guide** — sentence case vs title case, oxford commas, abbreviations, dates, numbers
- **Accessibility checklist** — WCAG AA audit, keyboard navigation, screen reader testing

---

## Page design polish (deferred to end of Phase 1)

- **Landing page (`/`) design pass** — refine the homepage as a marketing page
- **Empty state message review** — voice and tone applied to all empty state copy
- **Micro-interactions** — button press feedback, hover states, transitions, page transitions

---

## Analytics and measurement

- **Funnel definition** — which events count as conversion
- **Cohort analysis** — month-over-month retention
- **Feature flag system** — PostHog supports this
- **A/B testing** — for landing page variants
- **Custom dashboards**

---

## Future product features (post-MVP, post-Phase 2)

These are ideas that came up during the Phase 1 design and were deliberately parked. None are committed.

**Scoring and modes**
- **Sets as well as legs** in two player mode. Parked in PRD Section 13 pending whether it is trivial
- **Other x01 variants** — 301, 701, double-in. The config type already accommodates a `startingScore` and a `doubleIn` flag
- **Cricket, Killer, and other pub games.** Genuinely different rule engines, only worth it if two player gets used
- **A ninth practice game.** Only if a real gap shows up in use, not because the folder looks tidy

**Bot**
- **Adaptive difficulty** that tracks the player's recent form and picks an opponent that makes the match close
- **Dart-to-dart correlation** in the simulation, so a bot tightens up after a treble the way a real player does
- **Bots in practice games**, for example a race through around the clock

**Stats**
- **Per-treble heatmap** to sit alongside the doubles one
- **CSV or JSON export** of the full dart log. Cheap to build and the kind of thing that stops the data feeling trapped
- **Session notes** — record what changed (new flights, new stem length, tired, cold garage) against a session so the trend line can be read properly
- **Setup tracking** — associate sessions with a specific set of darts, and compare averages across them

**Platform**
- **Haptic feedback** on dart entry. Worth trying, might be the thing that lets you enter a dart without looking at all
- **Voice entry.** Explicitly out of scope for Phase 1 and probably forever, but "one hundred and forty" is how darts is actually scored, so it deserves one honest experiment
- **Installable PWA**, purely for the home screen icon and the full-screen chrome, not for offline support

---

## Things we explicitly decided NOT to do

From PRD Section 3. These are closed for Phase 1, and the ones marked permanent are closed full stop.

- **Offline mode, service workers and a sync layer.** Tom has wifi wherever he plays. Building sync for a problem that does not exist is the classic way to lose a month
- **Online multiplayer, friend lists, challenges, leaderboards, anything social.** Permanent. This is a tool for practising alone
- **Camera or hardware auto-scoring.** The per-dart pad is the product's input method. See ADR 0004
- **A second input method of any kind.** Permanent. See ADR 0004
- **Tournaments, leagues, ladders, seasons**
- **Native iOS and Android apps**
- **Any shared code with the OCHE fantasy darts project.** Separate products, separate repos. Permanent
- **Any paid tier, billing, or Stripe integration.** See PRD Section 8. Revisiting this needs a new ADR and a PRD revision
- **Coaching output.** No "you should practise D10", no drill programmes, no suggestions. The stats show the fact, the player draws the conclusion. Permanent, because it is the difference between a tool and a nag

These are decisions that might be revisited later, but they're explicitly closed for now.

---

## Process notes

When Phase 1 is complete and ready for Phase 2 planning:

1. Re-read this backlog with fresh eyes
2. Cross-reference against what Phase 1 feedback actually asked for
3. Group items into Phase 2 specs (probably 6-10 specs total)
4. Prioritise specs by what blocks public launch vs what can wait for Phase 3
5. Write the actual specs at that point — they'll be much better for being written against real Phase 1 learnings

**Don't write Phase 2 specs in advance.** This document is intentionally notes only. Premature specification is worse than no specification because it locks in decisions made without real-world feedback.
