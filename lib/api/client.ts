/**
 * Base fetch wrapper. Every API client function goes through here; MSW
 * intercepts these fetches in Phase 1, real route handlers serve them in
 * Phase 2. The client does not change between phases (CLAUDE.md rule 5).
 */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiClient<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Unknown error" }))
    throw new ApiError(error.message || `Request failed: ${res.status}`, res.status)
  }
  return res.json()
}
