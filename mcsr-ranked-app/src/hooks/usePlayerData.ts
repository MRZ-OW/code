import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLeaderboard, getRecordLeaderboard, getUser } from '../api/mcsr'
import { cachedAt } from '../api/client'
import type { UserProfile } from '../api/types'
import { rankFromElo } from '../lib/ranks'
import { countryName } from '../lib/countries'
import { enabledNeeds } from '../lib/columns'
import { computeManySplits, getCachedSplits, type BatchProgress, type PlayerSplits } from '../lib/splits'
import { winRate as calcWinRate } from '../lib/format'
import { useFilters } from '../store/useFilters'

export interface PlayerRow {
  uuid: string
  nickname: string
  country: string | null
  roleType: number
  elo: number | null
  eloRank: number | null
  phasePoint: number | null
  recordTime?: number | null
  recordId?: number
  recordRank?: number
}

export interface ProfileFields {
  bestTime: number | null
  winRate: number | null
  highestElo: number | null
  matches: number | null
  wins: number | null
  winStreak: number | null
  playtime: number | null
}

function deriveProfile(p: UserProfile): ProfileFields {
  const s = p.statistics?.season
  return {
    bestTime: s?.bestTime?.ranked ?? null,
    winRate: calcWinRate(s?.wins?.ranked ?? null, s?.loses?.ranked ?? null),
    highestElo: p.seasonResult?.highest ?? null,
    matches: s?.playedMatches?.ranked ?? null,
    wins: s?.wins?.ranked ?? null,
    winStreak: s?.highestWinStreak?.ranked ?? null,
    playtime: s?.playtime?.ranked ?? null,
  }
}

export function usePlayerData() {
  const { mode, season, search, countries, tiers, eloMin, eloMax, sort, enabledColumns, setSort } = useFilters()

  // staleTime 0 lets React Query ask on every mount / focus / reconnect / tick;
  // apiGet then decides whether to actually hit the network (cache <5min → no
  // network; ≥5min or missing → fresh pull; offline → keep cache). A 5-min
  // interval keeps the board live while the app is open and online.
  const liveQueryOpts = {
    staleTime: 0,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
  } as const
  const eloQuery = useQuery({
    queryKey: ['leaderboard', season],
    queryFn: () => getLeaderboard(season ?? undefined),
    enabled: mode === 'elo',
    ...liveQueryOpts,
  })
  const recordQuery = useQuery({
    queryKey: ['records', season],
    queryFn: () => getRecordLeaderboard(season ?? undefined),
    enabled: mode === 'record',
    ...liveQueryOpts,
  })

  // The LIVE season number, fetched independently of the selected season so that
  // viewing an older season doesn't make the app think that season is "live".
  const liveSeasonQ = useQuery({
    queryKey: ['liveLeaderboard'],
    queryFn: () => getLeaderboard(),
    staleTime: 5 * 60 * 1000,
    refetchOnReconnect: true,
  })
  const currentSeason = liveSeasonQ.data?.season.number ?? eloQuery.data?.season.number ?? null

  // ---- Global player search (find anyone by exact IGN, beyond the top 150) ----
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])
  const searchQ = useQuery({
    queryKey: ['userSearch', debouncedSearch.toLowerCase(), season],
    queryFn: () => getUser(debouncedSearch, season ?? undefined),
    enabled: debouncedSearch.length >= 2,
    retry: false, // 404 = no such player
  })

  // Timestamp the current board was last cached (for the offline/updated badge).
  const seasonQ = season != null ? `?season=${season}` : ''
  const boardPath = mode === 'elo' ? `/leaderboard${seasonQ}` : `/record-leaderboard${seasonQ}`
  const lastUpdated = cachedAt(boardPath)
  const refetch = () => (mode === 'elo' ? eloQuery.refetch() : recordQuery.refetch())

  // ---- Base rows ----------------------------------------------------------
  const baseRows = useMemo<PlayerRow[]>(() => {
    if (mode === 'elo') {
      const users = eloQuery.data?.users ?? []
      return users.map((u) => ({
        uuid: u.uuid,
        nickname: u.nickname,
        country: u.country,
        roleType: u.roleType,
        elo: u.eloRate,
        eloRank: u.eloRank,
        phasePoint: u.seasonResult?.phasePoint ?? null,
      }))
    }
    const entries = recordQuery.data ?? []
    return entries.map((e) => ({
      uuid: e.user.uuid,
      nickname: e.user.nickname,
      country: e.user.country,
      roleType: e.user.roleType,
      elo: e.user.eloRate,
      eloRank: e.user.eloRank,
      phasePoint: null,
      recordTime: e.time,
      recordId: e.id,
      recordRank: e.rank,
    }))
  }, [mode, eloQuery.data, recordQuery.data])

  // ---- Filtering ----------------------------------------------------------
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return baseRows.filter((r) => {
      if (q && !r.nickname.toLowerCase().includes(q)) return false
      if (countries.size > 0) {
        const code = r.country ? r.country.toLowerCase() : '__unknown'
        if (!countries.has(code)) return false
      }
      if (tiers.size > 0) {
        const rk = rankFromElo(r.elo)
        if (!rk || !tiers.has(rk.tier.key)) return false
      }
      if (eloMin != null && (r.elo ?? -Infinity) < eloMin) return false
      if (eloMax != null && (r.elo ?? Infinity) > eloMax) return false
      return true
    })
  }, [baseRows, search, countries, tiers, eloMin, eloMax])

  // A player found by exact-name search who isn't in the loaded leaderboard
  // (e.g. ranked outside the top 150) — surfaced so you can find anyone in MCSR.
  const searchRow = useMemo<PlayerRow | null>(() => {
    const u = searchQ.data
    if (!u || !search.trim()) return null
    return { uuid: u.uuid, nickname: u.nickname, country: u.country, roleType: u.roleType, elo: u.eloRate, eloRank: u.eloRank, phasePoint: u.seasonResult?.phasePoint ?? null }
  }, [searchQ.data, search])

  // Augment the filtered rows with the global search hit if it isn't already shown.
  const augmentedRows = useMemo(() => {
    if (!searchRow) return filteredRows
    if (filteredRows.some((r) => r.uuid === searchRow.uuid)) return filteredRows
    return [searchRow, ...filteredRows]
  }, [filteredRows, searchRow])

  const filteredKey = useMemo(() => augmentedRows.map((r) => r.uuid).join(','), [augmentedRows])

  // ---- Profile enrichment (lazy, over the filtered set) -------------------
  const [profiles, setProfiles] = useState<Map<string, ProfileFields>>(new Map())
  const [profileLoading, setProfileLoading] = useState(false)
  const { needsProfile, splitKeys } = enabledNeeds(enabledColumns)
  // Mirror of `profiles` read inside effects so the enrichment effect doesn't
  // need `profiles` in its deps (which would cancel its own in-flight batch on
  // every incremental update). `requestedRef` tracks uuids already in flight so
  // we don't refire fetches.
  const profilesRef = useRef<Map<string, ProfileFields>>(new Map())
  const requestedRef = useRef<Set<string>>(new Set())
  const writeProfile = (uuid: string, fields: ProfileFields) =>
    setProfiles((prev) => {
      const next = new Map(prev).set(uuid, fields)
      profilesRef.current = next
      return next
    })

  // Profile stats are season-specific: clear when the season changes. Declared
  // BEFORE the enrichment effect and clears the refs synchronously, so on a
  // season change the enrichment effect (which runs next in the same commit)
  // sees the cleared map and refetches. (Mode is intentionally not a trigger — a
  // profile is the same regardless of which board you came from.)
  useEffect(() => {
    profilesRef.current = new Map()
    requestedRef.current = new Set()
    setProfiles(new Map())
  }, [season])

  useEffect(() => {
    if (!needsProfile) return
    const missing = augmentedRows.filter((r) => !profilesRef.current.has(r.uuid) && !requestedRef.current.has(r.uuid))
    if (missing.length === 0) return
    missing.forEach((r) => requestedRef.current.add(r.uuid))
    let cancelled = false
    setProfileLoading(true)
    ;(async () => {
      await Promise.all(
        missing.map(async (r) => {
          try {
            const p = await getUser(r.uuid, season ?? undefined)
            if (!cancelled) writeProfile(r.uuid, deriveProfile(p))
          } catch {
            requestedRef.current.delete(r.uuid) // allow a retry on failure
          }
        }),
      )
      if (!cancelled) setProfileLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsProfile, filteredKey, season])

  // ---- Splits (computed on demand) ----------------------------------------
  const [splits, setSplits] = useState<Map<string, PlayerSplits>>(new Map())
  const [splitProgress, setSplitProgress] = useState<BatchProgress | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Seed from persistent cache whenever the filtered set or split needs change.
  useEffect(() => {
    if (splitKeys.length === 0) return
    setSplits((prev) => {
      const next = new Map(prev)
      let changed = false
      for (const r of augmentedRows) {
        if (!next.has(r.uuid)) {
          const cached = getCachedSplits(r.uuid)
          if (cached) {
            next.set(r.uuid, cached)
            changed = true
          }
        }
      }
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredKey, splitKeys.length])

  // De-duplicate by uuid: the Fastest-Times board can list the same player on
  // several rows, but a player's splits only need computing once.
  const splitsToCompute = useMemo(() => {
    if (splitKeys.length === 0) return []
    const seen = new Set<string>()
    return augmentedRows.filter((r) => !splits.has(r.uuid) && !seen.has(r.uuid) && (seen.add(r.uuid), true))
  }, [augmentedRows, splits, splitKeys.length])

  const computeSplits = useCallback(async () => {
    const players = splitsToCompute.map((r) => ({ identifier: r.uuid, uuid: r.uuid, name: r.nickname }))
    if (players.length === 0) return
    const abort = new AbortController()
    abortRef.current = abort
    setSplitProgress({ done: 0, total: players.length })
    const result = await computeManySplits(
      players,
      { signal: abort.signal },
      (p) => setSplitProgress({ ...p }),
      // stream: light up each player's row the moment it resolves
      (s) => setSplits((prev) => new Map(prev).set(s.uuid, s)),
    )
    // Final merge as a safety net (covers anything the stream missed).
    setSplits((prev) => {
      const next = new Map(prev)
      result.forEach((v, k) => next.set(k, v))
      return next
    })
    // Only touch shared progress/abort state if THIS batch is still the current
    // one — a cancel + immediate recompute could have started a newer batch.
    if (abortRef.current === abort) {
      setSplitProgress(null)
      abortRef.current = null
    }
  }, [splitsToCompute])

  const cancelSplits = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setSplitProgress(null)
  }, [])

  // NOTE: splits are computed ONLY on the explicit "Compute splits" action
  // (SplitsBar). We deliberately do NOT auto-compute when sorting by a split
  // column: players whose computation fails (e.g. a transient API/429 error)
  // stay uncomputed, so an auto-trigger keyed on "uncomputed rows remain" would
  // re-fire forever — and the tight retry loop causes more rate-limiting, which
  // sustains the loop. On-demand compute keeps it bounded and predictable.

  // If the active sort column gets removed (column disabled, or mode-specific
  // column no longer applies), fall back to the mode's default sort instead of
  // silently ordering by a hidden column.
  useEffect(() => {
    const id = sort.columnId
    const alwaysValid = id === 'rank' || id === 'player' || id === 'tier' || id === 'elo' || id === 'country'
    const valid = alwaysValid || (id === 'recordTime' && mode === 'record') || enabledColumns.has(id)
    if (!valid) setSort(mode === 'record' ? { columnId: 'recordTime', desc: false } : { columnId: 'rank', desc: false })
  }, [enabledColumns, mode, sort.columnId, setSort])

  // ---- Sorting ------------------------------------------------------------
  const sortValue = useCallback(
    (r: PlayerRow): number | string | null => {
      const id = sort.columnId
      switch (id) {
        case 'rank':
          // mirror the '#' cell: global elo rank on the ladder, record rank on Fastest Times
          return (mode === 'record' ? r.recordRank : r.eloRank) ?? Infinity
        case 'player':
          return r.nickname.toLowerCase()
        case 'country':
          return countryName(r.country).toLowerCase()
        case 'elo':
          return r.elo
        case 'tier':
          // tier is monotonic with elo; sort by raw elo so same-tier rows still
          // order meaningfully instead of collapsing to one value (no movement)
          return r.elo
        case 'phasePoint':
          return r.phasePoint
        case 'recordTime':
          return r.recordTime ?? null
        default:
          break
      }
      if (id.startsWith('split:')) {
        const key = id.slice('split:'.length)
        return splits.get(r.uuid)?.best?.[key] ?? null
      }
      const prof = profiles.get(r.uuid)
      if (!prof) return null
      return (prof as unknown as Record<string, number | null>)[id] ?? null
    },
    [sort.columnId, mode, profiles, splits],
  )

  const sortedRows = useMemo(() => {
    const rows = [...augmentedRows]
    rows.sort((a, b) => {
      const av = sortValue(a)
      const bv = sortValue(b)
      // nulls always sort last regardless of direction
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      let cmp: number
      if (typeof av === 'string' || typeof bv === 'string') cmp = String(av).localeCompare(String(bv))
      else cmp = (av as number) - (bv as number)
      return sort.desc ? -cmp : cmp
    })
    return rows
  }, [augmentedRows, sortValue, sort.desc])

  return {
    mode,
    currentSeason,
    isLoading: mode === 'elo' ? eloQuery.isLoading : recordQuery.isLoading,
    isFetching: mode === 'elo' ? eloQuery.isFetching : recordQuery.isFetching,
    error: (mode === 'elo' ? eloQuery.error : recordQuery.error) as Error | null,
    lastUpdated,
    refetch,
    baseRows,
    rows: sortedRows,
    filteredCount: augmentedRows.length,
    totalCount: baseRows.length,
    profiles,
    profileLoading,
    needsProfile,
    splits,
    splitKeys,
    splitProgress,
    splitsToCompute: splitsToCompute.length,
    computeSplits,
    cancelSplits,
    searchState: (debouncedSearch.length < 2
      ? 'idle'
      : searchQ.isFetching
        ? 'loading'
        : searchQ.isError
          ? 'notfound'
          : searchQ.data
            ? 'found'
            : 'idle') as 'idle' | 'loading' | 'found' | 'notfound',
  }
}
