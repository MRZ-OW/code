import { CloudOff, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { timeAgo } from '../lib/format'

export function DataStatus({
  online,
  lastUpdated,
  isFetching,
  onRefresh,
}: {
  online: boolean
  lastUpdated: number | undefined
  isFetching: boolean
  onRefresh: () => void
}) {
  // lastUpdated is unix-ms; timeAgo expects unix-seconds
  const ago = lastUpdated ? timeAgo(Math.floor(lastUpdated / 1000)) : null

  if (!online) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-mc text-[11px] text-amber-300">
        <CloudOff size={13} />
        <span className="flex-1">
          Offline — filtering & sorting cached data{ago ? <span className="text-amber-300/70"> from {ago}</span> : ''}.
        </span>
      </div>
    )
  }

  return (
    <div className="mb-3 flex items-center justify-between px-0.5">
      <span className="font-mc text-[10px] text-zinc-600">{ago ? `updated ${ago}` : 'live data'}</span>
      <button
        onClick={onRefresh}
        disabled={isFetching}
        className="flex items-center gap-1.5 font-mc text-[10px] font-bold text-zinc-500 transition hover:text-zinc-300 disabled:opacity-60"
      >
        <RefreshCw size={11} className={clsx(isFetching && 'animate-spin')} />
        {isFetching ? 'syncing…' : 'refresh'}
      </button>
    </div>
  )
}
