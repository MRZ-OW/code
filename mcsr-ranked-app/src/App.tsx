import { useMemo, useState } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { Header } from './components/Header'
import { Toolbar } from './components/Toolbar'
import { SplitsBar } from './components/SplitsBar'
import { PlayerTable } from './components/PlayerTable'
import { FilterSheet } from './components/FilterSheet'
import { ColumnSheet } from './components/ColumnSheet'
import { PlayerDrawer } from './components/PlayerDrawer'
import { usePlayerData, type PlayerRow } from './hooks/usePlayerData'
import { countriesFromCodes } from './lib/countries'

export default function App() {
  const data = usePlayerData()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [selected, setSelected] = useState<PlayerRow | null>(null)

  const countryOptions = useMemo(() => countriesFromCodes(data.baseRows.map((r) => r.country)), [data.baseRows])

  return (
    <div className="min-h-full">
      <Header currentSeason={data.currentSeason} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-4">
        <Toolbar
          filteredCount={data.filteredCount}
          totalCount={data.totalCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onOpenColumns={() => setColumnsOpen(true)}
        />

        <SplitsBar
          splitKeysCount={data.splitKeys.length}
          toCompute={data.splitsToCompute}
          progress={data.splitProgress}
          onCompute={data.computeSplits}
          onCancel={data.cancelSplits}
        />

        {data.isLoading ? (
          <TableSkeleton />
        ) : data.error ? (
          <EmptyState
            icon={<AlertTriangle className="text-amber-400" />}
            title="Couldn't load the leaderboard"
            sub={data.error.message || 'The MCSR Ranked API may be rate-limiting or offline. Try again shortly.'}
          />
        ) : data.rows.length === 0 ? (
          <EmptyState icon={<Inbox className="text-muted" />} title="No players match your filters" sub="Try clearing a filter or widening the elo range." />
        ) : (
          <div className="animate-fade-in">
            <PlayerTable
              rows={data.rows}
              mode={data.mode}
              profiles={data.profiles}
              splits={data.splits}
              profileLoading={data.profileLoading}
              onSelect={setSelected}
            />
          </div>
        )}

        <footer className="mt-6 text-center text-[10px] leading-relaxed text-muted">
          Built on the public{' '}
          <a href="https://docs.mcsrranked.com" target="_blank" rel="noreferrer" className="text-grass-300 underline">
            MCSR Ranked API
          </a>
          . Not affiliated with Mojang. Data refreshes live · splits computed on device.
        </footer>
      </main>

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} countries={countryOptions} />
      <ColumnSheet open={columnsOpen} onClose={() => setColumnsOpen(false)} />
      {selected && <PlayerDrawer uuid={selected.uuid} name={selected.nickname} onClose={() => setSelected(null)} />}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="card space-y-px overflow-hidden p-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="skeleton h-4 w-5" />
          <div className="skeleton h-8 w-8 rounded-md" />
          <div className="skeleton h-4 flex-1" />
          <div className="skeleton h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-surface-raised">{icon}</div>
      <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
      <p className="max-w-xs text-xs text-muted">{sub}</p>
    </div>
  )
}
