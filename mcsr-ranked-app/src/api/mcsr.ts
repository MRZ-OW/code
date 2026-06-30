import { apiGet } from './client'
import type {
  LeaderboardResponse,
  PhaseLeaderboardResponse,
  Match,
  RecordEntry,
  UserProfile,
} from './types'

/** Live-data freshness window: served from cache if newer, re-pulled if older (when online). */
export const FRESH_MS = 5 * 60 * 1000
const HOUR = 60 * 60 * 1000

/** Current (or a given season's) top-150 elo leaderboard. */
export function getLeaderboard(season?: number) {
  const q = season != null ? `?season=${season}` : ''
  return apiGet<LeaderboardResponse>(`/leaderboard${q}`, FRESH_MS)
}

/** Current phase (sub-season) leaderboard with phase points. */
export function getPhaseLeaderboard() {
  return apiGet<PhaseLeaderboardResponse>(`/phase-leaderboard`, FRESH_MS)
}

/** Global record (fastest completion) leaderboard. */
export function getRecordLeaderboard(season?: number) {
  const q = season != null ? `?season=${season}` : ''
  return apiGet<RecordEntry[]>(`/record-leaderboard${q}`, FRESH_MS)
}

/** Full profile for a player by uuid or nickname. */
export function getUser(identifier: string, season?: number) {
  const q = season != null ? `?season=${season}` : ''
  return apiGet<UserProfile>(`/users/${encodeURIComponent(identifier)}${q}`, FRESH_MS)
}

/**
 * A page of a player's matches.
 * type: 1=casual, 2=ranked, 3=private. count<=50, page is 0-indexed.
 */
export function getUserMatches(
  identifier: string,
  opts: { type?: number; count?: number; page?: number; excludeDecay?: boolean; sort?: 'newest' | 'oldest' | 'fastest' | 'slowest' } = {},
) {
  const params = new URLSearchParams()
  if (opts.type != null) params.set('type', String(opts.type))
  params.set('count', String(Math.min(opts.count ?? 50, 100))) // API caps at 100
  params.set('page', String(opts.page ?? 0))
  if (opts.excludeDecay) params.set('excludedecay', 'true')
  if (opts.sort) params.set('sort', opts.sort)
  // Matches lists change as players play; keep them fresh-ish but cacheable.
  return apiGet<Match[]>(`/users/${encodeURIComponent(identifier)}/matches?${params}`, FRESH_MS)
}

/** Full detail for a single match, including the per-player timeline. */
export function getMatch(id: number) {
  // Completed matches are immutable — cache them for a long time.
  return apiGet<Match>(`/matches/${id}`, 24 * HOUR)
}
