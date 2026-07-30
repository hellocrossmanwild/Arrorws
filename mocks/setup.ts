/** Conditional MSW initialiser — development, browser only. */
export async function startMockWorker(): Promise<void> {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") return
  const { worker } = await import("./browser")
  await worker.start({ onUnhandledRequest: "warn" })
}
