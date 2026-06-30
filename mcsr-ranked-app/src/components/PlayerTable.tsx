import { useMemo } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { PlayerRow } from '../hooks/usePlayerData'
import type { ProfileFields } from '../hooks/usePlayerData'
import type { PlayerSplits } from '../lib/splits'
import { useFilters } from '../store/useFilters'
import { OPTIONAL_COLUMNS, COLUMN_BY_ID } from '../lib/columns'
import { rankFromElo } from '../lib/ranks'
import { PlayerAvatar } from './PlayerAvatar'
import { CountryFlag } from './CountryFlag'
import { PixelOre } from './PixelOre'
import { formatTime, formatNumber, formatDuration, formatPercent } from '../lib/format'

type Align = 'left' | 'right' | 'center'

interface ColMeta {
  id: string
  label: string
  align: Align
  defaultDesc: boolean
  sticky?: boolean
}

export function PlayerTable({
  rows,
  mode,
  profiles,
  splits,
  profileLoading,
  onSelect,
}: {
  rows: PlayerRow[]
  mode: 'elo' | 'record'
  profiles: Map<string, ProfileFields>
  splits: Map<string, PlayerSplits>
  profileLoading: boolean
  onSelect: (row: PlayerRow) => void
}) {
  const { enabledColumns, sort, setSort } = useFilters()

  const columns = useMemo<ColMeta[]>(() => {
    const cols: ColMeta[] = [
      { id: 'rank', label: '#', align: 'right', defaultDesc: false, sticky: true },
      { id: 'player', label: 'Player', align: 'left', defaultDesc: false, sticky: true },
      { id: 'tier', label: 'Rank', align: 'left', defaultDesc: true },
      { id: 'elo', label: 'Elo', align: 'right', defaultDesc: true },
      { id: 'country', label: 'Country', align: 'left', defaultDesc: false },
    ]
    if (mode === 'record') cols.push({ id: 'recordTime', label: 'Record', align: 'right', defaultDesc: false })
    // enabled optional columns, in registry order
    for (const c of OPTIONAL_COLUMNS) {
      if (!enabledColumns.has(c.id)) continue
      const desc = !(c.source === 'splits' || c.id === 'bestTime' || c.id === 'playtime')
      cols.push({ id: c.id, label: c.short, align: c.source === 'splits' || c.id === 'bestTime' ? 'right' : 'right', defaultDesc: desc })
    }
    return cols
  }, [enabledColumns, mode])

  function handleSort(c: ColMeta) {
    if (sort.columnId === c.id) setSort({ columnId: c.id, desc: !sort.desc })
    else setSort({ columnId: c.id, desc: c.defaultDesc })
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-raised text-[11px] uppercase tracking-wide text-zinc-400">
              {columns.map((c) => {
                const active = sort.columnId === c.id
                return (
                  <th
                    key={c.id}
                    onClick={() => handleSort(c)}
                    className={clsx(
                      'cursor-pointer select-none whitespace-nowrap border-b border-line px-3 py-2.5 font-bold transition',
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                      c.sticky && 'sticky z-20 bg-surface-raised',
                      active ? 'text-grass' : 'hover:text-zinc-200',
                    )}
                    style={c.sticky ? { left: c.id === 'rank' ? 0 : 44 } : undefined}
                  >
                    <span className={clsx('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                      {c.label}
                      {active && (sort.desc ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
                      {(c.id === 'bestTime' || c.id === 'winRate' || c.id === 'matches' || COLUMN_BY_ID[c.id]?.source === 'splits') &&
                        profileLoadingDot(c.id, profileLoading)}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.uuid}
                onClick={() => onSelect(r)}
                className={clsx(
                  'group cursor-pointer border-b border-line/50 transition',
                  i % 2 ? 'bg-surface/40' : 'bg-transparent',
                  'hover:bg-grass/5',
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.id}
                    className={clsx(
                      'whitespace-nowrap px-3 py-2.5',
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                      c.sticky && 'sticky z-10 bg-inherit',
                    )}
                    style={c.sticky ? { left: c.id === 'rank' ? 0 : 44, backgroundColor: i % 2 ? '#161d18' : '#0d1310' } : undefined}
                  >
                    <Cell col={c.id} row={r} index={i} mode={mode} profiles={profiles} splits={splits} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function profileLoadingDot(_id: string, loading: boolean) {
  if (!loading) return null
  return <Loader2 size={11} className="animate-spin text-grass" />
}

function Cell({
  col,
  row,
  index,
  mode,
  profiles,
  splits,
}: {
  col: string
  row: PlayerRow
  index: number
  mode: 'elo' | 'record'
  profiles: Map<string, ProfileFields>
  splits: Map<string, PlayerSplits>
}) {
  switch (col) {
    case 'rank': {
      const n = mode === 'record' ? row.recordRank : row.eloRank
      const medal = n === 1 ? 'text-gold' : n === 2 ? 'text-iron' : n === 3 ? 'text-[#d6905b]' : 'text-zinc-500'
      return <span className={clsx('mono text-xs font-bold', medal)}>{n ?? index + 1}</span>
    }
    case 'player':
      return (
        <div className="flex items-center gap-2.5">
          <PlayerAvatar uuid={row.uuid} name={row.nickname} size={34} />
          <span className="max-w-[148px] truncate font-semibold text-zinc-100 group-hover:text-grass-100">{row.nickname}</span>
        </div>
      )
    case 'tier': {
      const rk = rankFromElo(row.elo)
      return rk ? (
        <span className="inline-flex items-center gap-1.5">
          <PixelOre tierKey={rk.tier.key} size={18} />
          <span className="text-xs font-semibold" style={{ color: rk.color }}>
            {rk.label}
          </span>
        </span>
      ) : (
        <span className="text-muted">—</span>
      )
    }
    case 'elo':
      return <span className="mono font-bold text-zinc-100">{formatNumber(row.elo)}</span>
    case 'country':
      return <CountryFlag code={row.country} />
    case 'recordTime':
      return <span className="mono font-bold text-diamond">{formatTime(row.recordTime)}</span>
    case 'phasePoint':
      return <span className="mono text-zinc-200">{formatNumber(row.phasePoint)}</span>
    default:
      break
  }

  if (col.startsWith('split:')) {
    const key = col.slice('split:'.length)
    const s = splits.get(row.uuid)
    const v = s?.best?.[key]
    if (s == null) return <span className="text-muted">·</span>
    return <SplitValue ms={v} />
  }

  const prof = profiles.get(row.uuid)
  if (!prof) return <span className="skeleton inline-block h-3 w-10 align-middle" />
  switch (col) {
    case 'bestTime':
      return <span className="mono font-bold text-grass-200">{formatTime(prof.bestTime)}</span>
    case 'winRate':
      return <span className="mono text-zinc-200">{formatPercent(prof.winRate)}</span>
    case 'highestElo':
      return <span className="mono text-zinc-200">{formatNumber(prof.highestElo)}</span>
    case 'matches':
      return <span className="mono text-zinc-200">{formatNumber(prof.matches)}</span>
    case 'wins':
      return <span className="mono text-zinc-200">{formatNumber(prof.wins)}</span>
    case 'winStreak':
      return <span className="mono text-zinc-200">{formatNumber(prof.winStreak)}</span>
    case 'playtime':
      return <span className="mono text-zinc-200">{formatDuration(prof.playtime)}</span>
    default:
      return <span className="text-muted">—</span>
  }
}

function SplitValue({ ms }: { ms: number | undefined }) {
  if (ms == null) return <span className="text-muted">—</span>
  return <span className="mono font-semibold text-diamond">{formatTime(ms)}</span>
}
