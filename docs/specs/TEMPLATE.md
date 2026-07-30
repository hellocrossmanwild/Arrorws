# Spec NNNN — <Short feature title>

**Status:** Draft
**Phase:** 1 (mock API) | 2 (real backend) | 3 (polish)
**Depends on:** Spec NNNN, ADR NNNN, PRD Section N

---

## Goal

What are we building and why? One or two paragraphs. Link to the PRD section that motivates this work. Make clear what the user-facing outcome is.

---

## User stories

Who does what? Use the format:

> As a **<role>**, I can **<action>** so that **<outcome>**.

List 2–5 stories that together cover the feature.

---

## Acceptance criteria

Every criterion here becomes one or more tests. Keep them specific, testable, and observable from the outside.

- [ ] Criterion 1 (what a user or test would see)
- [ ] Criterion 2
- [ ] ...

Cover the happy path first, then key edge cases:
- Empty state
- Error state
- Loading state
- Auth-gated behaviour (anonymous / subscriber / admin)
- Mobile layout (if applicable)

---

## API contract

List the endpoints this spec adds or changes. For each:

### `GET /api/<resource>/<param>`

**Request:** URL params + query params, if any
**Response (200):**
```ts
{
  // shape
}
```
**Response (4xx / 5xx):** the shape of errors

Repeat for each endpoint.

---

## UI components

List the components being added or changed. For each, note:

- File path (e.g. `/components/<domain>/ComponentName.tsx`)
- Props interface (if non-trivial)
- Child components it composes
- Auth gating (who can see / interact)

---

## Data model changes

Any new fields or tables? List them here. They must also be added to:
- `/lib/types` (first)
- `/mocks/data/seed.json` (second)
- `/mocks/data/store.ts` if new mutators are needed

If this spec changes the data model, include the updated schema snippet inline.

---

## Out of scope

What this spec explicitly does NOT cover. This keeps the scope tight and prevents scope creep during implementation.

- Thing 1
- Thing 2
- ...

---

## Notes for Claude Code

Anything specific about how this spec should be implemented. Examples:
- Libraries to use / avoid
- Patterns from other specs to follow
- Gotchas from ADRs
- Performance considerations from PERFORMANCE.md
- Test data setup specific to this feature
