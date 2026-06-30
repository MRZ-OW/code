import { Pickaxe, X, Loader2 } from 'lucide-react'
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
      <div className="panel mb-3 bg-zinc-900 p-3">
        <div className="flex items-center gap-3">
          <Loader2 className="shrink-0 animate-spin text-[#2CE0D8]" size={16} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between font-mc text-[11px]">
              <span className="font-bold text-zinc-200">
                Computing splits… {progress.done}/{progress.total}
              </span>
              <span className="tabular-nums text-zinc-500">{pct}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-sm border border-zinc-700 bg-abyss">
              <div className="xpbar h-full animate-bar-stripes transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            {progress.currentName && <div className="mt-1 truncate font-mc text-[10px] text-zinc-600">last: {progress.currentName}</div>}
          </div>
          <button onClick={onCancel} className="slot flex h-7 w-7 shrink-0 items-center justify-center text-zinc-400 active:translate-y-px">
            <X size={13} />
          </button>
        </div>
      </div>
    )
  }

  if (toCompute === 0) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded border border-green-600/30 bg-green-600/10 px-3 py-2 font-mc text-[11px] text-brand-text">
        <Pickaxe size={13} className="text-green-500" />
        Splits ready — sort by any split column to rank by pace.
      </div>
    )
  }

  return (
    <button onClick={onCompute} className="btn btn-primary mb-3 w-full">
      <Pickaxe size={14} />
      Compute splits · {toCompute} player{toCompute === 1 ? '' : 's'} in view
    </button>
  )
}
