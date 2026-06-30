import type { ApiEnvelope } from './types'

const BASE = 'https://api.mcsrranked.com'
const CACHE_PREFIX = 'mcsr:v1:'

/**
 * The public API allows 500 requests per sliding 10-min window (header
 * `ratelimit: "500-in-10min"; r=<remaining>; t=<reset-seconds>`). Bursts are
 * allowed, so rather than a fixed slow drip we BURST while the window has budget
 * and back off as it runs low — using the server's own remaining/reset counter.
 * Aggressive caching keeps re-runs nearly free.
 */
const MAX_CONCURRENT = 12
const RESERVE = 40 // keep this much budget for live board/profile refreshes
const COLD_GAP_MS = 90 // conservative pacing until we've seen a ratelimit header

type Job<T> = {
  url: string
  resolve: (v: T) => void
  reject: (e: unknown) => void
  tries: number
}

let active = 0
let lastStart = 0
const queue: Job<unknown>[] = []
const inflight = new Map<string, Promise<unknown>>()

// Server-truth rate-limit budget, updated from response headers.
const budget = { remaining: 500, resetAt: 0, known: false }
let pausedUntil = 0

export function getBudget() {
  return { remaining: budget.remaining, resetInSeconds: Math.max(0, Math.round((budget.resetAt - Date.now()) / 1000)), known: budget.known }
}

function updateBudgetFromHeaders(headers: Headers) {
  // ratelimit: "500-in-10min"; r=498; t=529
  const h = headers.get('ratelimit')
  if (!h) return
  const r = /(?:^|[;,\s])r=(\d+)/.exec(h)
  const t = /(?:^|[;,\s])t=(\d+)/.exec(h)
  if (r) budget.remaining = Number(r[1])
  if (t) budget.resetAt = Date.now() + Number(t[1]) * 1000
  budget.known = true
}

function nextDelay(): number {
  const now = Date.now()
  if (pausedUntil > now) return pausedUntil - now
  if (!budget.known) return Math.max(0, lastStart + COLD_GAP_MS - now) // pace until we know the budget
  if (budget.remaining > RESERVE) return 0 // plenty of budget → burst at full concurrency
  // low on budget: wait for the window to reset, then resume
  return Math.max(250, budget.resetAt - now + 250)
}

function pump() {
  if (active >= MAX_CONCURRENT || queue.length === 0) return
  const wait = nextDelay()
  if (wait > 0) {
    setTimeout(pump, wait)
    return
  }
  const job = queue.shift()!
  active++
  lastStart = Date.now()
  if (budget.known) budget.remaining = Math.max(0, budget.remaining - 1) // optimistic decrement; corrected by headers
  runFetch(job.url)
    .then((v) => job.resolve(v))
    .catch((e) => {
      // On 429, pause until the window resets and retry the job a few times
      // (so a momentary exhaustion is a brief stall, not a silent data hole).
      if ((e as RateLimitError)?.is429 && job.tries < 4) {
        pausedUntil = (e as RateLimitError).retryAt
        budget.remaining = 0
        job.tries++
        queue.unshift(job)
      } else {
        job.reject(e)
      }
    })
    .finally(() => {
      active--
      pump()
    })
  pump() // start more while we still have headroom
}

interface RateLimitError extends Error {
  is429: true
  retryAt: number
}

async function runFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  updateBudgetFromHeaders(res.headers)
  if (!res.ok) {
    if (res.status === 429) {
      const retry = Number(res.headers.get('retry-after')) || 30
      budget.remaining = 0
      budget.resetAt = Date.now() + retry * 1000
      const err = new Error('Rate limited by MCSR API') as RateLimitError
      err.is429 = true
      err.retryAt = budget.resetAt
      throw err
    }
    throw new Error(`Request failed (${res.status})`)
  }
  const json = (await res.json()) as ApiEnvelope<T>
  if (json.status !== 'success') throw new Error('API returned an error')
  return json.data
}

function enqueue<T>(url: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ url, resolve: resolve as (v: unknown) => void, reject, tries: 0 })
    pump()
  })
}

// ---- Persistent cache ---------------------------------------------------

interface CacheRecord<T> {
  t: number
  d: T
}

function readRecord<T>(key: string): CacheRecord<T> | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return undefined
    return JSON.parse(raw) as CacheRecord<T>
  } catch {
    return undefined
  }
}

function cacheGet<T>(key: string, ttlMs: number): T | undefined {
  const rec = readRecord<T>(key)
  if (!rec) return undefined
  if (Date.now() - rec.t > ttlMs) return undefined
  return rec.d
}

/** Return cached data regardless of age (for offline fallback). */
function cacheGetStale<T>(key: string): T | undefined {
  return readRecord<T>(key)?.d
}

function cacheSet<T>(key: string, data: T) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), d: data } satisfies CacheRecord<T>))
  } catch {
    // Storage full — evict oldest MCSR entries and retry once.
    pruneCache(40)
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), d: data }))
    } catch {
      /* give up silently; in-memory React Query cache still serves the session */
    }
  }
}

function pruneCache(count: number) {
  // Evict the oldest entries across ALL app-owned caches (request cache
  // `mcsr:v1:` *and* the larger splits cache `mcsr:splits:`), so a full store can
  // actually be reclaimed regardless of which cache is holding the space.
  const keys: { k: string; t: number }[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith('mcsr:')) continue
    let t = 0
    try {
      const rec = JSON.parse(localStorage.getItem(k)!) as { t?: number; computedAt?: number }
      t = rec.t ?? rec.computedAt ?? 0
    } catch {
      t = 0
    }
    keys.push({ k, t })
  }
  keys.sort((a, b) => a.t - b.t)
  keys.slice(0, count).forEach((e) => localStorage.removeItem(e.k))
}

export function clearApiCache() {
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(CACHE_PREFIX)) toRemove.push(k)
  }
  toRemove.forEach((k) => localStorage.removeItem(k))
}

function resolveUrl(path: string): string {
  return path.startsWith('http') ? path : BASE + path
}

/**
 * GET a path under the API base, returning the unwrapped `data`.
 *
 * Caching strategy (offline-first):
 *  - within `ttlMs` → serve the cached copy instantly, no network.
 *  - stale/missing → revalidate over the network; on success update the cache.
 *  - network fails (offline) → fall back to ANY cached copy regardless of age,
 *    so the last-loaded data stays filterable/sortable offline. Only throws if
 *    there is nothing cached at all.
 */
export function apiGet<T>(path: string, ttlMs = 5 * 60 * 1000): Promise<T> {
  const url = resolveUrl(path)
  const cached = cacheGet<T>(url, ttlMs)
  if (cached !== undefined) return Promise.resolve(cached)

  const existing = inflight.get(url)
  if (existing) return existing as Promise<T>

  const p = enqueue<T>(url)
    .then((data) => {
      cacheSet(url, data)
      return data
    })
    .catch((err) => {
      const stale = cacheGetStale<T>(url)
      if (stale !== undefined) return stale // offline → serve last-known data
      throw err
    })
    .finally(() => inflight.delete(url))
  inflight.set(url, p)
  return p
}

/** Timestamp (ms) the given path was last successfully cached, if ever. */
export function cachedAt(path: string): number | undefined {
  return readRecord(resolveUrl(path))?.t
}

/** Whether any cached copy of the given path exists (any age). */
export function hasCached(path: string): boolean {
  return readRecord(resolveUrl(path)) !== undefined
}

export function queueDepth() {
  return queue.length + active
}
