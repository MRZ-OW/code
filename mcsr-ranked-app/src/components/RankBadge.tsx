import clsx from 'clsx'
import { rankFromElo } from '../lib/ranks'
import { RankIcon } from './RankIcon'
import { formatNumber } from '../lib/format'

export function RankBadge({
  elo,
  size = 'md',
  showElo = false,
}: {
  elo: number | null | undefined
  size?: 'sm' | 'md' | 'lg'
  showElo?: boolean
}) {
  const rank = rankFromElo(elo)
  if (!rank) return <span className="font-mc text-xs text-zinc-600">—</span>
  const icon = size === 'lg' ? 28 : size === 'sm' ? 16 : 20

  return (
    <span
      className={clsx('inline-flex items-center gap-2 rounded border px-2 py-1 font-mc font-bold', size === 'sm' ? 'text-[11px]' : 'text-xs')}
      style={{ borderColor: rank.color + '44', background: rank.soft }}
      title={`${rank.label} · ${formatNumber(elo)} elo`}
    >
      <RankIcon tierKey={rank.tier.key} size={icon} />
      <span className="flex flex-col leading-none">
        <span style={{ color: rank.color }}>{rank.label}</span>
        {showElo && <span className="mt-1 text-[10px] tabular-nums text-zinc-400">{formatNumber(elo)} elo</span>}
      </span>
    </span>
  )
}
