import clsx from 'clsx'
import { splitParts } from '../lib/format'

/** MCSR's signature time display: big main figure + smaller decimal tail. */
export function SplitTime({
  ms,
  className,
  decimalClassName,
}: {
  ms: number | null | undefined
  className?: string
  decimalClassName?: string
}) {
  const p = splitParts(ms)
  if (!p) return <span className={clsx('font-mc text-zinc-600', className)}>—</span>
  return (
    <span className={clsx('font-mc tabular-nums', className)}>
      {p.main}
      <span className={clsx('text-[0.72em] opacity-70', decimalClassName)}>{p.decimal}</span>
    </span>
  )
}
