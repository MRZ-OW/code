import { create } from 'zustand'

export type LeaderboardMode = 'elo' | 'record'

export interface SortState {
  columnId: string
  desc: boolean
}

interface FilterState {
  mode: LeaderboardMode
  season: number | null // null = current
  search: string
  countries: Set<string> // lowercase codes; '__unknown' for null country
  tiers: Set<string> // tier keys to include; empty = all
  eloMin: number | null
  eloMax: number | null
  // columns the user has enabled (beyond the always-on base columns)
  enabledColumns: Set<string>
  sort: SortState

  setMode: (m: LeaderboardMode) => void
  setSeason: (s: number | null) => void
  setSearch: (s: string) => void
  toggleCountry: (c: string) => void
  clearCountries: () => void
  toggleTier: (t: string) => void
  setElo: (min: number | null, max: number | null) => void
  toggleColumn: (id: string) => void
  setSort: (s: SortState) => void
  reset: () => void
}

export const BASE_COLUMNS = ['rank', 'player', 'country', 'elo', 'tier'] as const

export const useFilters = create<FilterState>((set) => ({
  mode: 'elo',
  season: null,
  search: '',
  countries: new Set(),
  tiers: new Set(),
  eloMin: null,
  eloMax: null,
  enabledColumns: new Set<string>(),
  sort: { columnId: 'rank', desc: false },

  setMode: (mode) => set({ mode, sort: mode === 'record' ? { columnId: 'recordTime', desc: false } : { columnId: 'rank', desc: false } }),
  setSeason: (season) => set({ season }),
  setSearch: (search) => set({ search }),
  toggleCountry: (c) =>
    set((st) => {
      const next = new Set(st.countries)
      next.has(c) ? next.delete(c) : next.add(c)
      return { countries: next }
    }),
  clearCountries: () => set({ countries: new Set() }),
  toggleTier: (t) =>
    set((st) => {
      const next = new Set(st.tiers)
      next.has(t) ? next.delete(t) : next.add(t)
      return { tiers: next }
    }),
  setElo: (eloMin, eloMax) => set({ eloMin, eloMax }),
  toggleColumn: (id) =>
    set((st) => {
      const next = new Set(st.enabledColumns)
      next.has(id) ? next.delete(id) : next.add(id)
      return { enabledColumns: next }
    }),
  setSort: (sort) => set({ sort }),
  reset: () =>
    set({
      search: '',
      countries: new Set(),
      tiers: new Set(),
      eloMin: null,
      eloMax: null,
    }),
}))
