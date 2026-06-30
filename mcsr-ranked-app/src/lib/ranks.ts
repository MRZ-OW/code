// MCSR Ranked elo tiers. Thresholds per the official wiki:
//   Coal 0–599 · Iron 600–899 · Gold 900–1199 · Emerald 1200–1499 ·
//   Diamond 1500–1999 · Netherite 2000+. Each tier (except Netherite) has
//   three divisions, split evenly across its range.

export interface Tier {
  key: string
  name: string
  min: number
  max: number // inclusive; Infinity for Netherite
  divisions: number
  color: string // accent
  soft: string // translucent background
  emoji: string
}

export const TIERS: Tier[] = [
  { key: 'coal', name: 'Coal', min: 0, max: 599, divisions: 3, color: '#8b95a1', soft: 'rgba(139,149,161,0.14)', emoji: '⬛' },
  { key: 'iron', name: 'Iron', min: 600, max: 899, divisions: 3, color: '#d9dde2', soft: 'rgba(217,221,226,0.12)', emoji: '⬜' },
  { key: 'gold', name: 'Gold', min: 900, max: 1199, divisions: 3, color: '#f5c542', soft: 'rgba(245,197,66,0.14)', emoji: '🟨' },
  { key: 'emerald', name: 'Emerald', min: 1200, max: 1499, divisions: 3, color: '#2ee06b', soft: 'rgba(46,224,107,0.14)', emoji: '🟩' },
  { key: 'diamond', name: 'Diamond', min: 1500, max: 1999, divisions: 3, color: '#54d8e6', soft: 'rgba(84,216,230,0.14)', emoji: '🔷' },
  { key: 'netherite', name: 'Netherite', min: 2000, max: Infinity, divisions: 1, color: '#b58bd6', soft: 'rgba(181,139,214,0.16)', emoji: '🟪' },
]

const ROMAN = ['I', 'II', 'III', 'IV']

export interface RankInfo {
  tier: Tier
  division: number | null // 1..3, where 3 is the top of the tier; null for Netherite
  label: string // e.g. "Diamond II" or "Netherite"
  /** Monotonic numeric value for sorting (higher = better). */
  order: number
  color: string
  soft: string
}

export function rankFromElo(elo: number | null | undefined): RankInfo | null {
  if (elo == null || !Number.isFinite(elo)) return null
  const tier = TIERS.find((t) => elo >= t.min && elo <= t.max) ?? TIERS[TIERS.length - 1]
  const tierIndex = TIERS.indexOf(tier)

  if (tier.divisions <= 1 || !Number.isFinite(tier.max)) {
    return {
      tier,
      division: null,
      label: tier.name,
      order: tierIndex * 10 + 9,
      color: tier.color,
      soft: tier.soft,
    }
  }

  const span = (tier.max + 1 - tier.min) / tier.divisions
  let div = Math.floor((elo - tier.min) / span) + 1
  if (div > tier.divisions) div = tier.divisions
  // Division III is the strongest part of a tier.
  return {
    tier,
    division: div,
    label: `${tier.name} ${ROMAN[div - 1]}`,
    order: tierIndex * 10 + div,
    color: tier.color,
    soft: tier.soft,
  }
}

/** The elo at which a player would enter a given tier (for filter thresholds). */
export function tierByKey(key: string): Tier | undefined {
  return TIERS.find((t) => t.key === key)
}
