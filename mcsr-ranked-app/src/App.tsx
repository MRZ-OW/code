import { useEffect, useMemo, useRef, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { Header } from './components/Header'
import { Toolbar } from './components/Toolbar'
import { SplitsBar } from './components/SplitsBar'
import { PlayerTable } from './components/PlayerTable'
import { FilterSheet } from './components/FilterSheet'
import { ColumnSheet } from './components/ColumnSheet'
import { PlayerDrawer } from './components/PlayerDrawer'
import { MatchDrawer } from './components/MatchDrawer'
import { DataStatus } from './components/DataStatus'
import { usePlayerData } from './hooks/usePlayerData'
import { useOnline } from './hooks/useOnline'
import { useNav } from './store/useNav'
import { countriesFromCodes } from './lib/countries'
import { prefetchHeads } from './lib/prefetch'

export default function App() {
  const data = usePlayerData()
  const online = useOnline()
  const { player, matchId, matchFocusUuid, closePlayer } = useNav()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)

  const countryOptions = useMemo(() => countriesFromCodes(data.baseRows.map((r) => r.country)), [data.baseRows])

  // Warm the avatar cache for every player while online, so heads show offline.
  useEffect(() => {
    if (online && data.baseRows.length) prefetchHeads(data.baseRows.map((r) => r.uuid))
  }, [online, data.baseRows])

  // Android hardware/gesture back: close the topmost overlay (match → player →
  // column sheet → filter sheet) instead of leaving the app; exit only when
  // nothing is open. Registered once; reads current state via refs/getState.
  const filtersOpenRef = useRef(filtersOpen)
  filtersOpenRef.current = filtersOpen
  const columnsOpenRef = useRef(columnsOpen)
  columnsOpenRef.current = columnsOpen
  useEffect(() => {
    let sub: { remove: () => void } | undefined
    CapacitorApp.addListener('backButton', () => {
      const nav = useNav.getState()
      if (nav.matchId != null) return nav.closeMatch()
      if (nav.player) return nav.closePlayer()
      if (columnsOpenRef.current) return setColumnsOpen(false)
      if (filtersOpenRef.current) return setFiltersOpen(false)
      CapacitorApp.exitApp()
    }).then((h) => (sub = h))
    return () => sub?.remove()
  }, [])

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
          data.searchState === 'loading' ? (
            <EmptyState icon={<Loader2 className="animate-spin text-green-500" />} title="Searching all of MCSR…" sub="Looking up that player by name." />
          ) : data.searchState === 'notfound' ? (
            <EmptyState icon={<Inbox className="text-zinc-500" />} title="No player by that exact name" sub="Search uses exact in-game names. Check spelling, or browse the top-150 ladder." />
          ) : (
            <EmptyState
              icon={<Inbox className="text-zinc-500" />}
              title="No players match your filters"
              sub="The ranked ladder shows the top 150. To find anyone else in MCSR, type their exact in-game name."
            />
          )
        ) : (
          <div className="animate-fade-in">
            <PlayerTable
              rows={data.rows}
              mode={data.mode}
              profiles={data.profiles}
              splits={data.splits}
              profileLoading={data.profileLoading}
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
      {player && <PlayerDrawer uuid={player.uuid} name={player.name} onClose={closePlayer} />}
      {matchId != null && <MatchDrawer id={matchId} focusUuid={matchFocusUuid} />}
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
