/* MCSR Ranked Explorer — image caching service worker.
 *
 * Player heads (and any remote icons) come from cross-origin hosts that don't
 * send CORS headers, so we can't read their bytes in JS. A service worker can
 * still cache the opaque <img> responses and serve them back offline. This is
 * transparent to the app — components keep using normal <img src> URLs.
 *
 * Strategy: cache-first with a background refresh (stale-while-revalidate) for
 * image requests only. Everything else is left to the browser untouched so the
 * app shell is never affected.
 */
const IMG_CACHE = 'mcsr-img-v1'
const IMG_HOSTS = ['mc-heads.net', 'minotar.net', 'crafatar.com', 'vzge.me']

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k.startsWith('mcsr-img-') && k !== IMG_CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

function isImageRequest(req) {
  if (req.method !== 'GET') return false
  if (req.destination === 'image') return true
  try {
    const url = new URL(req.url)
    return IMG_HOSTS.some((h) => url.hostname.endsWith(h))
  } catch {
    return false
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (!isImageRequest(req)) return // leave app shell / API / everything else alone

  event.respondWith(
    (async () => {
      const cache = await caches.open(IMG_CACHE)
      const cached = await cache.match(req)

      const network = fetch(req)
        .then((res) => {
          // Cache successful or opaque (cross-origin no-cors) image responses.
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {})
          return res
        })
        .catch(() => null)

      // Serve cache immediately if we have it; otherwise wait for the network.
      if (cached) {
        event.waitUntil(network) // refresh in the background
        return cached
      }
      const res = await network
      if (res) return res
      // Offline and uncached → let the <img> error and fall back to initials.
      return new Response('', { status: 504, statusText: 'offline-uncached' })
    })(),
  )
})
