import { rankFromElo } from '../lib/ranks'
import { PixelOre } from './PixelOre'
import { formatNumber } from '../lib/format'
import clsx from 'clsx'

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
  if (!rank) {
    return <span className="text-xs text-muted">—</span>
  }
  const ore = size === 'lg' ? 30 : size === 'sm' ? 16 : 22

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-lg border px-2 py-1 font-semibold',
        size === 'sm' ? 'text-[11px]' : 'text-xs',
      )}
      style={{ borderColor: rank.color + '55', background: rank.soft }}
      title={`${rank.label} · ${formatNumber(elo)} elo`}
    >
      <PixelOre tierKey={rank.tier.key} size={ore} />
      <span className="flex flex-col leading-none">
        <span style={{ color: rank.color }}>{rank.label}</span>
        {showElo && <span className="mono mt-0.5 text-[10px] text-zinc-400">{formatNumber(elo)}</span>}
      </span>
    </span>
  )
}
