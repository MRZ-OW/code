export function EloSparkline({ values, color = '#4cc15a', height = 44 }: { values: number[]; color?: string; height?: number }) {
  const pts = values.filter((v) => Number.isFinite(v))
  if (pts.length < 2) return <div className="text-xs text-muted">Not enough phases to chart.</div>
  const w = 100
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const span = max - min || 1
  const step = w / (pts.length - 1)
  const coords = pts.map((v, i) => [i * step, height - 6 - ((v - min) / span) * (height - 12)] as const)
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${path} L${w},${height} L0,${height} Z`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-12 w-full" aria-hidden>
      <defs>
        <linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#eloFill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill={color} />
      ))}
    </svg>
  )
}
