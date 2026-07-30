# 0002 — Stack selection

**Status:** Accepted
**Date:** 30 July 2026
**Deciders:** Tom Wild

---

## Context

Arrows is a free, single-purpose web app. The product is technically unremarkable in its infrastructure requirements, though the scoring engine itself is genuinely fiddly. The technology choices should reflect that: pick the most boring, well-trodden path that gets us to launch quickly and lets us iterate without friction.

Technology choices are needed for:

- The web framework
- Hosting and deployment
- The database (Phase 2)
- The ORM (Phase 2)
- Authentication (Phase 2)
- The UI component library and styling
- The mock API layer (Phase 1, per ADR 0001)
- Forms and validation
- Testing
- Error monitoring
- Product analytics
- Email
- Search

The project is being built by a single developer (Tom) with Claude Code assistance. Constraints favour:

- **Speed of development** over flexibility
- **Boring, well-documented choices** over cutting-edge ones
- **Drop-in solutions** that remove infrastructure work
- **Free tiers** that scale to revenue
- **TypeScript-first** tools that pair well with Claude Code

---

## Decision

The full stack is as follows:

### Framework — Next.js 14+ (App Router)

The App Router gives us server components, route handlers, and excellent SEO support out of the box. Next.js + Vercel is the most boring, well-documented combination for a TypeScript web app.

### Language — TypeScript (strict mode)

Strict TypeScript is non-negotiable. The shared types between the mock API and the real backend are the contract that makes ADR 0001 work. Without strict typing, that contract breaks down.

### Hosting — Vercel

Vercel is the path of least resistance for a Next.js app. Free hobby tier handles the prototype phase, automatic preview deployments per pull request handle the staging environment, edge caching handles performance.

### Database (Phase 2) — Neon Postgres

Neon is serverless Postgres with branches per environment, a generous free tier, and native integration with Vercel. Postgres itself is the boring, correct choice for relational data.

### ORM (Phase 2) — Drizzle

Drizzle is type-safe and SQL-first. No abstraction overhead, no separate schema language, migrations are first-class. Schema changes are TypeScript files, which means Claude Code can reason about them directly.

### Auth (Phase 2) — Clerk

Clerk is a drop-in auth solution. Free tier covers up to 10,000 monthly active users. It handles sign-up, sign-in, password reset, email verification, and session management with no custom code.

### Billing — none

Removed from the standard stack. Arrows is free and has no paid tier, so there is no Stripe account, no billing code, and no subscription state on the user record in any phase. See PRD Section 8.

This is the only deviation from the house stack.

### UI components — shadcn/ui

shadcn/ui isn't a library — it's a collection of components copied into the repo. This means we own the code, can modify it freely, and have no version upgrades to worry about. Built on Radix primitives and Tailwind. Dark mode is built-in. Every component is accessible by default.

### Styling — Tailwind CSS

The boring, correct choice for utility-first styling. Pairs perfectly with shadcn/ui and Claude Code reasons about Tailwind classes natively.

### Mock API (Phase 1) — MSW (Mock Service Worker)

Per ADR 0001. MSW intercepts real `fetch()` calls in the browser and returns mocked responses, which means frontend code is identical between Phase 1 and Phase 2.

### Forms — React Hook Form + Zod

React Hook Form is the standard for form state management. Zod gives us runtime validation that derives TypeScript types automatically. Together they pair cleanly with shadcn form components.

### Testing — Vitest + Playwright

Vitest for unit and integration tests. Playwright for end-to-end tests.

### Error monitoring — Sentry

Free tier, native Next.js integration. Essential from day one of the live product.

### Product analytics — PostHog

Covers event tracking, funnels, session replay, and feature flags in one tool. Free tier is generous. Self-hostable later if data residency becomes a concern.

### Email (Phase 2) — Resend

Built for Next.js. React Email library lets us write templates as React components. Used for welcome emails, payment receipts, password resets.

### Search (Phase 2) — Postgres FTS + pg_trgm

Postgres full-text search with the `pg_trgm` extension handles fuzzy matching. Enough for the volume at launch. Can upgrade to Meilisearch later if search becomes a bottleneck.

### Search — not needed

Postgres FTS and `pg_trgm` are in the house stack for products with a searchable corpus. Arrows has no corpus. There is nothing to search. Skip it.

---

## Stack overrides from the house default

| Layer | House default | Arrows | Why |
|---|---|---|---|
| Billing | Stripe | None | The product is free. See PRD Section 8 |
| Search | Postgres FTS + pg_trgm | None | Nothing to search |

Everything else is the house default, unchanged.

### One addition worth noting

There is no new dependency for the scoring engine, the checkout finder, or the bot simulator. All three are plain TypeScript in `/lib`. There are darts libraries on npm. They are not used, because the rules are about eighty lines of code, the edge cases are the whole point, and owning them means the property-based tests in ADR 0003 actually test our behaviour rather than someone else's.

---

## What we explicitly chose NOT to use

- **Prisma** — heavier abstraction than Drizzle, slower migrations, separate schema language.
- **Supabase** — bundles auth, storage, and database. Clerk + Neon is more flexible and avoids vendor lock-in on auth.
- **NextAuth / Auth.js** — more configuration than Clerk and slower to set up.
- **Tailwind UI / DaisyUI / Material UI / Chakra** — all heavier and less customisable than shadcn. shadcn won because we own the components.
- **Jest** — slower than Vitest and worse Next.js integration.
- **Cypress** — older and slower than Playwright.
- **Algolia** — overkill for launch volume. Postgres FTS is fine until evidence says otherwise.
- **Mixpanel / Amplitude** — more expensive than PostHog and don't offer session replay or feature flags in their free tiers.
- **Mailchimp / SendGrid** — older, less developer-friendly, no native React Email integration.
- **Redux / Zustand / Jotai** — no global state management library will be added unless we hit a real need. Server state goes through the API client; local UI state uses `useState`/`useReducer`.
- **CSS Modules / styled-components / Emotion** — Tailwind utility classes only.

---

## Consequences

### Positive

- **Every layer is the boring, correct, well-documented choice.** Claude Code has extensive training data on every tool in the stack.
- **Free tiers cover the entire MVP phase.** Infrastructure cost until launch is ~$0/month. After launch, ~$40-60/month until real scale.
- **The stack is internally consistent.** Next.js + Vercel + Neon + Clerk + shadcn is a well-trodden path with abundant documentation.
- **TypeScript-first throughout.** Every layer is strongly typed, which makes the data contract between Phase 1 and Phase 2 robust.
- **No vendor lock-in we can't escape.** Clerk could be swapped for Better Auth. Neon is just Postgres. Drizzle is just SQL. Vercel is just Next.js hosted somewhere.

### Negative

- **Multiple services to manage at launch.** Vercel, Neon, Clerk, Sentry, PostHog, Resend. Six accounts. All free tier, but each is a small operational concern.
- **No revenue means no budget.** Every layer has to stay inside a free tier or Tom pays for it personally. This constrains any future feature that needs real compute.
- **Clerk pricing climbs sharply above 10,000 MAU.** If we grow past that, we'd need to pay higher tiers or migrate to self-hosted auth. Acceptable risk.
- **Vercel bandwidth pricing can be surprising.** Edge caching mitigates this.

---

## Related documents

- ADR `0001-mock-first-build-strategy.md` — the build strategy this stack supports
- `docs/PRD.md` Section 9 (Tech Stack) — the same stack in tabular form
- `docs/CLAUDE.md` — the conventions that flow from these choices
