import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Crown, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { getUser, getUserMatches } from '../api/mcsr'
import type { Match } from '../api/types'
import { computePlayerSplits, SPLITS, type PlayerSplits } from '../lib/splits'
import { rankFromElo } from '../lib/ranks'
import { useFilters } from '../store/useFilters'
import { useNav } from '../store/useNav'
import { PlayerAvatar } from './PlayerAvatar'
import { RankBadge } from './RankBadge'
import { RankIcon } from './RankIcon'
import { CountryFlag } from './CountryFlag'
import { EloSparkline } from './EloSparkline'
import { SplitTime } from './SplitTime'
import { formatDuration, formatNumber, formatPercent, timeAgo, winRate, avatarUrl } from '../lib/format'

export function PlayerDrawer({ uuid, name, onClose }: { uuid: string; name: string; onClose: () => void }) {
  const { season } = useFilters()
  const { openMatch } = useNav()
  const profileQ = useQuery({ queryKey: ['profile', uuid, season], queryFn: () => getUser(uuid, season ?? undefined) })
  const matchesQ = useQuery({ queryKey: ['umatches', uuid], queryFn: () => getUserMatches(uuid, { type: 2, count: 12 }) })

  const [splits, setSplits] = useState<PlayerSplits | null>(null)
  const [splitsLoading, setSplitsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setSplitsLoading(true)
    computePlayerSplits(uuid, uuid)
      .then((s) => !cancelled && setSplits(s))
      .catch(() => {})
      .finally(() => !cancelled && setSplitsLoading(false))
    return () => {
      cancelled = true
    }
  }, [uuid])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const p = profileQ.data
  const s = p?.statistics?.season
  const rank = rankFromElo(p?.eloRate ?? null)
  // Drop phases with no elo rather than coercing null→0 (which would draw a
  // false drop-to-zero on the sparkline).
  const phases = (p?.seasonResult?.phases ?? []).map((ph) => ph.eloRate).filter((v): v is number => v != null)

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 animate-fade-in bg-black/70" onClick={onClose} />
      <div className="relative z-10 ml-auto flex h-full w-full max-w-md animate-sheet-up flex-col bg-ink">
        <div className="safe-top sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-800 bg-[#161618] px-4 py-3">
          <button onClick={onClose} aria-label="Back" className="slot flex h-10 w-10 items-center justify-center text-zinc-300 active:translate-y-px">
            <ArrowLeft size={17} />
          </button>
          <span className="font-mc text-[14px] font-black text-zinc-100">Player Profile</span>
        </div>

        <div className="safe-bottom flex-1 overflow-y-auto px-4 pb-10 pt-4">
          {/* Identity */}
          <div className="panel relative overflow-hidden p-4" style={{ borderColor: (rank?.color ?? '#3f3f46') + '55' }}>
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 opacity-[0.07]"
              style={{ background: `radial-gradient(circle, ${rank?.color ?? '#fff'} 0%, transparent 70%)` }}
            />
            <div className="flex items-center gap-3">
              <div className="slot p-1">
                <PlayerAvatar uuid={uuid} name={name} size={56} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-mc text-xl font-black text-zinc-50">{p?.nickname ?? name}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <CountryFlag code={p?.country} withName />
                  {p?.eloRank != null && (
                    <span className="chip">
                      <Crown size={11} className="text-yellow-400" /> #{p.eloRank}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded border border-zinc-800 bg-abyss p-3">
              <RankBadge elo={p?.eloRate ?? null} size="lg" />
              <div className="text-right">
                <div className="font-mc text-2xl font-black tabular-nums" style={{ color: rank?.color ?? '#fff' }}>
                  {formatNumber(p?.eloRate ?? null)}
                </div>
                <div className="font-mc text-[9px] uppercase tracking-widest text-zinc-600">Current Elo</div>
              </div>
            </div>
          </div>

          {phases.length >= 2 && (
            <Section title="Season Elo">
              <div className="panel p-3">
                <EloSparkline values={phases} color={rank?.color} />
                <div className="mt-2 flex justify-between font-mc text-[11px] text-zinc-600">
                  <span>low <span className="tabular-nums text-zinc-400">{formatNumber(p?.seasonResult?.lowest ?? null)}</span></span>
                  <span>peak <span className="tabular-nums text-green-400">{formatNumber(p?.seasonResult?.highest ?? null)}</span></span>
                </div>
              </div>
            </Section>
          )}

          <Section title="Season Stats">
            <div className="grid grid-cols-2 gap-1.5">
              <Stat label="Best PB" value={<SplitTime ms={s?.bestTime?.ranked} className="text-green-400" />} />
              <Stat label="Matches" value={formatNumber(s?.playedMatches?.ranked)} />
              <Stat label="Win Rate" value={formatPercent(winRate(s?.wins?.ranked ?? null, s?.loses?.ranked ?? null))} />
              <Stat label="Best Streak" value={formatNumber(s?.highestWinStreak?.ranked)} />
              <Stat label="Wins" value={formatNumber(s?.wins?.ranked)} />
              <Stat label="Playtime" value={formatDuration(s?.playtime?.ranked)} />
            </div>
          </Section>

          <Section title="Best Splits" right={<RankIcon tierKey="diamond" size={15} />} note="Fastest milestones across this player's quickest tracked runs.">
            {splitsLoading ? (
              <div className="panel flex items-center gap-2 px-3 py-4 font-mc text-xs text-zinc-500">
                <Loader2 size={13} className="animate-spin text-[#2CE0D8]" /> analysing fastest runs…
              </div>
            ) : splits && Object.keys(splits.best).length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {SPLITS.map((sp) => {
                  const v = splits.best[sp.key]
                  if (v == null) return null
                  const matchId = splits.source?.[sp.key]
                  return (
                    <button
                      key={sp.key}
                      onClick={() => matchId != null && openMatch(matchId, uuid)}
                      disabled={matchId == null}
                      className="panel p-2.5 text-left transition enabled:active:translate-y-px enabled:hover:border-[#2CE0D8]/40"
                    >
                      <div className="font-mc text-[9px] uppercase tracking-wider text-zinc-600">{sp.label}</div>
                      <SplitTime ms={v} className="mt-0.5 block text-[15px] font-bold text-[#2CE0D8]" />
                    </button>
                  )
                })}
                <div className="col-span-2 font-mc text-[10px] text-zinc-600">based on {splits.sampleSize} run{splits.sampleSize === 1 ? '' : 's'}.</div>
              </div>
            ) : (
              <div className="panel px-3 py-4 font-mc text-xs text-zinc-600">no timeline data available.</div>
            )}
          </Section>

          {p?.connections && Object.keys(p.connections).length > 0 && (
            <Section title="Links">
              <div className="flex flex-wrap gap-1.5">
                {p.connections.twitch && <LinkChip label={`twitch/${p.connections.twitch.id}`} href={`https://twitch.tv/${p.connections.twitch.id}`} color="#a970ff" />}
                {p.connections.youtube && <LinkChip label="youtube" href={`https://youtube.com/channel/${p.connections.youtube.id}`} color="#ff4e45" />}
                {p.connections.discord && <span className="chip normal-case">{p.connections.discord.name}</span>}
              </div>
            </Section>
          )}

          <Section title="Recent Ranked Matches">
            {matchesQ.isLoading ? (
              <div className="space-y-1.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 w-full rounded" />)}</div>
            ) : (
              <div className="space-y-1.5">
                {(matchesQ.data ?? []).map((m) => <MatchRow key={m.id} match={m} uuid={uuid} />)}
                {(matchesQ.data ?? []).length === 0 && <div className="font-mc text-xs text-zinc-600">no recent matches.</div>}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, right, note, children }: { title: string; right?: React.ReactNode; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mc text-[11px] font-bold uppercase tracking-wider text-zinc-400">{title}</span>
        {right}
      </div>
      {note && <p className="mb-2 font-sans text-[11px] leading-snug text-zinc-600">{note}</p>}
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="panel p-3">
      <div className="font-mc text-[9px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="mt-1 font-mc text-base font-bold tabular-nums text-zinc-100">{value}</div>
    </div>
  )
}

function LinkChip({ label, href, color }: { label: string; href: string; color: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="chip normal-case" style={{ borderColor: color + '66' }}>
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
      <ExternalLink size={10} className="text-zinc-600" />
    </a>
  )
}

function MatchRow({ match, uuid }: { match: Match; uuid: string }) {
  const { openMatch } = useNav()
  const won = match.result?.uuid === uuid
  const draw = match.result?.uuid == null
  const change = match.changes?.find((c) => c.uuid === uuid)?.change ?? null
  const opponent = match.players?.find((pl) => pl.uuid !== uuid)
  const myTime = match.result?.uuid === uuid ? match.result.time : null

  return (
    <button
      onClick={() => openMatch(match.id, uuid)}
      className="flex w-full items-center gap-3 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-left transition hover:border-zinc-700 active:translate-y-px">
      <div className={clsx('flex h-7 w-9 shrink-0 items-center justify-center rounded-sm font-mc text-[9px] font-black', draw ? 'bg-zinc-700/40 text-zinc-300' : won ? 'bg-green-600/20 text-green-400' : 'bg-red-600/15 text-red-400')}>
        {draw ? 'TIE' : won ? 'WIN' : 'LOSS'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mc text-[11px] text-zinc-600">vs</span>
          {opponent ? (
            <>
              <img src={avatarUrl(opponent.uuid, 24)} alt="" className="pixel h-4 w-4 rounded-sm" />
              <span className="truncate font-mc text-[12px] font-bold text-zinc-300">{opponent.nickname}</span>
            </>
          ) : (
            <span className="text-zinc-500">—</span>
          )}
        </div>
        <div className="font-mc text-[10px] text-zinc-600">{timeAgo(match.date)}{match.forfeited ? ' · ff' : ''}</div>
      </div>
      <div className="text-right">
        {myTime != null && myTime > 0 && <SplitTime ms={myTime} className="block text-[12px] font-bold text-zinc-200" />}
        {change != null && (
          <div className={clsx('font-mc text-[11px] font-bold tabular-nums', change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-zinc-600')}>
            {change > 0 ? '+' : ''}
            {change}
          </div>
        )}
      </div>
    </button>
  )
}
