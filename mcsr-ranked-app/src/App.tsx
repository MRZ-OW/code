import { useMemo, useState } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { Header } from './components/Header'
import { Toolbar } from './components/Toolbar'
import { SplitsBar } from './components/SplitsBar'
import { PlayerTable } from './components/PlayerTable'
import { FilterSheet } from './components/FilterSheet'
import { ColumnSheet } from './components/ColumnSheet'
import { PlayerDrawer } from './components/PlayerDrawer'
import { DataStatus } from './components/DataStatus'
import { usePlayerData, type PlayerRow } from './hooks/usePlayerData'
import { useOnline } from './hooks/useOnline'
import { countriesFromCodes } from './lib/countries'

export default function App() {
  const data = usePlayerData()
  const online = useOnline()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [selected, setSelected] = useState<PlayerRow | null>(null)

  const countryOptions = useMemo(() => countriesFromCodes(data.baseRows.map((r) => r.country)), [data.baseRows])

  return (
    <div className="min-h-full">
      <Header currentSeason={data.currentSeason} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-4">
        <DataStatus online={online} lastUpdated={data.lastUpdated} isFetching={data.isFetching} onRefresh={data.refetch} />

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
            title={online ? "Couldn't load the leaderboard" : 'No offline data yet'}
            sub={
              online
                ? data.error.message || 'The MCSR Ranked API may be rate-limiting. Try again shortly.'
                : 'Connect once while online to cache the leaderboard — after that it stays available offline.'
            }
          />
        ) : data.rows.length === 0 ? (
          <EmptyState icon={<Inbox className="text-zinc-500" />} title="No players match your filters" sub="Try clearing a filter or widening the elo range." />
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

        <footer className="mt-6 text-center font-mc text-[10px] leading-relaxed text-zinc-600">
          built on the public{' '}
          <a href="https://docs.mcsrranked.com" target="_blank" rel="noreferrer" className="text-green-500 underline">
            MCSR Ranked API
          </a>
          {' '}· not affiliated with Mojang · splits computed on device
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
    <div className="panel divide-y divide-zinc-800/60 overflow-hidden bg-abyss p-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <div className="skeleton h-4 w-4 rounded-sm" />
          <div className="skeleton h-6 w-6 rounded-sm" />
          <div className="skeleton h-3.5 flex-1 rounded-sm" />
          <div className="skeleton h-3.5 w-12 rounded-sm" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="slot flex h-12 w-12 items-center justify-center">{icon}</div>
      <h3 className="font-mc text-sm font-bold text-zinc-100">{title}</h3>
      <p className="max-w-xs font-sans text-xs text-zinc-500">{sub}</p>
    </div>
  )
}
