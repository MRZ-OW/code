/** Format a run time in milliseconds as m:ss.mmm (e.g. 368221 -> "6:08.221"). */
export function formatTime(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  const totalSeconds = Math.floor(ms / 1000)
  const millis = ms % 1000
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
}

/** Compact run time without millis (e.g. "6:08"). */
export function formatTimeShort(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  const totalSeconds = Math.round(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Format a duration in ms as a human playtime string (e.g. "62h 11m"). */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—'
  const totalMinutes = Math.floor(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h >= 1) return `${h}h ${m}m`
  return `${m}m`
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US')
}

/** Relative time from a unix-seconds timestamp (e.g. "3d ago"). */
export function timeAgo(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) return '—'
  const diff = Date.now() / 1000 - unixSeconds
  if (diff < 60) return 'just now'
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export function winRate(wins: number | null, losses: number | null): number | null {
  if (wins == null || losses == null) return null
  const total = wins + losses
  if (total === 0) return null
  return wins / total
}

export function formatPercent(frac: number | null | undefined, digits = 0): string {
  if (frac == null || !Number.isFinite(frac)) return '—'
  return `${(frac * 100).toFixed(digits)}%`
}

/** Minecraft head avatar from a uuid via the (CORS-enabled) mc-heads service. */
export function avatarUrl(uuid: string, size = 64): string {
  return `https://mc-heads.net/avatar/${uuid}/${size}`
}
