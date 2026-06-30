import { useState } from 'react'
import clsx from 'clsx'
import { headUrl, avatarUrl, minotarUrl } from '../lib/format'

/**
 * Real Minecraft head. Tries the 3D isometric render first (like the MCSR site),
 * then falls back to the flat avatar, then a different provider, then initials.
 */
export function PlayerAvatar({ uuid, name, size = 36, flat = false }: { uuid: string; name: string; size?: number; flat?: boolean }) {
  const [stage, setStage] = useState(0)
  const px = Math.round(size * 2)
  const sources = flat ? [avatarUrl(uuid, px), minotarUrl(uuid, px)] : [headUrl(uuid, px), avatarUrl(uuid, px), minotarUrl(uuid, px)]

  if (stage >= sources.length) {
    return (
      <div className="slot flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
        <span className="font-mc text-zinc-500" style={{ fontSize: size * 0.42 }}>
          {(name?.[0] ?? '?').toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <img
      src={sources[stage]}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setStage((s) => s + 1)}
      className={clsx('pixel shrink-0 select-none')}
      style={{ width: size, height: size, display: 'block' }}
    />
  )
}
