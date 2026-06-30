import { SPLITS } from './splits'

export type ColumnSource = 'free' | 'profile' | 'splits'

export interface OptionalColumn {
  id: string
  label: string
  short: string
  group: 'Performance' | 'Activity' | 'Splits (computed)'
  source: ColumnSource
  description: string
  /** for splits columns, the split key */
  splitKey?: string
}

export const OPTIONAL_COLUMNS: OptionalColumn[] = [
  { id: 'phasePoint', label: 'Phase Points', short: 'Phase', group: 'Performance', source: 'free', description: 'Points earned this phase (from leaderboard).' },
  { id: 'bestTime', label: 'Best Ranked PB', short: 'PB', group: 'Performance', source: 'profile', description: "Player's fastest ranked completion this season." },
  { id: 'winRate', label: 'Win Rate', short: 'Win %', group: 'Performance', source: 'profile', description: 'Wins ÷ (wins + losses), ranked.' },
  { id: 'highestElo', label: 'Peak Elo', short: 'Peak', group: 'Performance', source: 'profile', description: 'Highest elo reached this season.' },
  { id: 'matches', label: 'Matches', short: 'Played', group: 'Activity', source: 'profile', description: 'Ranked matches played this season.' },
  { id: 'wins', label: 'Wins', short: 'Wins', group: 'Activity', source: 'profile', description: 'Ranked wins this season.' },
  { id: 'winStreak', label: 'Best Streak', short: 'Streak', group: 'Activity', source: 'profile', description: 'Highest ranked win streak this season.' },
  { id: 'playtime', label: 'Playtime', short: 'Playtime', group: 'Activity', source: 'profile', description: 'Total ranked playtime this season.' },
  ...SPLITS.map<OptionalColumn>((s) => ({
    id: `split:${s.key}`,
    label: `${s.label} PB`,
    short: s.short,
    group: 'Splits (computed)',
    source: 'splits',
    description: `Best ${s.description.toLowerCase()} split across the player's fastest tracked runs.`,
    splitKey: s.key,
  })),
]

export const COLUMN_BY_ID: Record<string, OptionalColumn> = Object.fromEntries(OPTIONAL_COLUMNS.map((c) => [c.id, c]))

export function enabledNeeds(enabled: Set<string>): { needsProfile: boolean; needsSplits: boolean; splitKeys: string[] } {
  let needsProfile = false
  const splitKeys: string[] = []
  for (const id of enabled) {
    const col = COLUMN_BY_ID[id]
    if (!col) continue
    if (col.source === 'profile') needsProfile = true
    if (col.source === 'splits' && col.splitKey) splitKeys.push(col.splitKey)
  }
  return { needsProfile, needsSplits: splitKeys.length > 0, splitKeys }
}
