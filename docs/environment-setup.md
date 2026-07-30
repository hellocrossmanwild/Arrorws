# Environment & Infrastructure Setup

This is the single reference for all environment variables, secrets, and external service configuration. Read this before setting up a new dev environment, debugging a missing secret, or configuring a new Vercel environment.

*Phase 1 projects don't need most of this — MSW + seed.json cover everything locally. This document gets real once Phase 2 begins and real services are wired in.*

> ⚠️ **Placeholders.** The GitHub repo, the Vercel project and the domain do not exist yet. Every `<REPO_URL>` and `<DOMAIN — not decided yet>` below must be filled in before Phase 2 starts. See PRD Section 13.
>
> **No billing.** Arrows is free. There is no Stripe account and no billing environment variable in any environment. See ADR 0002 and PRD Section 8.

---

## Architecture overview (Phase 2)

```
Local dev       →  Neon Dev branch     (your .env.local DATABASE_URL)
CI tests        →  Neon Dev branch     (CI_DATABASE_URL GitHub secret — same branch)
Vercel preview  →  Neon Dev branch     (Vercel env var — preview branching is DISABLED)
Vercel prod     →  Neon main branch    (Vercel env var — separate production database)
```

There is **one Neon project** with two active branches. Everything that isn't production uses `Dev`.

---

## Neon database

### Branch structure

| Branch | Used by | Notes |
|--------|---------|-------|
| `main` | Vercel production only | The live database — never run migrations against this without care |
| `Dev` | Local dev, CI, Vercel previews | Safe to migrate and seed freely |

**Preview auto-branching is disabled** in the Vercel ↔ Neon integration. This is intentional — Neon's free tier allows 10 branches and auto-branching burns through them instantly. Previews use the `Dev` branch instead.

### Pooled vs unpooled connection strings

Neon gives you two connection strings per branch:

| Type | URL contains | Use for |
|------|-------------|---------|
| **Pooled** | `pooler.neon.tech` | Runtime queries (Next.js API routes, all `DATABASE_URL` usage) |
| **Unpooled / Direct** | `ep-*.neon.tech` (no pooler) | `pnpm db:migrate` only — DDL commands are blocked on pooled connections |

**The `DATABASE_URL` env var should always be the pooled string.** When you need to run migrations, temporarily override it:

```bash
DATABASE_URL="postgresql://<unpooled-direct-url>" pnpm db:migrate
```

### Migration vs push

Always use `pnpm db:migrate` — it generates SQL migration files that are tracked in git and applied in order. `pnpm db:push` skips migration files and pushes the schema directly; only use it for throwaway local experiments.

---

## Environment variables (Phase 2)

### Complete reference table

| Variable | Local `.env.local` | GitHub Secret | Vercel Production | Vercel Preview/Dev |
|----------|-------------------|---------------|-------------------|--------------------|
| `DATABASE_URL` | Neon `Dev` pooled | — | Neon `main` pooled | Neon `Dev` pooled |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | — | `pk_live_...` | `pk_test_...` |
| `CLERK_SECRET_KEY` | `sk_test_...` | — | `sk_live_...` | `sk_test_...` |
| `CLERK_WEBHOOK_SECRET` | Dev endpoint secret | — | Prod endpoint secret | Dev endpoint secret |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | — | <DOMAIN — not decided yet> | Preview URL |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` | — | `/login` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/signup` | — | `/signup` | `/signup` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/` | — | `/` | `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/` | — | same | same |

### GitHub Secrets

| Secret name | Value | Used by |
|-------------|-------|---------|
| `CI_DATABASE_URL` | Neon `Dev` branch **pooled** connection string | CI integration tests |

---

## Where to find each value

### Neon
Neon console → your project → **Branches** → select branch → **Connect** → copy connection string. Toggle "Connection pooling" for pooled vs unpooled.

### Clerk
Clerk dashboard → **API Keys**:
- **Development instance** → `pk_test_...` / `sk_test_...` (use for local and preview)
- **Production instance** → `pk_live_...` / `sk_live_...` (use for Vercel production)

Webhook secrets: Clerk dashboard → **Webhooks** → your endpoint → **Signing Secret** (`whsec_...`).


### Clerk webhook
1. Clerk dashboard → **Webhooks** → **Add Endpoint**
2. URL: `<DOMAIN — not decided yet>/api/webhooks/clerk`
3. Events: `user.created`, `user.updated`, `user.deleted`
4. Copy the **Signing Secret** → add to Vercel as `CLERK_WEBHOOK_SECRET` (Production scope)


---

## Common mistakes

**Using the unpooled URL as `DATABASE_URL` at runtime.**
Serverless functions open a new connection on every invocation. The unpooled URL bypasses Neon's connection pooler and will exhaust Postgres's connection limit quickly under any real load. Always use the pooled URL at runtime; only use unpooled for `db:migrate`.

**Pointing Vercel Production `DATABASE_URL` at the Dev branch.**
Production users' data would end up on the Dev branch, which can be reset or overwritten. Production must always point at the `main` branch.

**Mixing Clerk test and live credentials.**
A `sk_live_...` key with test price IDs (`price_test_...`) causes "No such price" errors. Keep test keys with test price IDs and live keys with live price IDs.

**Re-enabling Neon preview branching in Vercel.**
The free tier allows 10 branches. With preview branching enabled, each PR creates a branch — you'll hit the limit after ~8 PRs. Keep it disabled — preview deployments use the `Dev` branch instead.

**Running the seed script against production.**
The seed script truncates all tables before inserting test data. Never run it against the Neon `main` branch.
