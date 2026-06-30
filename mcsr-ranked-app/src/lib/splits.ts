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

type Acc = { best: Record<string, number>; source: Record<string, number> }

function foldSplits(acc: Acc, splits: Record<string, number>, matchId: number) {
  for (const [k, t] of Object.entries(splits)) {
    if (acc.best[k] == null || t < acc.best[k]) {
      acc.best[k] = t
      acc.source[k] = matchId
    }
  }
}

/** The match ids of a player's `topN` fastest winning ranked runs (one list request). */
async function fastestWinIds(identifier: string, uuid: string, topN: number): Promise<number[]> {
  // sort=fastest returns the player's runs fastest-first server-side (one request,
  // no "the PB is on page 3" blind spot). Keep only their own completed wins.
  const page = await getUserMatches(identifier, { type: 2, count: 100, sort: 'fastest', excludeDecay: true })
  return page
    .filter((m) => !m.forfeited && m.result?.uuid === uuid && (m.result.time ?? 0) > 0)
    .slice(0, topN)
    .map((m) => m.id)
}

/**
 * Compute a player's best splits (single-player path, e.g. the profile drawer).
 * Cheap: one fastest-list request + a few match-detail fetches. Each match
 * detail also carries the opponent's timeline, but here we only need this player.
 */
export async function computePlayerSplits(identifier: string, uuid: string, opts: ComputeOptions = {}): Promise<PlayerSplits> {
  const topN = opts.topN ?? 4
  if (!opts.force) {
    const cached = readCache(uuid)
    if (cached) return cached
  }
  const ids = await fastestWinIds(identifier, uuid, topN)
  const acc: Acc = { best: {}, source: {} }
  let analysed = 0
  for (const id of ids) {
    if (opts.signal?.aborted) throw new DOMException('aborted', 'AbortError')
    try {
      const detail = await getMatch(id)
      foldSplits(acc, extractSplits(detail, uuid), id)
      analysed++
    } catch {
      /* skip a failed match */
    }
  }
  const result: PlayerSplits = { uuid, best: acc.best, source: acc.source, sampleSize: analysed, computedAt: Date.now() }
  writeCache(result)
  return result
}

export interface BatchProgress {
  done: number
  total: number
  currentName?: string
}

/**
 * Compute splits for many players, FAST.
 *
 * Optimisations vs the naive per-player loop:
 *  - one `sort=fastest` list request per player (not 2 pages), topN=3 details.
 *  - a single shared accumulator: every fetched match detail carries BOTH
 *    players' timelines, so we fold splits for EVERY target player present in a
 *    match — opponents get covered "for free", and because best = MIN over
 *    observed runs, folding more runs is always correct.
 *  - the request queue de-dupes concurrent identical match fetches and caches
 *    details 24h, so shared games are fetched once.
 *  - results stream out via `onPlayer` the moment each player resolves.
 * Players are processed in input (elo) order so high-overlap top players run
 * first and pre-cover everyone else.
 */
export async function computeManySplits(
  players: { identifier: string; uuid: string; name: string }[],
  opts: ComputeOptions,
  onProgress: (p: BatchProgress) => void,
  onPlayer?: (s: PlayerSplits) => void,
): Promise<Map<string, PlayerSplits>> {
  const topN = opts.topN ?? 3
  const total = players.length
  const result = new Map<string, PlayerSplits>()
  const targets = new Set(players.map((p) => p.uuid))
  const acc = new Map<string, Acc>(players.map((p) => [p.uuid, { best: {}, source: {} }]))
  let done = 0
  onProgress({ done, total })

  const finalize = (p: { uuid: string; name: string }, analysed: number) => {
    const a = acc.get(p.uuid)!
    const ps: PlayerSplits = { uuid: p.uuid, best: a.best, source: a.source, sampleSize: analysed, computedAt: Date.now() }
    writeCache(ps)
    result.set(p.uuid, ps)
    onPlayer?.(ps)
    done++
    onProgress({ done, total, currentName: p.name })
  }

  // Serve fresh-cached players instantly; only the rest need network work.
  const toFetch: typeof players = []
  for (const p of players) {
    if (!opts.force) {
      const cached = readCache(p.uuid)
      if (cached) {
        // seed the accumulator with cached bests so opponents can still benefit
        foldSplits(acc.get(p.uuid)!, cached.best, 0)
        Object.assign(acc.get(p.uuid)!.source, cached.source)
        result.set(p.uuid, cached)
        onPlayer?.(cached)
        done++
        onProgress({ done, total, currentName: p.name })
        continue
      }
    }
    toFetch.push(p)
  }

  // Process players concurrently (the queue caps real concurrency). Each player:
  // fetch their fastest-win ids, fetch those match details, fold ALL target
  // players present in each match, then finalize this player.
  await Promise.all(
    toFetch.map(async (p) => {
      if (opts.signal?.aborted) return
      let ids: number[] = []
      try {
        ids = await fastestWinIds(p.identifier, p.uuid, topN)
      } catch {
        /* no list → finalize with whatever opponents contributed */
      }
      let analysed = 0
      await Promise.all(
        ids.map(async (id) => {
          if (opts.signal?.aborted) return
          try {
            const detail = await getMatch(id)
            analysed++
            for (const pl of detail.players ?? []) {
              if (!targets.has(pl.uuid)) continue
              foldSplits(acc.get(pl.uuid)!, extractSplits(detail, pl.uuid), id)
            }
          } catch {
            /* skip a failed match */
          }
        }),
      )
      if (opts.signal?.aborted) return
      finalize(p, analysed)
    }),
  )
  return result
}

export function getCachedSplits(uuid: string): PlayerSplits | undefined {
  return readCache(uuid)
}
