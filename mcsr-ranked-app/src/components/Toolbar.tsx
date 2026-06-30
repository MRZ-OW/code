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
    <div className="mb-3 space-y-2">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="search player…" className="input pl-9 pr-9 lowercase" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 active:scale-90">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onOpenFilters} className={clsx('btn flex-1', activeFilters > 0 && 'border-green-600/60 text-brand-text')}>
          <SlidersHorizontal size={14} />
          Filters
          {activeFilters > 0 && <Count n={activeFilters} />}
        </button>
        <button onClick={onOpenColumns} className={clsx('btn flex-1', enabledColumns.size > 0 && 'border-green-600/60 text-brand-text')}>
          <Columns3 size={14} />
          Columns
          {enabledColumns.size > 0 && <Count n={enabledColumns.size} />}
        </button>
        <div className="ml-auto whitespace-nowrap pl-1 font-mc text-[11px] text-zinc-600">
          <span className="text-zinc-300">{filteredCount}</span>/{totalCount}
        </div>
      </div>
    </div>
  )
}

function Count({ n }: { n: number }) {
  return <span className="ml-0.5 rounded bg-green-500 px-1.5 font-mc text-[10px] font-black text-zinc-950">{n}</span>
}
