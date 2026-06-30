// The API returns lowercase ISO 3166-1 alpha-2 country codes (e.g. "gb", "us")
// or null. We resolve display names at runtime via Intl.DisplayNames and build
// flag emoji from the code, so there is no large hardcoded table to maintain.

let regionNames: Intl.DisplayNames | null = null
try {
  regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
} catch {
  regionNames = null
}

const nameCache = new Map<string, string>()

/** Human-readable country name for a 2-letter code, falling back to the code. */
export function countryName(code: string | null | undefined): string {
  if (!code) return 'Unknown'
  const cc = code.toUpperCase()
  const hit = nameCache.get(cc)
  if (hit) return hit
  let name = cc
  try {
    name = regionNames?.of(cc) ?? cc
  } catch {
    name = cc
  }
  nameCache.set(cc, name)
  return name
}

/** Convert a 2-letter country code into its flag emoji (regional indicators). */
export function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '🏳️'
  const cc = code.toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return '🏳️'
  const A = 0x1f1e6
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65))
}

/** Build the list of countries present in a set of players, for filter chips. */
export function countriesFromCodes(codes: (string | null | undefined)[]): { code: string; name: string; flag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const c of codes) {
    const key = c ? c.toLowerCase() : '__unknown'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([code, count]) => ({
      code,
      name: code === '__unknown' ? 'Unknown' : countryName(code),
      flag: code === '__unknown' ? '🏳️' : flagEmoji(code),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
