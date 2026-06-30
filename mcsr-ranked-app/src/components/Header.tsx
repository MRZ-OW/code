import { Trophy, Timer } from 'lucide-react'
import clsx from 'clsx'
import { PixelOre } from './PixelOre'
import { useFilters } from '../store/useFilters'

export function Header({ currentSeason }: { currentSeason: number | null }) {
  const { mode, setMode, season, setSeason } = useFilters()

  const seasons = currentSeason ? Array.from({ length: currentSeason }, (_, i) => currentSeason - i) : []

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line/70 bg-ink/85 backdrop-blur-md">
      <div className="bg-top-glow">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface-raised shadow-inset">
              <PixelOre tierKey="diamond" size={22} />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-extrabold tracking-tight text-zinc-50">MCSR</span>
                <span className="text-[15px] font-extrabold tracking-tight text-grass">Ranked</span>
              </div>
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Leaderboard Explorer</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentSeason && (
              <select
                value={season ?? currentSeason}
                onChange={(e) => setSeason(Number(e.target.value) === currentSeason ? null : Number(e.target.value))}
                className="rounded-lg border border-line bg-surface-raised px-2 py-1.5 text-xs font-semibold text-zinc-200 focus:border-grass/60 focus:outline-none"
                aria-label="Season"
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s === currentSeason ? `Season ${s} (live)` : `Season ${s}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div className="inline-flex rounded-xl border border-line bg-surface/60 p-0.5">
            <ModeTab active={mode === 'elo'} onClick={() => setMode('elo')} icon={<Trophy size={14} />} label="Elo Ladder" />
            <ModeTab active={mode === 'record'} onClick={() => setMode('record')} icon={<Timer size={14} />} label="Fastest Times" />
          </div>
        </div>
      </div>
    </header>
  )
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition',
        active ? 'bg-grass-500 text-ink-900 shadow-glow' : 'text-zinc-400 hover:text-zinc-200',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
