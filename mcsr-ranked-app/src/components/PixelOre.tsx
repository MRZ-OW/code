import { TIERS, type Tier } from '../lib/ranks'

// 6×6 pixel-art "ore block" patterns — our own art, evocative of Minecraft ores.
// '#' = ore pixel (tier colour), '.' = stone base.
const PATTERNS: Record<string, string[]> = {
  coal: ['..##..', '.####.', '##..##', '#....#', '.#..#.', '..##..'],
  iron: ['.####.', '#....#', '#.##.#', '#.##.#', '#....#', '.####.'],
  gold: ['..##..', '.#..#.', '##..##', '##..##', '.#..#.', '..##..'],
  emerald: ['..#...', '.###..', '#####.', '.###.#', '..#.##', '...#..'],
  diamond: ['..#...', '.#.#..', '#...#.', '.#.#.#', '..#..#', '...#..'],
  netherite: ['######', '#....#', '#.##.#', '#.##.#', '#....#', '######'],
}

const BASE_STONE = '#3b4147'
const BASE_NETHER = '#241c22'

export function PixelOre({ tierKey, size = 22 }: { tierKey: string; size?: number }) {
  const tier: Tier = TIERS.find((t) => t.key === tierKey) ?? TIERS[0]
  const pattern = PATTERNS[tierKey] ?? PATTERNS.coal
  const base = tierKey === 'netherite' ? BASE_NETHER : BASE_STONE
  const px = 1

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 6 6"
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', filter: `drop-shadow(0 1px 1px rgba(0,0,0,0.5))` }}
      aria-hidden
    >
      <rect x="0" y="0" width="6" height="6" rx="0.6" fill={base} />
      {pattern.flatMap((row, y) =>
        row.split('').map((c, x) =>
          c === '#' ? (
            <g key={`${x}-${y}`}>
              <rect x={x} y={y} width={px} height={px} fill={tier.color} />
              {/* subtle top highlight for a beveled, blocky feel */}
              <rect x={x} y={y} width={px} height={0.34} fill="#ffffff" opacity={0.22} />
            </g>
          ) : null,
        ),
      )}
      {/* frame */}
      <rect x="0.05" y="0.05" width="5.9" height="5.9" rx="0.6" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="0.18" />
    </svg>
  )
}
