// MCSR Ranked elo tiers. Elo bands per the official wiki; the EXACT colors are
// lifted from the site's own JS tier table (chunk CeQu3_2n.js) so badges match
// the real app pixel-for-pixel.
//   Coal 0–599 · Iron 600–899 · Gold 900–1199 · Emerald 1200–1499 ·
//   Diamond 1500–1999 · Netherite 2000+. Three divisions per tier except
//   Netherite, the single capstone tier.

export interface Tier {
  key: string
  name: string
  min: number
  max: number // inclusive; Infinity for Netherite
  divisions: number
  color: string // primary
  color2: string // lighter/secondary gradient stop
}

export const TIERS: Tier[] = [
  { key: 'coal', name: 'Coal', min: 0, max: 599, divisions: 3, color: '#AAAAAA', color2: '#CFCFCF' },
  { key: 'iron', name: 'Iron', min: 600, max: 899, divisions: 3, color: '#FFFFFF', color2: '#D9D9D9' },
  { key: 'gold', name: 'Gold', min: 900, max: 1199, divisions: 3, color: '#EAB308', color2: '#FDE047' },
  { key: 'emerald', name: 'Emerald', min: 1200, max: 1499, divisions: 3, color: '#21A83B', color2: '#59D755' },
  { key: 'diamond', name: 'Diamond', min: 1500, max: 1999, divisions: 3, color: '#2CE0D8', color2: '#A2FBE9' },
  { key: 'netherite', name: 'Netherite', min: 2000, max: Infinity, divisions: 1, color: '#C455FF', color2: '#9D00B3' },
]

const ROMAN = ['I', 'II', 'III', 'IV']

/** translucent background tint from a tier hex */
export function softOf(hex: string, alpha = 0.14): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export interface RankInfo {
  tier: Tier
  division: number | null // 1..3, 3 = top of tier; null for Netherite
  label: string // "Diamond II" / "Netherite"
  order: number // monotonic, higher = better (for sorting)
  color: string
  color2: string
  soft: string
}

export function rankFromElo(elo: number | null | undefined): RankInfo | null {
  if (elo == null || !Number.isFinite(elo)) return null
  const tier = TIERS.find((t) => elo >= t.min && elo <= t.max) ?? TIERS[TIERS.length - 1]
  const tierIndex = TIERS.indexOf(tier)

  if (tier.divisions <= 1 || !Number.isFinite(tier.max)) {
    return { tier, division: null, label: tier.name, order: tierIndex * 10 + 9, color: tier.color, color2: tier.color2, soft: softOf(tier.color) }
  }

  const span = (tier.max + 1 - tier.min) / tier.divisions
  let div = Math.floor((elo - tier.min) / span) + 1
  if (div > tier.divisions) div = tier.divisions
  return { tier, division: div, label: `${tier.name} ${ROMAN[div - 1]}`, order: tierIndex * 10 + div, color: tier.color, color2: tier.color2, soft: softOf(tier.color) }
}

export function tierByKey(key: string): Tier | undefined {
  return TIERS.find((t) => t.key === key)
}
