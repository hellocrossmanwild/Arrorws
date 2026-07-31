/**
 * Conditional MSW initialiser. Since Phase 2 the mock API is opt-in:
 * set NEXT_PUBLIC_ENABLE_MOCKS=1 to run the app against the in-memory
 * store (hermetic e2e tests, zero-setup dev, demos). Without the flag the
 * app talks to the real /app/api routes. See ADR 0005.
 */
export function mocksEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MOCKS === "1"
}

export async function startMockWorker(): Promise<void> {
  if (typeof window === "undefined" || !mocksEnabled()) return
  const { worker } = await import("./browser")
  await worker.start({ onUnhandledRequest: "warn" })
}
