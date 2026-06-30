import { create } from 'zustand'

// Global navigation for the stacked overlays: a player profile and a match
// summary. Either can open the other, so this lives outside the component tree
// and is reachable from anywhere (table cells, profile rows, etc.).
interface NavState {
  player: { uuid: string; name: string } | null
  matchId: number | null
  openPlayer: (uuid: string, name: string) => void
  closePlayer: () => void
  /** Open the match summary. Pass an optional player to focus the split race on. */
  openMatch: (id: number, focusUuid?: string) => void
  closeMatch: () => void
  matchFocusUuid: string | null
}

export const useNav = create<NavState>((set) => ({
  player: null,
  matchId: null,
  matchFocusUuid: null,
  openPlayer: (uuid, name) => set({ player: { uuid, name } }),
  closePlayer: () => set({ player: null }),
  openMatch: (id, focusUuid) => set({ matchId: id, matchFocusUuid: focusUuid ?? null }),
  closeMatch: () => set({ matchId: null, matchFocusUuid: null }),
}))
