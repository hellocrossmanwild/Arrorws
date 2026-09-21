"use client"

/**
 * A screen whose data did not load.
 *
 * Every fetching screen used to `.catch(() => {})` and leave its skeleton in
 * place, so a 500 was indistinguishable from a slow network — the page just
 * sat there. On a shared tablet at the oche that reads as a broken app with
 * no way forward, which is exactly how the missing `training_sessions`
 * migration surfaced.
 */
export function LoadError({
  what,
  onRetry,
}: {
  /** What failed to load, lower case: "the record", "your programme". */
  what: string
  onRetry: () => void
}) {
  return (
    <div className="bg-bed px-4 py-5" data-testid="load-error">
      <p className="text-sm text-chalk">Could not load {what}.</p>
      <p className="mt-1 font-mono text-[11px] text-tung">
        The server did not answer. It may be a connection drop, or the app may
        need attention.
      </p>
      <button
        className="mt-3 min-h-[44px] px-4 font-mono text-xs uppercase tracking-widest text-wire ring-1 ring-wire/40 hover:brightness-125"
        onClick={onRetry}
        data-testid="load-error-retry"
      >
        Try again
      </button>
    </div>
  )
}
