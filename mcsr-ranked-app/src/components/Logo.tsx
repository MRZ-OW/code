// Small pixel-art pickaxe brand mark (our own), rendered in the MCSR green.
const PICK = [
  '....ppppp.',
  '...p....pp',
  '..p..pp..p',
  '.p..p.....',
  '...pp.....',
  '...p......',
  '..p.......',
  '.p........',
  'p.........',
]

export function Logo({ size = 22, color = '#22c55e' }: { size?: number; color?: string }) {
  const w = PICK[0].length
  const h = PICK.length
  return (
    <svg width={size} height={size} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' }} aria-hidden>
      {PICK.flatMap((row, y) =>
        row.split('').map((c, x) =>
          c === 'p' ? <rect key={`${x}-${y}`} x={x} y={y} width={1.04} height={1.04} fill={color} /> : null,
        ),
      )}
    </svg>
  )
}
