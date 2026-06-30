import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Crown, Loader2, Swords, Sprout, Flame } from 'lucide-react'
import clsx from 'clsx'
import { getMatch } from '../api/mcsr'
import type { Match, UserLite } from '../api/types'
import { extractSplits, SPLITS } from '../lib/splits'
import { rankFromElo } from '../lib/ranks'
import { useNav } from '../store/useNav'
import { PlayerAvatar } from './PlayerAvatar'
import { CountryFlag } from './CountryFlag'
import { RankIcon } from './RankIcon'
import { SplitTime } from './SplitTime'
import { formatNumber, timeAgo } from '../lib/format'

const TYPE_META: Record<number, { label: string; cls: string }> = {
  1: { label: 'Casual', cls: 'text-sky-300 border-sky-500/40 bg-sky-500/10' },
  2: { label: 'Ranked', cls: 'text-green-400 border-green-600/40 bg-green-600/10' },
  3: { label: 'Private', cls: 'text-[#b58bd6] border-[#b58bd6]/40 bg-[#b58bd6]/10' },
}

export function MatchDrawer({ id, focusUuid }: { id: number; focusUuid: string | null }) {
  const { closeMatch, openPlayer } = useNav()
  const q = useQuery({ queryKey: ['match', id], queryFn: () => getMatch(id) })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeMatch()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [closeMatch])

  const m = q.data
  const players = m?.players ?? []
  // order players so the focused one (the PB owner) is on the left
  const ordered = focusUuid ? [...players].sort((a) => (a.uuid === focusUuid ? -1 : 0)) : players
  const type = m ? TYPE_META[m.type] ?? { label: 'Match', cls: 'text-zinc-300 border-zinc-700 bg-zinc-800' } : null

  const timeOf = (uuid: string) => m?.completions?.find((c) => c.uuid === uuid)?.time ?? (m?.result?.uuid === uuid ? m?.result?.time : null) ?? null
  const changeOf = (uuid: string) => m?.changes?.find((c) => c.uuid === uuid)?.change ?? null
  const eloOf = (uuid: string) => m?.changes?.find((c) => c.uuid === uuid)?.eloRate ?? players.find((p) => p.uuid === uuid)?.eloRate ?? null
  const splitsOf = (uuid: string) => (m ? extractSplits(m, uuid) : {})

  const goPlayer = (p: UserLite) => {
    closeMatch()
    openPlayer(p.uuid, p.nickname)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      <div className="absolute inset-0 animate-fade-in bg-black/75" onClick={closeMatch} />
      <div className="relative z-10 ml-auto flex h-full w-full max-w-md animate-sheet-up flex-col bg-ink">
        <div className="safe-top sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-800 bg-[#161618] px-4 py-3">
          <button onClick={closeMatch} aria-label="Back" className="slot flex h-10 w-10 items-center justify-center text-zinc-300 active:translate-y-px">
            <ArrowLeft size={17} />
          </button>
          <span className="font-mc text-[14px] font-black text-zinc-100">Match Summary</span>
          <span className="ml-auto font-mc text-[10px] text-zinc-600">#{id}</span>
        </div>

        <div className="safe-bottom flex-1 overflow-y-auto px-4 pb-10 pt-4">
          {q.isLoading ? (
            <div className="panel flex items-center gap-2 px-3 py-5 font-mc text-xs text-zinc-500">
              <Loader2 size={14} className="animate-spin text-green-500" /> loading match…
            </div>
          ) : q.error || !m ? (
            <div className="panel px-3 py-5 font-mc text-xs text-zinc-500">Couldn’t load this match.</div>
          ) : (
            <>
              {/* Meta */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {type && <span className={clsx('rounded border px-2 py-0.5 font-mc text-[11px] font-bold', type.cls)}>{type.label}</span>}
                {m.season != null && <span className="chip">S{m.season}</span>}
                {m.bastionType && <span className="chip normal-case">{m.bastionType.toLowerCase()} bastion</span>}
                {m.forfeited && <span className="rounded border border-red-600/40 bg-red-600/10 px-2 py-0.5 font-mc text-[11px] text-red-400">forfeit</span>}
                {m.decayed && <span className="chip">decay</span>}
                <span className="ml-auto font-mc text-[11px] text-zinc-600">{timeAgo(m.date)}</span>
              </div>

              {/* Head to head */}
              {ordered.length >= 2 ? (
                <div className="panel grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 p-3">
                  <PlayerSide p={ordered[0]} align="left" winner={m.result?.uuid === ordered[0].uuid} time={timeOf(ordered[0].uuid)} change={changeOf(ordered[0].uuid)} elo={eloOf(ordered[0].uuid)} onClick={() => goPlayer(ordered[0])} />
                  <div className="flex flex-col items-center justify-center">
                    <Swords size={16} className="text-zinc-600" />
                    <span className="mt-1 font-mc text-[10px] font-black text-zinc-600">VS</span>
                  </div>
                  <PlayerSide p={ordered[1]} align="right" winner={m.result?.uuid === ordered[1].uuid} time={timeOf(ordered[1].uuid)} change={changeOf(ordered[1].uuid)} elo={eloOf(ordered[1].uuid)} onClick={() => goPlayer(ordered[1])} />
                </div>
              ) : ordered.length === 1 ? (
                <div className="panel p-3">
                  <PlayerSide p={ordered[0]} align="left" winner={m.result?.uuid === ordered[0].uuid} time={timeOf(ordered[0].uuid)} change={changeOf(ordered[0].uuid)} elo={eloOf(ordered[0].uuid)} onClick={() => goPlayer(ordered[0])} />
                </div>
              ) : null}

              {/* Split race */}
              {ordered.length >= 1 && (
                <SplitRace players={ordered} splitsOf={splitsOf} />
              )}

              {/* Seed */}
              {m.seed && <SeedCard match={m} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayerSide({
  p,
  align,
  winner,
  time,
  change,
  elo,
  onClick,
}: {
  p: UserLite
  align: 'left' | 'right'
  winner: boolean
  time: number | null
  change: number | null
  elo: number | null
  onClick: () => void
}) {
  const rank = rankFromElo(elo)
  return (
    <button
      onClick={onClick}
      className={clsx('flex min-w-0 flex-col gap-1.5 rounded border p-2 text-left transition active:translate-y-px', winner ? 'border-green-600/50 bg-green-600/10' : 'border-zinc-800 bg-zinc-900/60', align === 'right' && 'items-end text-right')}
    >
      <div className={clsx('flex items-center gap-2', align === 'right' && 'flex-row-reverse')}>
        <div className="slot p-0.5">
          <PlayerAvatar uuid={p.uuid} name={p.nickname} size={32} />
        </div>
        <div className={clsx('min-w-0', align === 'right' && 'text-right')}>
          <div className="flex items-center gap-1">
            {winner && <Crown size={11} className="text-yellow-400" />}
            <span className="truncate font-mc text-[13px] font-bold text-zinc-100">{p.nickname}</span>
          </div>
          <div className={clsx('mt-0.5 flex items-center gap-1.5', align === 'right' && 'flex-row-reverse')}>
            <CountryFlag code={p.country} />
          </div>
        </div>
      </div>
      <div className={clsx('flex items-center gap-1.5', align === 'right' && 'flex-row-reverse')}>
        {rank && <RankIcon tierKey={rank.tier.key} size={14} />}
        <span className="font-mc text-[11px] tabular-nums text-zinc-400">{formatNumber(elo)}</span>
        {change != null && (
          <span className={clsx('font-mc text-[11px] font-bold tabular-nums', change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-zinc-600')}>
            {change > 0 ? '+' : ''}
            {change}
          </span>
        )}
      </div>
      <div className={clsx('mt-0.5', align === 'right' && 'text-right')}>
        {time != null && time > 0 ? (
          <SplitTime ms={time} className={clsx('text-[15px] font-bold', winner ? 'text-green-400' : 'text-zinc-200')} />
        ) : (
          <span className="font-mc text-[12px] text-zinc-600">DNF</span>
        )}
      </div>
    </button>
  )
}

function SplitRace({ players, splitsOf }: { players: UserLite[]; splitsOf: (uuid: string) => Record<string, number> }) {
  const twoUp = players.length >= 2
  const a = players[0]
  const b = twoUp ? players[1] : null
  const sa = splitsOf(a.uuid)
  const sb = b ? splitsOf(b.uuid) : {}
  const rows = SPLITS.filter((s) => sa[s.key] != null || (b && sb[s.key] != null))
  if (rows.length === 0) return null

  return (
    <section className="mt-5">
      <div className="mb-2 font-mc text-[11px] font-bold uppercase tracking-wider text-zinc-400">Split Race</div>
      <div className="panel divide-y divide-zinc-800/70 overflow-hidden">
        {rows.map((s) => {
          const ta = sa[s.key]
          const tb = b ? sb[s.key] : undefined
          const aFaster = ta != null && (tb == null || ta < tb)
          const bFaster = tb != null && (ta == null || tb < ta)
          return (
            <div key={s.key} className={clsx('grid items-center gap-2 px-3 py-2', twoUp ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-[1fr_auto]')}>
              <div className={clsx('text-right', aFaster && 'rounded bg-green-600/10')}>
                {ta != null ? <SplitTime ms={ta} className={clsx('text-[13px] font-bold', aFaster ? 'text-green-400' : 'text-zinc-400')} /> : <span className="font-mc text-zinc-700">—</span>}
              </div>
              <div className="px-1 text-center font-mc text-[9px] uppercase tracking-wide text-zinc-600">{s.short}</div>
              {twoUp && (
                <div className={clsx(bFaster && 'rounded bg-green-600/10')}>
                  {tb != null ? <SplitTime ms={tb} className={clsx('text-[13px] font-bold', bFaster ? 'text-green-400' : 'text-zinc-400')} /> : <span className="font-mc text-zinc-700">—</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SeedCard({ match }: { match: Match }) {
  const seed = match.seed
  if (!seed) return null
  const bits: { label: string; value: string; icon?: React.ReactNode }[] = []
  if (seed.overworld) bits.push({ label: 'Overworld', value: seed.overworld.toLowerCase().replace(/_/g, ' '), icon: <Sprout size={11} className="text-green-500" /> })
  if (seed.nether) bits.push({ label: 'Nether', value: seed.nether.toLowerCase().replace(/_/g, ' '), icon: <Flame size={11} className="text-orange-400" /> })
  if (match.bastionType) bits.push({ label: 'Bastion', value: match.bastionType.toLowerCase().replace(/_/g, ' ') })
  if (seed.endTowers?.length) bits.push({ label: 'End Towers', value: seed.endTowers.join(', ') })
  return (
    <section className="mt-5">
      <div className="mb-2 font-mc text-[11px] font-bold uppercase tracking-wider text-zinc-400">Seed</div>
      <div className="grid grid-cols-2 gap-1.5">
        {bits.map((bit) => (
          <div key={bit.label} className="panel p-2.5">
            <div className="flex items-center gap-1 font-mc text-[9px] uppercase tracking-wider text-zinc-600">
              {bit.icon}
              {bit.label}
            </div>
            <div className="mt-0.5 truncate font-mc text-[12px] font-bold capitalize text-zinc-200">{bit.value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
