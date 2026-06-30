import { headUrl } from './format'

// Warm the image cache (via the service worker) for every player's head so they
// remain visible offline — not just the rows that happened to scroll into view.
// Throttled in small batches so it never competes with the initial render.

const requested = new Set<string>()

/** Size must match what PlayerAvatar requests for the table (size 26 → 52px). */
const TABLE_HEAD_PX = 52

export function prefetchHeads(uuids: string[], size = TABLE_HEAD_PX) {
  if (typeof Image === 'undefined') return
  const todo = uuids.filter((u) => u && !requested.has(u))
  if (todo.length === 0) return

  const BATCH = 8
  const GAP_MS = 150
  let i = 0

  const runBatch = () => {
    if (i >= todo.length) return
    const slice = todo.slice(i, i + BATCH)
    i += BATCH
    let pending = slice.length
    const onDone = () => {
      if (--pending <= 0) setTimeout(runBatch, GAP_MS)
    }
    for (const u of slice) {
      requested.add(u)
      const img = new Image()
      img.onload = onDone
      img.onerror = onDone
      img.src = headUrl(u, size)
    }
  }
  runBatch()
}
