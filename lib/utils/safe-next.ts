/**
 * A redirect target out of the player picker (spec 0012).
 *
 * `next` arrives from the query string, so it is attacker-controlled: a
 * crafted /players?next=javascript:... handed to router.push would run in
 * the page. Only same-origin paths are followed; anything else falls back
 * to home.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value) return "/"
  // Must be a path, never a scheme ("javascript:", "https:", "data:").
  if (!value.startsWith("/")) return "/"
  // "//host" and its backslash variants are protocol-relative — off-origin.
  if (/^\/[/\\]/.test(value)) return "/"
  return value
}
