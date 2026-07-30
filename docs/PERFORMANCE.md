# Performance defaults

> Read this document before any UI work. These defaults apply to every component unless a spec explicitly overrides them.

---

## What we optimise for

Three things, in order:

1. **Perceived latency** — the user feels an immediate response to every action. Content arrives without visual disruption.
2. **Layout stability** — nothing shifts, resizes, or appears/disappears after the initial paint. The skeleton and the loaded page occupy the same space.
3. **Continuity between states** — loading → loaded feels like the same page evolving, not a replacement. Navigation preserves persistent UI (header, search bar, breadcrumb).

A page can be slow on the wire and feel fast if it nails these three. A page can be fast on the wire and feel slow if it misses them.

---

## Defaults

These rules apply unless a spec says otherwise.

### 1. Server components by default

No `"use client"` without justification. If a component doesn't use hooks, browser APIs, or event handlers, it's a server component. Server components send HTML — no loading state needed for the primary content.

### 2. Server-side data fetching for primary content (Phase 2)

The main data for a page should be fetched in the server component, not in a `useEffect`. The HTML arrives complete.

**Phase 1 note:** In Phase 1 the MSW handlers intercept fetches in the browser, so pages fetch client-side. When Phase 2 arrives and real route handlers exist, page-primary data moves server-side. Components themselves don't change — only the fetch location.

### 3. Suspense boundaries for secondary sections

Wrap slower, non-critical sections in `<Suspense>` with a named skeleton fallback. The page shell and primary data arrive immediately; secondary sections stream in.

```tsx
// Good
<Suspense fallback={<CommentListSkeleton />}>
  <CommentsSection />
</Suspense>

// Bad
<div>{loading ? "Loading..." : <Comments />}</div>
```

### 4. Optimistic mutations

Every user-initiated mutation updates the UI immediately, before the server confirms. Reconcile with the server response. Roll back on failure with a toast.

Pattern:
- Dispatch a temporary optimistic update with a `temp_${Date.now()}` ID
- Replace with the real record on success
- Remove and toast on failure

Apply this to all user actions: voting, commenting, editing, toggling status.

### 5. Skeleton timing

- **Server-rendered content:** No skeleton needed — the user only sees the loaded state.
- **Cached data:** Render immediately, no skeleton.
- **Uncached async content:** Show a skeleton. If the load completes in under ~200ms, the skeleton should not flash — use Suspense (which handles this natively) rather than manual `isLoading` state with a setTimeout.

### 6. Link prefetching

Always use `next/link` for internal navigation. Next.js prefetches linked routes when they enter the viewport.

```tsx
// Good
import Link from "next/link"
<Link href={`/entities/${id}`}>{title}</Link>

// Bad
<a href={`/entities/${id}`}>{title}</a>
```

### 7. Skeleton geometry matching

Skeletons must occupy the same space as loaded content — same grid, same padding, same gap, same border-radius. When content arrives, nothing moves.

### 8. Image dimensions

Always set explicit `width` and `height` on `next/image` to prevent layout shift.

### 9. Font loading

Always use `next/font/google` (or `next/font/local`). Never load fonts via `<link>` tags or CSS `@import`.

### 10. Fetch cleanup in useEffect

Every `useEffect` that makes a fetch request must handle cleanup to prevent stale state updates.

Preferred pattern — `AbortController` with signal:

```tsx
useEffect(() => {
  const controller = new AbortController()
  fetch(url, { signal: controller.signal })
    .then((res) => res.json())
    .then(setData)
    .catch((err) => {
      if (err.name !== "AbortError") setError(err)
    })
  return () => controller.abort()
}, [url])
```

Alternative pattern — cancelled flag:

```tsx
useEffect(() => {
  let cancelled = false
  fetchData().then((data) => {
    if (!cancelled) setState(data)
  })
  return () => { cancelled = true }
}, [dep])
```

Both patterns are acceptable. The key rule: never update state from a callback after the effect has cleaned up.

### 11. Stale-while-revalidate caching (Phase 2)

Every GET route handler serving public data should include `Cache-Control` headers:

```tsx
return NextResponse.json(data, {
  headers: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  },
})
```

Adjust `s-maxage` and `stale-while-revalidate` based on how frequently the data changes.

### 12. No React Query (yet)

The codebase uses native `fetch()` via the API client + `useReducer` / `useState` for client-side state. Server-side caching uses Next.js built-in fetch cache and `revalidatePath` / `revalidateTag`.

If React Query is ever adopted, it requires a new ADR documenting why native patterns became insufficient.

---

## Anti-patterns

Do not write these. If you see them in a PR, flag them.

### 1. useEffect data fetches on server-renderable pages (Phase 2)

If the page can be a server component (no hooks, no browser APIs), fetch data on the server. Don't put the primary data fetch in a `useEffect` and show a skeleton while it loads.

**Exception:** Pages that legitimately need client-side state (complex filters, search with URL params, admin forms) are fine as client components.

### 2. Skeletons for cached data

If the user has already seen this data, render it immediately. Don't show a skeleton on back-navigation or tab switches for data that's in the cache.

### 3. Disabled submit buttons during loading

Never disable the submit button because of validation errors. Let the user submit and see all errors at once. During form submission, show a spinner inside the button but keep the button enabled for accessibility.

### 4. Conditional rendering of entire sections after fetch

Don't do `{data && <Section data={data} />}` where `<Section>` is a large block. Always render the container (with its padding, borders, minimum height). Fill the content when data arrives, or show a skeleton inside the container.

### 5. Raw `<a>` for internal navigation

Always `<Link>` from `next/link`. Raw `<a>` tags bypass client-side navigation, prefetching, and route caching.

### 6. Stale async callbacks

Don't update state from a promise callback without checking whether the component is still mounted or the request is still current. Use the cleanup patterns from Default 10.

---

## Definition-of-done checklist

Before opening a PR for any feature that touches UI:

- [ ] Primary data renders server-side where possible (or documented reason why not)
- [ ] Secondary data streams via Suspense with named skeleton fallback
- [ ] All user actions trigger immediate visual feedback (optimistic UI)
- [ ] No layout shift between empty / loading / loaded states (verify in DevTools → Performance → Layout Shifts)
- [ ] Navigation to and from the page preserves persistent UI (header, search bar)
- [ ] Cached navigation doesn't show a loading state
- [ ] Form submissions update the UI before the server response
- [ ] No console warnings about hydration mismatches
- [ ] All `useEffect` fetches have cleanup (cancelled flag or AbortController)
