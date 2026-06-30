import clsx from 'clsx'
import { Logo } from './Logo'
import { useFilters } from '../store/useFilters'

export function Header({ currentSeason }: { currentSeason: number | null }) {
  const { mode, setMode, season, setSeason } = useFilters()
  const seasons = currentSeason ? Array.from({ length: currentSeason }, (_, i) => currentSeason - i) : []

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-zinc-800 bg-[#161618]">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pb-2.5 pt-3">
        <div className="flex items-center gap-2.5">
          <div className="slot flex h-9 w-9 items-center justify-center">
            <Logo size={20} />
          </div>
          <div className="leading-none">
            <div className="font-mc text-[15px] font-black tracking-tight">
              <span className="text-zinc-100">MCSR</span> <span className="text-green-500">RANKED</span>
            </div>
            <div className="mt-1 font-mc text-[9px] uppercase tracking-[0.2em] text-zinc-600">Leaderboard Explorer</div>
          </div>
        </div>

        {currentSeason && (
          <select
            value={season ?? currentSeason}
            onChange={(e) => setSeason(Number(e.target.value) === currentSeason ? null : Number(e.target.value))}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 font-mc text-[11px] font-bold text-zinc-300 focus:border-green-600/70 focus:outline-none"
            aria-label="Season"
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s === currentSeason ? `S${s} · LIVE` : `Season ${s}`}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4">
        <div className="flex gap-6">
          <ModeTab active={mode === 'elo'} onClick={() => setMode('elo')} label="Elo Ladder" />
          <ModeTab active={mode === 'record'} onClick={() => setMode('record')} label="Fastest Times" />
        </div>
      </div>
    </header>
  )
}

function ModeTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative pb-2 pt-0.5 font-mc text-[13px] font-bold transition',
        active ? 'text-zinc-100' : 'text-zinc-600 hover:text-zinc-400',
      )}
    >
      {label}
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-green-500" />}
    </button>
  )
}
