import { Search, SlidersHorizontal, Columns3, X } from 'lucide-react'
import clsx from 'clsx'
import { useFilters } from '../store/useFilters'

export function Toolbar({
  filteredCount,
  totalCount,
  onOpenFilters,
  onOpenColumns,
}: {
  filteredCount: number
  totalCount: number
  onOpenFilters: () => void
  onOpenColumns: () => void
}) {
  const { search, setSearch, countries, tiers, eloMin, eloMax, enabledColumns } = useFilters()
  const activeFilters = countries.size + tiers.size + (eloMin != null || eloMax != null ? 1 : 0)

  return (
    <div className="mb-3 space-y-2.5">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players…"
          className="input pl-9 pr-9"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted active:scale-90">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onOpenFilters} className={clsx('btn flex-1', activeFilters > 0 && 'border-grass/50 text-grass-100')}>
          <SlidersHorizontal size={15} />
          Filters
          {activeFilters > 0 && <span className="ml-0.5 rounded-full bg-grass px-1.5 text-[10px] font-bold text-ink-900">{activeFilters}</span>}
        </button>
        <button onClick={onOpenColumns} className={clsx('btn flex-1', enabledColumns.size > 0 && 'border-grass/50 text-grass-100')}>
          <Columns3 size={15} />
          Columns
          {enabledColumns.size > 0 && <span className="ml-0.5 rounded-full bg-grass px-1.5 text-[10px] font-bold text-ink-900">{enabledColumns.size}</span>}
        </button>
      </div>

      <div className="flex items-center justify-between px-0.5 text-[11px] text-muted">
        <span>
          Showing <span className="font-bold text-zinc-300">{filteredCount}</span> of {totalCount} players
        </span>
      </div>
    </div>
  )
}
