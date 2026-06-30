import { getMatch, getUserMatches } from '../api/mcsr'
import type { Match } from '../api/types'

/**
 * A "split" is the in-run timestamp (ms from run start) at which a player
 * reaches a milestone. The MCSR API exposes these as per-player timeline
 * events on each match. We compute a player's *best* (minimum) split for each
 * milestone across a sample of their fastest runs.
 */
export interface SplitDef {
  key: string
  label: string // column header
  short: string // compact label
  eventType: string // timeline event `type`
  description: string
}

export const SPLITS: SplitDef[] = [
  { key: 'nether', label: 'Nether Enter', short: 'Nether', eventType: 'story.enter_the_nether', description: 'Entered the Nether' },
  { key: 'bastion', label: 'Bastion', short: 'Bastion', eventType: 'nether.find_bastion', description: 'Found a Bastion' },
  { key: 'fortress', label: 'Fortress', short: 'Fortress', eventType: 'nether.find_fortress', description: 'Found a Fortress' },
  { key: 'blaze', label: 'First Blaze Rod', short: 'Blaze', eventType: 'nether.obtain_blaze_rod', description: 'Obtained a Blaze Rod' },
  { key: 'blind', label: 'Blind Travel', short: 'Blind', eventType: 'projectelo.timeline.blind_travel', description: 'Threw blind into the stronghold' },
  { key: 'stronghold', label: 'Eye Spy', short: 'Stronghold', eventType: 'story.follow_ender_eye', description: 'Located the stronghold' },
  { key: 'end', label: 'End Enter', short: 'End', eventType: 'story.enter_the_end', description: 'Entered the End' },
  // 'finish' is the official completion time (matches the leaderboard/record),
  // NOT the projectelo.timeline.dragon_death event — that fires ~10s earlier
  // (start of the dragon's death) and would under-report the run time.
  { key: 'finish', label: 'Finish', short: 'Finish', eventType: '__completion__', description: 'Completed the run (final time)' },
]

export const SPLIT_BY_KEY: Record<string, SplitDef> = Object.fromEntries(SPLITS.map((s) => [s.key, s]))
// Timeline-event → split key (finish is handled separately from the completion time).
const EVENT_TO_KEY: Record<string, string> = Object.fromEntries(SPLITS.filter((s) => s.eventType !== '__completion__').map((s) => [s.eventType, s.key]))

export interface PlayerSplits {
  uuid: string
  /** best (minimum) split time in ms per split key; missing key = no data */
  best: Record<string, number>
  /** the match id that produced each best split (for linking/proof) */
  source: Record<string, number>
  sampleSize: number // number of runs analysed
  computedAt: number
}

// v3: 'finish' now uses the official completion time (not the dragon_death event).
const CACHE_PREFIX = 'mcsr:splits:v3:'
const CACHE_TTL = 12 * 60 * 60 * 1000

function readCache(uuid: string): PlayerSplits | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + uuid)
    if (!raw) return undefined
    const rec = JSON.parse(raw) as PlayerSplits
    if (Date.now() - rec.computedAt > CACHE_TTL) return undefined
    return rec
  } catch {
    return undefined
  }
}

function writeCache(s: PlayerSplits) {
  try {
    localStorage.setItem(CACHE_PREFIX + s.uuid, JSON.stringify(s))
  } catch {
    /* ignore quota */
  }
}

export interface ComputeOptions {
  /** how many of the player's fastest runs to inspect (heuristic: PB splits live here) */
  topN?: number
  /** how many pages (×50) of ranked matches to scan to find those fast runs */
  pages?: number
  force?: boolean
  signal?: AbortSignal
}

export function extractSplits(match: Match, uuid: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const ev of match.timelines ?? []) {
    if (ev.uuid !== uuid) continue
    const key = EVENT_TO_KEY[ev.type]
    if (key == null) continue
    // Timelines can contain duplicate event types; keep the earliest.
    if (out[key] == null || ev.time < out[key]) out[key] = ev.time
  }
  // Finish = the official completion time (matches the leaderboard/record),
  // not the dragon_death timeline event (which is ~10s earlier).
  const completion = match.completions?.find((c) => c.uuid === uuid)?.time ?? (match.result?.uuid === uuid ? match.result?.time : undefined)
  if (completion != null && completion > 0) out.finish = completion
  return out
}

/**
 * Compute a player's best splits.
 *
 * Strategy (cheap + accurate): a player's personal-best splits almost always
 * occur inside their fastest *winning* runs. We scan their recent ranked
 * matches, take the `topN` fastest wins (where the API gives us their time
 * directly without an extra request), then fetch only those match timelines.
 */
export async function computePlayerSplits(
  identifier: string,
  uuid: string,
  opts: ComputeOptions = {},
): Promise<PlayerSplits> {
  const topN = opts.topN ?? 10
  const pages = opts.pages ?? 2

  if (!opts.force) {
    const cached = readCache(uuid)
    if (cached) return cached
  }

  // 1. Gather recent ranked matches across a few pages.
  const all: Match[] = []
  for (let p = 0; p < pages; p++) {
    if (opts.signal?.aborted) throw new DOMException('aborted', 'AbortError')
    const page = await getUserMatches(identifier, { type: 2, count: 50, page: p, excludeDecay: true })
    all.push(...page)
    if (page.length < 50) break // no more pages
  }

  // 2. Keep the player's completed *wins* (their time is `result.time`), fastest first.
  const fastWins = all
    .filter((m) => !m.forfeited && m.result?.uuid === uuid && (m.result.time ?? 0) > 0)
    .sort((a, b) => a.result.time - b.result.time)
    .slice(0, topN)

  // 3. Fetch those match timelines and fold in the best split per milestone.
  const best: Record<string, number> = {}
  const source: Record<string, number> = {}
  let analysed = 0

  for (const m of fastWins) {
    if (opts.signal?.aborted) throw new DOMException('aborted', 'AbortError')
    const detail = await getMatch(m.id)
    analysed++
    const splits = extractSplits(detail, uuid)
    for (const [k, t] of Object.entries(splits)) {
      if (best[k] == null || t < best[k]) {
        best[k] = t
        source[k] = m.id
      }
    }
  }

  const result: PlayerSplits = { uuid, best, source, sampleSize: analysed, computedAt: Date.now() }
  writeCache(result)
  return result
}

export interface BatchProgress {
  done: number
  total: number
  currentName?: string
}

/**
 * Compute splits for many players, reporting progress. Players already cached
 * resolve instantly. Designed to run over the *currently filtered* set only.
 */
export async function computeManySplits(
  players: { identifier: string; uuid: string; name: string }[],
  opts: ComputeOptions,
  onProgress: (p: BatchProgress) => void,
): Promise<Map<string, PlayerSplits>> {
  const result = new Map<string, PlayerSplits>()
  let done = 0
  onProgress({ done, total: players.length })
  for (const pl of players) {
    if (opts.signal?.aborted) break
    try {
      const s = await computePlayerSplits(pl.identifier, pl.uuid, opts)
      result.set(pl.uuid, s)
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') break
      // skip player on error, keep going
    }
    done++
    onProgress({ done, total: players.length, currentName: pl.name })
  }
  return result
}

export function getCachedSplits(uuid: string): PlayerSplits | undefined {
  return readCache(uuid)
}
