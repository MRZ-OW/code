import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { PlayerRow, ProfileFields } from '../hooks/usePlayerData'
import type { PlayerSplits } from '../lib/splits'
import { useFilters } from '../store/useFilters'
import { useNav } from '../store/useNav'
import { OPTIONAL_COLUMNS, COLUMN_BY_ID } from '../lib/columns'
import { rankFromElo } from '../lib/ranks'
import { PlayerAvatar } from './PlayerAvatar'
import { CountryFlag } from './CountryFlag'
import { RankIcon } from './RankIcon'
import { SplitTime } from './SplitTime'
import { formatNumber, formatDuration, formatPercent } from '../lib/format'

type Align = 'left' | 'right'
interface ColMeta {
  id: string
  label: string
  align: Align
  defaultDesc: boolean
  sticky?: boolean
}

const INK = '#18181b'
// Fixed width for the sticky rank column so the second sticky column ('player')
// can be pinned at a matching offset (no magic-number drift / overlap).
const RANK_W = 48

export function PlayerTable({
  rows,
  mode,
  profiles,
  splits,
  profileLoading,
}: {
  rows: PlayerRow[]
  mode: 'elo' | 'record'
  profiles: Map<string, ProfileFields>
  splits: Map<string, PlayerSplits>
  profileLoading: boolean
}) {
  const { enabledColumns, sort, setSort } = useFilters()
  const { openPlayer } = useNav()

  // Measure the actual rendered width of the sticky rank column so the second
  // sticky column ('player') is pinned at exactly the right offset regardless of
  // content width (avoids overlap/gap on horizontal scroll).
  const rankRef = useRef<HTMLTableCellElement>(null)
  const [rankW, setRankW] = useState(RANK_W)
  useLayoutEffect(() => {
    const el = rankRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => setRankW(el.getBoundingClientRect().width || RANK_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const columns = useMemo<ColMeta[]>(() => {
    const cols: ColMeta[] = [
      { id: 'rank', label: '#', align: 'right', defaultDesc: false, sticky: true },
      { id: 'player', label: 'Player', align: 'left', defaultDesc: false, sticky: true },
      { id: 'tier', label: 'Rank', align: 'left', defaultDesc: true },
      { id: 'elo', label: 'Elo', align: 'right', defaultDesc: true },
      { id: 'country', label: 'Cc', align: 'left', defaultDesc: false },
    ]
    if (mode === 'record') cols.push({ id: 'recordTime', label: 'Record', align: 'right', defaultDesc: false })
    for (const c of OPTIONAL_COLUMNS) {
      if (!enabledColumns.has(c.id)) continue
      const desc = !(c.source === 'splits' || c.id === 'bestTime' || c.id === 'playtime')
      cols.push({ id: c.id, label: c.short, align: 'right', defaultDesc: desc })
    }
    return cols
  }, [enabledColumns, mode])

  function handleSort(c: ColMeta) {
    if (sort.columnId === c.id) setSort({ columnId: c.id, desc: !sort.desc })
    else setSort({ columnId: c.id, desc: c.defaultDesc })
  }

  return (
    <div className="panel overflow-hidden bg-abyss">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#161618]">
              {columns.map((c) => {
                const active = sort.columnId === c.id
                const loadingCol = profileLoading && (COLUMN_BY_ID[c.id]?.source === 'profile')
                return (
                  <th
                    key={c.id}
                    ref={c.id === 'rank' ? rankRef : undefined}
                    className={clsx('border-b border-zinc-800 px-2.5 py-2', c.id === 'rank' && 'w-12 min-w-12', c.sticky && 'sticky z-20 bg-[#161618]')}
                    style={c.sticky ? { left: c.id === 'rank' ? 0 : rankW } : undefined}
                  >
                    <button
                      onClick={() => handleSort(c)}
                      className={clsx('hchip inline-flex items-center gap-1', active && 'hchip-active', c.align === 'right' && 'flex-row-reverse')}
                    >
                      {c.label}
                      {active && (sort.desc ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
                      {loadingCol && <Loader2 size={10} className="animate-spin text-green-500" />}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="font-mc">
            {rows.map((r, i) => (
              <tr
                // Fastest-Times lists the same player on multiple rows (several
                // record times), so uuid is NOT unique there — keying by uuid
                // would collide and break reorder-on-sort. recordId is unique.
                key={r.recordId != null ? `rec-${r.recordId}` : r.uuid}
                onClick={() => openPlayer(r.uuid, r.nickname)}
                className="group cursor-pointer border-b border-zinc-800/60 transition-colors [background:var(--rowbg)] hover:[--rowbg:#202024]"
                style={{ ['--rowbg' as string]: INK } as React.CSSProperties}
              >
                {columns.map((c) => (
                  <td
                    key={c.id}
                    className={clsx('whitespace-nowrap px-2.5 py-2 align-middle', c.id === 'rank' && 'w-12 min-w-12', c.align === 'right' && 'text-right', c.sticky && 'sticky z-10')}
                    style={c.sticky ? { left: c.id === 'rank' ? 0 : rankW, background: 'var(--rowbg)' } : undefined}
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
      // Show the row's position in the CURRENT sort (1..N) so every re-sort
      // visibly renumbers; keep the player's global rank as a small secondary
      // when it differs (e.g. when sorting by a non-rank column).
      const pos = index + 1
      const globalRank = mode === 'record' ? row.recordRank : row.eloRank
      const medal = pos === 1 ? 'text-yellow-400' : pos === 2 ? 'text-zinc-300' : pos === 3 ? 'text-orange-400' : 'text-zinc-600'
      return (
        <span className="inline-flex flex-col items-end leading-none">
          <span className={clsx('text-[13px] font-black tabular-nums', medal)}>{pos}</span>
          {globalRank != null && globalRank !== pos && <span className="mt-0.5 text-[9px] tabular-nums text-zinc-600">#{globalRank}</span>}
        </span>
      )
    }
    case 'player':
      return (
        <div className="flex items-center gap-2.5">
          <PlayerAvatar uuid={row.uuid} name={row.nickname} size={26} />
          <span className="max-w-[150px] truncate text-[13px] font-bold text-zinc-200 group-hover:text-white">{row.nickname}</span>
        </div>
      )
    case 'tier': {
      const rk = rankFromElo(row.elo)
      return rk ? (
        <span className="inline-flex items-center gap-1.5">
          <RankIcon tierKey={rk.tier.key} size={16} />
          <span className="text-[12px] font-bold" style={{ color: rk.color }}>
            {rk.label}
          </span>
        </span>
      ) : (
        <span className="text-zinc-600">—</span>
      )
    }
    case 'elo':
      return <span className="text-[13px] font-bold tabular-nums text-zinc-100">{formatNumber(row.elo)}</span>
    case 'country':
      return <CountryFlag code={row.country} />
    case 'recordTime':
      return row.recordTime != null && row.recordId != null ? (
        <MatchLink id={row.recordId} uuid={row.uuid}>
          <SplitTime ms={row.recordTime} className="text-[13px] font-bold text-[#2CE0D8] decoration-dotted decoration-[#2CE0D8]/40 underline-offset-2 group-hover:underline" />
        </MatchLink>
      ) : (
        <SplitTime ms={row.recordTime} className="text-[13px] font-bold text-[#2CE0D8]" />
      )
    case 'phasePoint':
      return <span className="text-[13px] tabular-nums text-zinc-300">{formatNumber(row.phasePoint)}</span>
    default:
      break
  }

  if (col.startsWith('split:')) {
    const s = splits.get(row.uuid)
    if (s == null) return <span className="text-zinc-700">·</span>
    const key = col.slice('split:'.length)
    const v = s.best?.[key]
    if (v == null) return <span className="text-zinc-600">—</span>
    const matchId = s.source?.[key]
    // tapping a split PB opens the match where that PB was achieved
    return matchId != null ? (
      <MatchLink id={matchId} uuid={row.uuid}>
        <SplitTime ms={v} className="text-[13px] font-bold text-[#2CE0D8] decoration-dotted decoration-[#2CE0D8]/40 underline-offset-2 group-hover:underline" />
      </MatchLink>
    ) : (
      <SplitTime ms={v} className="text-[13px] font-bold text-[#2CE0D8]" />
    )
  }

  const prof = profiles.get(row.uuid)
  if (!prof) return <span className="skeleton inline-block h-3 w-9 rounded-sm align-middle" />
  switch (col) {
    case 'bestTime':
      return <SplitTime ms={prof.bestTime} className="text-[13px] font-bold text-green-400" />
    case 'winRate':
      return <span className="text-[13px] tabular-nums text-zinc-200">{formatPercent(prof.winRate)}</span>
    case 'highestElo':
      return <span className="text-[13px] tabular-nums text-zinc-200">{formatNumber(prof.highestElo)}</span>
    case 'matches':
      return <span className="text-[13px] tabular-nums text-zinc-200">{formatNumber(prof.matches)}</span>
    case 'wins':
      return <span className="text-[13px] tabular-nums text-zinc-200">{formatNumber(prof.wins)}</span>
    case 'winStreak':
      return <span className="text-[13px] tabular-nums text-zinc-200">{formatNumber(prof.winStreak)}</span>
    case 'playtime':
      return <span className="text-[13px] tabular-nums text-zinc-200">{formatDuration(prof.playtime)}</span>
    default:
      return <span className="text-zinc-600">—</span>
  }
}

/** A tappable time that opens the match it came from (stops the row's player-open). */
function MatchLink({ id, uuid, children }: { id: number; uuid: string; children: React.ReactNode }) {
  const { openMatch } = useNav()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        openMatch(id, uuid)
      }}
      className="cursor-pointer"
    >
      {children}
    </button>
  )
}
