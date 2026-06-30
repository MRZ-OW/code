import { apiGet } from './client'
import type {
  LeaderboardResponse,
  PhaseLeaderboardResponse,
  Match,
  RecordEntry,
  UserProfile,
} from './types'

const HOUR = 60 * 60 * 1000

/** Current (or a given season's) top-150 elo leaderboard. */
export function getLeaderboard(season?: number) {
  const q = season != null ? `?season=${season}` : ''
  return apiGet<LeaderboardResponse>(`/leaderboard${q}`, 5 * 60 * 1000)
}

/** Current phase (sub-season) leaderboard with phase points. */
export function getPhaseLeaderboard() {
  return apiGet<PhaseLeaderboardResponse>(`/phase-leaderboard`, 5 * 60 * 1000)
}

/** Global record (fastest completion) leaderboard. */
export function getRecordLeaderboard(season?: number) {
  const q = season != null ? `?season=${season}` : ''
  return apiGet<RecordEntry[]>(`/record-leaderboard${q}`, 10 * 60 * 1000)
}

/** Full profile for a player by uuid or nickname. */
export function getUser(identifier: string, season?: number) {
  const q = season != null ? `?season=${season}` : ''
  return apiGet<UserProfile>(`/users/${encodeURIComponent(identifier)}${q}`, 10 * 60 * 1000)
}

/**
 * A page of a player's matches.
 * type: 1=casual, 2=ranked, 3=private. count<=50, page is 0-indexed.
 */
export function getUserMatches(
  identifier: string,
  opts: { type?: number; count?: number; page?: number; excludeDecay?: boolean } = {},
) {
  const params = new URLSearchParams()
  if (opts.type != null) params.set('type', String(opts.type))
  params.set('count', String(opts.count ?? 50))
  params.set('page', String(opts.page ?? 0))
  if (opts.excludeDecay) params.set('excludedecay', 'true')
  // Matches lists change as players play; keep them fresh-ish but cacheable.
  return apiGet<Match[]>(`/users/${encodeURIComponent(identifier)}/matches?${params}`, 10 * 60 * 1000)
}

/** Full detail for a single match, including the per-player timeline. */
export function getMatch(id: number) {
  // Completed matches are immutable — cache them for a long time.
  return apiGet<Match>(`/matches/${id}`, 24 * HOUR)
}
