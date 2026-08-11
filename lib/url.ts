// Ensures a user-supplied URL is safe to render as a browser href.
// Without a protocol, browsers treat the value as a relative path, which
// silently breaks links like "drive.google.com/..." by prepending the
// current page's path.
export function normalizeExternalUrl(input: string | null | undefined): string {
  if (!input) return ''
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (/^[a-z][a-z0-9+\-.]*:/i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  return `https://${trimmed}`
}
