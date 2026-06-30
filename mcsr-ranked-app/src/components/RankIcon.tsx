import { TIERS, type Tier } from '../lib/ranks'

// Bespoke pixel-art emblems for each rank — drawn as the actual Minecraft items
// (coal lump, ingots, faceted gems) in the exact tier colors. Custom iconography
// like this is a deliberate craft signal, not an off-the-shelf icon set.

function darken(hex: string, f: number): string {
  const h = hex.replace('#', '')
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - f))
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - f))
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - f))
  return `rgb(${r},${g},${b})`
}

const OUTLINE = '#0b0b0b'

// pixel grids; each char maps to a colour key per shape
const INGOT = [
  '.ooooooooo..',
  'ohhhhhhhhho.',
  'obhhhhhhhso.',
  'obbbbbbbbso.',
  'obbbbbbbsso.',
  'osbbbbbssoo.',
  '.osssssssoo.',
  '..ooooooooo.',
]

const GEM = [
  '...ooooo...',
  '..ohhhho...',
  '.ohhhhhho..',
  'ohhbbbbbho.',
  'obbbbbbbbo.',
  'sobbbbbbos.',
  '.sobbbbos..',
  '..sobbos...',
  '...soos....',
  '....oo.....',
]

// coal lump: dark chunk with grey speckles (label colour stays grey #AAA)
const COAL = [
  '...ddd.....',
  '..dddddl...',
  '.dlddddmd..',
  '.dddmddddd.',
  'ldddddddmd.',
  '.dmddddldd.',
  '.dddmdddd..',
  '..ddlddd...',
  '...dddo....',
]

function gridToRects(grid: string[], palette: Record<string, string>) {
  const rects: { x: number; y: number; c: string }[] = []
  grid.forEach((row, y) =>
    row.split('').forEach((ch, x) => {
      const c = palette[ch]
      if (c) rects.push({ x, y, c })
    }),
  )
  return rects
}

export function RankIcon({ tierKey, size = 20 }: { tierKey: string; size?: number }) {
  const tier: Tier = TIERS.find((t) => t.key === tierKey) ?? TIERS[0]

  let grid: string[]
  let palette: Record<string, string>
  if (tierKey === 'coal') {
    grid = COAL
    palette = { o: OUTLINE, d: '#2b2b2e', m: '#5a5a60', l: '#8b8b93' }
  } else if (tierKey === 'emerald' || tierKey === 'diamond') {
    grid = GEM
    palette = { o: OUTLINE, h: tier.color2, b: tier.color, s: darken(tier.color, 0.4) }
  } else {
    grid = INGOT
    palette = { o: OUTLINE, h: tier.color2, b: tier.color, s: darken(tier.color, 0.35) }
  }

  const w = grid[0].length
  const h = grid.length
  const rects = gridToRects(grid, palette)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.6))' }}
      aria-hidden
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1.02} height={1.02} fill={r.c} />
      ))}
    </svg>
  )
}
