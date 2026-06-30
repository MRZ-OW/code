import { useState } from 'react'
import { avatarUrl } from '../lib/format'
import clsx from 'clsx'

export function PlayerAvatar({ uuid, name, size = 36 }: { uuid: string; name: string; size?: number }) {
  const [err, setErr] = useState(false)
  const initial = (name?.[0] ?? '?').toUpperCase()
  return (
    <div
      className={clsx('relative shrink-0 overflow-hidden rounded-md border border-line bg-surface-high')}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    >
      {!err ? (
        <img
          src={avatarUrl(uuid, size * 2)}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setErr(true)}
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-grass-300">{initial}</div>
      )}
    </div>
  )
}
