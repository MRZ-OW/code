import clsx from 'clsx'
import { User, Zap, Pickaxe, Check } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { OPTIONAL_COLUMNS, type OptionalColumn } from '../lib/columns'
import { useFilters } from '../store/useFilters'

const GROUP_META: Record<OptionalColumn['group'], { icon: React.ReactNode; note: string }> = {
  Performance: { icon: <Zap size={13} />, note: '' },
  Activity: { icon: <User size={13} />, note: '' },
  'Splits (computed)': { icon: <Pickaxe size={13} />, note: 'Computed on demand from each player’s fastest runs.' },
}

export function ColumnSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enabledColumns, toggleColumn } = useFilters()

  const groups = ['Performance', 'Activity', 'Splits (computed)'] as const

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Custom columns"
      footer={
        <button onClick={onClose} className="btn btn-primary w-full">
          Done
        </button>
      }
    >
      <p className="mb-4 text-xs leading-relaxed text-muted">
        Add columns to build your own data table. <span className="text-zinc-300">Performance</span> &{' '}
        <span className="text-zinc-300">Activity</span> fetch each player’s profile. <span className="text-diamond">Splits</span> are
        calculated from timeline data of each player’s fastest runs — heavier, so they run only for the players currently in view.
      </p>

      {groups.map((group) => {
        const cols = OPTIONAL_COLUMNS.filter((c) => c.group === group)
        return (
          <section key={group} className="mb-5">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {GROUP_META[group].icon}
              {group}
            </div>
            {GROUP_META[group].note && <p className="mb-2 text-[11px] text-muted">{GROUP_META[group].note}</p>}
            <div className="grid grid-cols-2 gap-2">
              {cols.map((c) => {
                const active = enabledColumns.has(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleColumn(c.id)}
                    className={clsx(
                      'flex items-start gap-2 rounded-xl border p-2.5 text-left transition active:scale-[0.98]',
                      active ? 'border-grass/60 bg-grass/10' : 'border-line bg-surface-raised',
                    )}
                  >
                    <span
                      className={clsx(
                        'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border',
                        active ? 'border-grass bg-grass text-ink-900' : 'border-line',
                      )}
                    >
                      {active && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block text-xs font-semibold text-zinc-100">{c.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-muted">{c.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </BottomSheet>
  )
}
