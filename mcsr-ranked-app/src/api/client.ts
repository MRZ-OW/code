import type { ApiEnvelope } from './types'

const BASE = 'https://api.mcsrranked.com'
const CACHE_PREFIX = 'mcsr:v1:'

/**
 * The public API allows 500 requests / 10 min. We keep well under that with a
 * small concurrency cap + a minimum gap between request *starts*, and we cache
 * aggressively so split computation over a filtered set stays cheap on re-runs.
 */
const MAX_CONCURRENT = 6
const MIN_GAP_MS = 90

type Job<T> = {
  url: string
  resolve: (v: T) => void
  reject: (e: unknown) => void
}

let active = 0
let lastStart = 0
const queue: Job<unknown>[] = []
const inflight = new Map<string, Promise<unknown>>()

function pump() {
  if (active >= MAX_CONCURRENT || queue.length === 0) return
  const now = Date.now()
  const wait = Math.max(0, lastStart + MIN_GAP_MS - now)
  if (wait > 0) {
    setTimeout(pump, wait)
    return
  }
  const job = queue.shift()!
  active++
  lastStart = Date.now()
  runFetch(job.url)
    .then((v) => job.resolve(v))
    .catch((e) => job.reject(e))
    .finally(() => {
      active--
      pump()
    })
  // Try to start more if we still have headroom.
  pump()
}

async function runFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limited by MCSR API — slow down a little.')
    throw new Error(`Request failed (${res.status})`)
  }
  const json = (await res.json()) as ApiEnvelope<T>
  if (json.status !== 'success') throw new Error('API returned an error')
  return json.data
}

function enqueue<T>(url: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ url, resolve: resolve as (v: unknown) => void, reject })
    pump()
  })
}

// ---- Persistent cache ---------------------------------------------------

interface CacheRecord<T> {
  t: number
  d: T
}

function cacheGet<T>(key: string, ttlMs: number): T | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return undefined
    const rec = JSON.parse(raw) as CacheRecord<T>
    if (Date.now() - rec.t > ttlMs) return undefined
    return rec.d
  } catch {
    return undefined
  }
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
  const keys: { k: string; t: number }[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith(CACHE_PREFIX)) continue
    try {
      keys.push({ k, t: (JSON.parse(localStorage.getItem(k)!) as CacheRecord<unknown>).t })
    } catch {
      keys.push({ k, t: 0 })
    }
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

/**
 * GET a path under the API base, returning the unwrapped `data`.
 * Uses a persistent TTL cache and coalesces concurrent identical requests.
 */
export function apiGet<T>(path: string, ttlMs = 5 * 60 * 1000): Promise<T> {
  const url = path.startsWith('http') ? path : BASE + path
  const cached = cacheGet<T>(url, ttlMs)
  if (cached !== undefined) return Promise.resolve(cached)

  const existing = inflight.get(url)
  if (existing) return existing as Promise<T>

  const p = enqueue<T>(url)
    .then((data) => {
      cacheSet(url, data)
      return data
    })
    .finally(() => inflight.delete(url))
  inflight.set(url, p)
  return p
}

export function queueDepth() {
  return queue.length + active
}
