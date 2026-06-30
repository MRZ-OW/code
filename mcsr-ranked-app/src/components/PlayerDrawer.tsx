import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Trophy, Swords, Flame, Clock, Target, Crown, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { getUser, getUserMatches } from '../api/mcsr'
import type { Match } from '../api/types'
import { computePlayerSplits, SPLITS, type PlayerSplits } from '../lib/splits'
import { rankFromElo } from '../lib/ranks'
import { useFilters } from '../store/useFilters'
import { PlayerAvatar } from './PlayerAvatar'
import { RankBadge } from './RankBadge'
import { CountryFlag } from './CountryFlag'
import { EloSparkline } from './EloSparkline'
import { PixelOre } from './PixelOre'
import { formatTime, formatDuration, formatNumber, formatPercent, timeAgo, winRate, avatarUrl } from '../lib/format'

export function PlayerDrawer({ uuid, name, onClose }: { uuid: string; name: string; onClose: () => void }) {
  const { season } = useFilters()
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
  const phases = p?.seasonResult?.phases?.map((ph) => ph.eloRate ?? 0) ?? []

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative z-10 ml-auto flex h-full w-full max-w-md animate-slide-up flex-col bg-ink">
        {/* Top bar */}
        <div className="safe-top sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur">
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface-raised text-zinc-300 active:scale-95">
            <ArrowLeft size={17} />
          </button>
          <span className="font-bold text-zinc-100">Player Profile</span>
        </div>

        <div className="safe-bottom flex-1 overflow-y-auto px-4 pb-10 pt-4">
          {/* Identity */}
          <div className="relative overflow-hidden rounded-2xl border border-line bg-grass-fade p-4">
            <div className="flex items-center gap-3">
              <PlayerAvatar uuid={uuid} name={name} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-xl font-extrabold text-zinc-50">{p?.nickname ?? name}</h2>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <CountryFlag code={p?.country} withName />
                  {p?.eloRank != null && (
                    <span className="chip">
                      <Crown size={12} className="text-gold" /> #{p.eloRank} global
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-ink/40 p-3">
              <RankBadge elo={p?.eloRate ?? null} size="lg" showElo />
              <div className="text-right">
                <div className="mono text-2xl font-extrabold" style={{ color: rank?.color ?? '#fff' }}>
                  {formatNumber(p?.eloRate ?? null)}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted">Current Elo</div>
              </div>
            </div>
          </div>

          {/* Season elo trajectory */}
          {phases.length >= 2 && (
            <Section title="Season Elo" icon={<Trophy size={14} />}>
              <div className="rounded-xl border border-line bg-surface/50 p-3">
                <EloSparkline values={phases} color={rank?.color} />
                <div className="mt-2 flex justify-between text-[11px] text-muted">
                  <span>Low <span className="mono text-zinc-300">{formatNumber(p?.seasonResult?.lowest ?? null)}</span></span>
                  <span>Peak <span className="mono text-grass-200">{formatNumber(p?.seasonResult?.highest ?? null)}</span></span>
                </div>
              </div>
            </Section>
          )}

          {/* Stats grid */}
          <Section title="Season Stats" icon={<Target size={14} />}>
            <div className="grid grid-cols-2 gap-2">
              <Stat icon={<Clock size={13} />} label="Best PB" value={formatTime(s?.bestTime?.ranked)} accent="text-grass-200" />
              <Stat icon={<Swords size={13} />} label="Matches" value={formatNumber(s?.playedMatches?.ranked)} />
              <Stat icon={<Trophy size={13} />} label="Win Rate" value={formatPercent(winRate(s?.wins?.ranked ?? null, s?.loses?.ranked ?? null))} />
              <Stat icon={<Flame size={13} />} label="Best Streak" value={formatNumber(s?.highestWinStreak?.ranked)} />
              <Stat icon={<Trophy size={13} />} label="Wins" value={formatNumber(s?.wins?.ranked)} />
              <Stat icon={<Clock size={13} />} label="Playtime" value={formatDuration(s?.playtime?.ranked)} />
            </div>
          </Section>

          {/* Computed splits */}
          <Section
            title="Best Splits"
            icon={<PixelOre tierKey="diamond" size={14} />}
            note="Fastest milestone times across this player's quickest tracked runs."
          >
            {splitsLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface/50 px-3 py-4 text-xs text-muted">
                <Loader2 size={14} className="animate-spin text-diamond" /> Analysing fastest runs…
              </div>
            ) : splits && Object.keys(splits.best).length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {SPLITS.map((sp) => {
                  const v = splits.best[sp.key]
                  if (v == null) return null
                  return (
                    <div key={sp.key} className="rounded-xl border border-line bg-surface/50 p-2.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted">{sp.label}</div>
                      <div className="mono mt-0.5 text-sm font-bold text-diamond">{formatTime(v)}</div>
                    </div>
                  )
                })}
                <div className="col-span-2 mt-0.5 text-[10px] text-muted">Based on {splits.sampleSize} run{splits.sampleSize === 1 ? '' : 's'}.</div>
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-surface/50 px-3 py-4 text-xs text-muted">No timeline data available.</div>
            )}
          </Section>

          {/* Connections */}
          {p?.connections && Object.keys(p.connections).length > 0 && (
            <Section title="Links" icon={<ExternalLink size={14} />}>
              <div className="flex flex-wrap gap-2">
                {p.connections.twitch && <LinkChip label={`Twitch · ${p.connections.twitch.name}`} href={`https://twitch.tv/${p.connections.twitch.id}`} color="#a970ff" />}
                {p.connections.youtube && <LinkChip label="YouTube" href={`https://youtube.com/channel/${p.connections.youtube.id}`} color="#ff4e45" />}
                {p.connections.discord && <span className="chip">Discord · {p.connections.discord.name}</span>}
              </div>
            </Section>
          )}

          {/* Recent matches */}
          <Section title="Recent Ranked Matches" icon={<Swords size={14} />}>
            {matchesQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(matchesQ.data ?? []).map((m) => (
                  <MatchRow key={m.id} match={m} uuid={uuid} />
                ))}
                {(matchesQ.data ?? []).length === 0 && <div className="text-xs text-muted">No recent matches.</div>}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, note, children }: { title: string; icon: React.ReactNode; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
        {icon}
        {title}
      </div>
      {note && <p className="mb-2 text-[11px] leading-snug text-muted">{note}</p>}
      {children}
    </section>
  )
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface/50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <div className={clsx('mono mt-1 text-base font-bold text-zinc-100', accent)}>{value}</div>
    </div>
  )
}

function LinkChip({ label, href, color }: { label: string; href: string; color: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="chip" style={{ borderColor: color + '66' }}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
      <ExternalLink size={11} className="text-muted" />
    </a>
  )
}

function MatchRow({ match, uuid }: { match: Match; uuid: string }) {
  const won = match.result?.uuid === uuid
  const draw = match.result?.uuid == null
  const change = match.changes?.find((c) => c.uuid === uuid)?.change ?? null
  const opponent = match.players?.find((pl) => pl.uuid !== uuid)
  const myTime = match.result?.uuid === uuid ? match.result.time : null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/50 px-3 py-2.5">
      <div
        className={clsx(
          'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-extrabold',
          draw ? 'bg-zinc-500/20 text-zinc-300' : won ? 'bg-grass/20 text-grass' : 'bg-red-500/15 text-red-300',
        )}
      >
        {draw ? 'TIE' : won ? 'WIN' : 'LOSS'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted">vs</span>
          {opponent ? (
            <>
              <img src={avatarUrl(opponent.uuid, 32)} alt="" className="h-4 w-4 rounded" style={{ imageRendering: 'pixelated' }} />
              <span className="truncate font-semibold text-zinc-200">{opponent.nickname}</span>
            </>
          ) : (
            <span className="text-zinc-300">—</span>
          )}
        </div>
        <div className="text-[10px] text-muted">{timeAgo(match.date)}{match.forfeited ? ' · forfeit' : ''}</div>
      </div>
      <div className="text-right">
        {myTime != null && myTime > 0 && <div className="mono text-xs font-bold text-zinc-100">{formatTime(myTime)}</div>}
        {change != null && (
          <div className={clsx('mono text-[11px] font-bold', change > 0 ? 'text-grass' : change < 0 ? 'text-red-300' : 'text-muted')}>
            {change > 0 ? '+' : ''}
            {change}
          </div>
        )}
      </div>
    </div>
  )
}
