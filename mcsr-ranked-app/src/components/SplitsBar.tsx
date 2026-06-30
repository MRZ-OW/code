import { Pickaxe, X, Loader2, Sparkles } from 'lucide-react'
import type { BatchProgress } from '../lib/splits'

export function SplitsBar({
  splitKeysCount,
  toCompute,
  progress,
  onCompute,
  onCancel,
}: {
  splitKeysCount: number
  toCompute: number
  progress: BatchProgress | null
  onCompute: () => void
  onCancel: () => void
}) {
  if (splitKeysCount === 0) return null

  if (progress) {
    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
    return (
      <div className="card mb-3 overflow-hidden p-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <Loader2 className="shrink-0 animate-spin text-diamond" size={18} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-100">
                Computing splits… {progress.done}/{progress.total}
              </span>
              <span className="mono text-muted">{pct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-high">
              <div className="h-full rounded-full bg-gradient-to-r from-diamond to-grass transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            {progress.currentName && <div className="mt-1 truncate text-[10px] text-muted">Last analysed: {progress.currentName}</div>}
          </div>
          <button onClick={onCancel} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line text-zinc-400 active:scale-95">
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  if (toCompute === 0) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-grass/30 bg-grass/10 px-3.5 py-2 text-xs text-grass-100">
        <Sparkles size={14} className="text-grass" />
        Splits ready for all players in view. Sort by any split column to rank by pace.
      </div>
    )
  }

  return (
    <button onClick={onCompute} className="btn btn-primary mb-3 w-full justify-center">
      <Pickaxe size={15} />
      Compute splits for {toCompute} player{toCompute === 1 ? '' : 's'} in view
    </button>
  )
}
