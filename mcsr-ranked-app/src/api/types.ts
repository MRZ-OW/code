// Types derived from the live MCSR Ranked REST API (https://api.mcsrranked.com)

export interface ApiEnvelope<T> {
  status: 'success' | 'error'
  data: T
}

export interface SeasonInfo {
  startsAt: number
  endsAt: number
  number: number
}

export interface PhaseInfo {
  endsAt: number
  number: number
  season: number
}

/** A compact user object as it appears in leaderboards and match player lists. */
export interface UserLite {
  uuid: string
  nickname: string
  roleType: number
  eloRate: number | null
  eloRank: number | null
  country: string | null
  seasonResult?: {
    eloRate: number | null
    eloRank: number | null
    phasePoint: number
  }
}

export interface LeaderboardResponse {
  season: SeasonInfo
  users: UserLite[]
}

export interface PhaseLeaderboardResponse {
  phase: PhaseInfo
  users: UserLite[]
}

export interface RecordEntry {
  rank: number
  id: number
  season: number
  date: number
  time: number
  user: UserLite
  seed?: SeedInfo
}

export interface SeedInfo {
  id: string
  overworld?: string
  nether?: string
  endTowers?: number[]
  variations?: string[]
}

/** A category of stat that the API splits into ranked / casual buckets. */
export interface RankedCasual {
  ranked: number | null
  casual: number | null
}

export interface StatBlock {
  bestTime: RankedCasual
  highestWinStreak: RankedCasual
  currentWinStreak: RankedCasual
  playedMatches: RankedCasual
  playtime: RankedCasual
  completionTime: RankedCasual
  forfeits: RankedCasual
  completions: RankedCasual
  wins: RankedCasual
  loses: RankedCasual
}

export interface Connection {
  id: string
  name: string
}

export interface SeasonResult {
  last: { eloRate: number | null; eloRank: number | null; phasePoint: number }
  highest: number | null
  lowest: number | null
  phases: { phase: number; eloRate: number | null; eloRank: number | null; point: number }[]
}

export interface UserProfile extends UserLite {
  timestamp: number
  statistics: { season: StatBlock; total: StatBlock }
  connections: Partial<Record<'discord' | 'youtube' | 'twitch', Connection>>
  seasonResult?: SeasonResult & { eloRate: number | null; eloRank: number | null; phasePoint: number }
  weeklyRaces?: unknown
  achievements?: { display: Achievement[]; total: Achievement[] }
}

export interface Achievement {
  id: string
  date: number
  data: string[]
  level: number
  value: number | null
  goal: number | null
}

export interface MatchChange {
  uuid: string
  change: number | null
  eloRate: number | null
}

export interface TimelineEvent {
  uuid: string
  time: number
  type: string
}

export interface MatchCompletion {
  uuid: string
  time: number
}

export interface Match {
  id: number
  type: number // 1 = casual, 2 = ranked, 3 = private/event
  seed: SeedInfo | null
  category: string | null
  gameMode?: string | null
  players: UserLite[]
  spectators: UserLite[]
  result: { uuid: string | null; time: number }
  forfeited: boolean
  decayed: boolean
  rank: { season: number | null; allTime: number | null }
  changes: MatchChange[]
  completions?: MatchCompletion[]
  timelines?: TimelineEvent[]
  botSource?: string | null
  season: number
  date: number
  vod?: unknown[]
  beginner?: boolean
  tag?: string | null
  seedType?: string | null
  bastionType?: string | null
  replayExist?: boolean
}
