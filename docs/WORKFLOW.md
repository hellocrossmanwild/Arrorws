# WORKFLOW.md

> How we turn a spec into shipped code in this project. Read this once, then follow it for every spec.

---

## The principle

Arrows is built **spec-driven** and **test-driven**.

**Spec-driven** means the work is defined in `/docs/specs/` before any code is written. The spec is the source of truth for what gets built, the acceptance criteria, and the data shapes. Specs are iterated in plain English — much cheaper than iterating in code. If something in a spec is wrong or unclear, the spec gets updated *before* implementation begins.

**Test-driven** means within each spec, every acceptance criterion becomes a failing test before any implementation code is written. Red, green, refactor. The tests prove the implementation matches the spec.

These two practices work together: the spec defines *what*, the tests prove *that it works*, the implementation makes *the tests pass*. If you skip either, the system breaks down.

---

## The loop

For every spec in `/docs/specs/`, follow this loop. No shortcuts.

### 1. Pick a spec

Pick the lowest-numbered spec in `/docs/specs/` that has status `Draft` or `Ready for implementation` and whose dependencies are all `Implemented`. Specs are intentionally ordered — `0001` first, then `0002`, then `0003`, and so on. Don't jump ahead.

If a spec depends on something that isn't done yet, do that first.

### 2. Read everything you need

Before writing any code, read:

- **The full spec** — top to bottom, including the acceptance criteria, the components list, and the notes section
- **`docs/CLAUDE.md`** — the cardinal rule and the five conventions, every time. They're easy to drift from
- **`docs/PRD.md`** — the relevant sections (the spec will reference them)
- **Any ADRs the spec references** — under `docs/decisions/`
- **Any earlier specs the current one depends on** — to understand the API contracts and types they introduced

If anything in the spec contradicts CLAUDE.md or an ADR, **stop**. Flag the conflict, ask for clarification, and update the spec or the ADR before continuing. Don't try to reconcile the conflict in code.

### 3. Update the data layer first

If the spec changes the data shape, update these in order:

1. **`/lib/types/*.ts`** — TypeScript types are the contract. They must be updated first.
2. **`/mocks/data/seed.json`** — add any new test data needed to exercise the spec
3. **`/mocks/data/store.ts`** — if the spec needs new mutator functions on the in-memory store

Verify TypeScript still compiles after each change. `pnpm build` should pass.

### 4. Write the API client function signatures

In `/lib/api/*.ts`, add the function signatures the spec calls for. These should be fully typed but throw `"not implemented"` for now:

```ts
export async function getEntity(id: string): Promise<EntityResponse> {
  throw new Error("Not implemented")
}
```

This serves two purposes: it locks in the API contract, and it lets you write tests against the function before the implementation exists.

### 5. Stub the MSW handlers

In `/mocks/handlers/*.ts`, add stubbed handlers that return empty objects, empty arrays, or 501 Not Implemented:

```ts
http.get("/api/entities/:id", () => {
  return new HttpResponse(null, { status: 501 })
}),
```

Add the new handlers to `/mocks/handlers/index.ts`.

### 6. Write failing tests for every acceptance criterion

This is the most important step in the workflow. Every checkbox in the spec's acceptance criteria becomes one or more tests.

**Translate acceptance criteria literally into test names.** If the spec says:

> "Visiting `/entities/123` fetches the entity from the API and renders the page"

write:

```ts
test("visiting /entities/123 fetches and renders the entity page", async () => {
  // ...
})
```

Cover every layer the spec specifies:

- **Unit tests** for components and utility functions (Vitest + Testing Library)
- **Integration tests** for API client functions (Vitest, with MSW intercepting)
- **End-to-end tests** for user flows (Playwright)

If the spec lists 12 acceptance criteria, expect 12 or more test cases.

Run the test suite. **Every new test should fail.** If a test passes before you've written any implementation, the test is wrong — fix the test, not the implementation.

### 7. Implement, one criterion at a time

Now write the implementation code. Work through the failing tests one at a time. For each test:

1. Look at the failing test
2. Write the smallest piece of implementation that makes it pass
3. Run the test — confirm it passes
4. Run the full test suite — confirm nothing else broke
5. Move to the next failing test

This is the red-green-refactor loop. Don't write more than one acceptance criterion's worth of code before running the tests.

When implementing components, follow the patterns in CLAUDE.md:

- Components import from `/lib/api`, never from `/mocks`
- Components use `useUser()` from `/lib/auth`, never from Clerk
- Types come from `/lib/types`
- Tailwind utility classes only, no other styling
- Server components by default; `"use client"` only where it's needed

### 8. Run the full test suite

Once every acceptance criterion has a passing test, run the full suite:

```bash
pnpm test          # Vitest unit + integration
pnpm test:e2e      # Playwright end-to-end
pnpm build         # TypeScript + Next.js production build
pnpm lint          # ESLint
```

All four must pass. No exceptions.

If anything is broken, fix it before moving on. Don't skip a test "because it's flaky" — flaky tests get fixed, not disabled.

### 9. Update the spec status

Open the spec file. Change the status from `Draft` to `Implemented`:

```md
**Status:** Implemented
**Phase:** 1 (mock API)
**Implemented:** 30 July 2026
```

If you discovered anything during implementation that the spec didn't anticipate, update the spec to reflect what was actually built. The spec should always match the code. **Specs are living documents** — they get refined as you build, not frozen at the start.

### 10. Commit and open a PR

Commit messages should reference the spec number:

```
feat(0003): <spec title>

Implements spec 0003. Includes:
- <component 1>
- <component 2>
- Full test coverage (unit, integration, e2e)
```

### 11. Move to the next spec

Once the PR is merged, start the next spec from a fresh session. **Do not work on multiple specs in the same session.** Context bleed between specs is the most common source of bugs and inconsistencies.

---

## What "done" means

A spec is done when:

- [ ] Every acceptance criterion has a passing test
- [ ] The full test suite is green (`pnpm test && pnpm test:e2e`)
- [ ] The build succeeds (`pnpm build`)
- [ ] Lint passes (`pnpm lint`)
- [ ] The spec status is updated to `Implemented`
- [ ] The PR is merged to `main`

Anything less is not done. "Mostly done" doesn't exist.

---

## Anti-patterns to avoid

### "I'll write the tests after"

You won't. Or you'll write bad tests that just confirm what the code does rather than what the spec says it should do. Always write tests first.

### "I'll implement two specs at once because they're related"

Don't. The specs are deliberately scoped to be implemented one at a time. Working on two at once leads to half-finished work in both.

### "I'll skip this acceptance criterion because it doesn't matter"

If an acceptance criterion is in the spec, it matters. If you genuinely think it doesn't, the spec is wrong — update it before skipping.

### "I'll add a global state library because this component needs it"

No. CLAUDE.md says no global state libraries unless we hit a real need. If you think you've hit a real need, write an ADR explaining why and get it approved before adding the library.

### "I'll import from /mocks just this once for testing"

Never. The cardinal rule from ADR 0001 is non-negotiable. If you can't get the test to work without importing from `/mocks`, the test is wrong or the API client needs another method. Fix it the right way.

### "The test is flaky, I'll just retry it"

Flaky tests get fixed, not retried. A flaky test is a real bug — usually a race condition, a timing issue, or a missing await.

### "I'll change the component to make Phase 2 easier later"

If you find yourself reasoning about Phase 2 while building Phase 1 components, **stop**. The components do not change between phases. If Phase 2 is going to be hard, that's a sign the API contract or the auth abstraction needs adjusting — not the components.

---

## Working with Claude Code

When starting a Claude Code session on this project, give it a short prompt like:

> This is the Arrows project. Read `docs/CLAUDE.md` first — it's the source of truth for how this codebase works. Then read `docs/PRD.md` for product context, the ADRs in `docs/decisions/`, and `docs/WORKFLOW.md` for how to work with specs.
>
> Implement spec `00NN-name.md` from `docs/specs/`. Follow the workflow document — write the failing tests first, then make them pass. When you're done, all tests should be green and the spec's acceptance criteria should all be checked.

Don't give it more than one spec at a time. Don't tell it to "build the whole app." Don't tell it to skip tests.

---

## Summary

The workflow in one paragraph:

> Pick the next spec. Read it. Update types and seed data. Write API stubs. Write failing tests for every acceptance criterion. Implement until they all pass. Run the full suite. Mark the spec implemented. Commit. PR. Merge. Next spec.

Boring, repeatable, predictable. That's the point.
