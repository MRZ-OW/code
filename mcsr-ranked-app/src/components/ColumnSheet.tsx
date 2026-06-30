import clsx from 'clsx'
import { Check } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { OPTIONAL_COLUMNS, type OptionalColumn } from '../lib/columns'
import { useFilters } from '../store/useFilters'

const GROUPS = ['Performance', 'Activity', 'Splits (computed)'] as const

export function ColumnSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enabledColumns, toggleColumn } = useFilters()

  return (
    <BottomSheet open={open} onClose={onClose} title="Custom columns" footer={<button onClick={onClose} className="btn btn-primary w-full">Done</button>}>
      <p className="mb-4 font-sans text-xs leading-relaxed text-zinc-500">
        Build your own table. <span className="text-zinc-300">Performance</span> & <span className="text-zinc-300">Activity</span> pull each player's
        profile. <span className="text-[#2CE0D8]">Splits</span> are computed from the timelines of each player's fastest runs — heavier, so they run
        only for players currently in view.
      </p>

      {GROUPS.map((group) => {
        const cols = OPTIONAL_COLUMNS.filter((c) => c.group === group)
        return (
          <section key={group} className="mb-5">
            <div className="mb-2 font-mc text-[11px] font-bold uppercase tracking-wider text-zinc-400">{group}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {cols.map((c: OptionalColumn) => {
                const on = enabledColumns.has(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleColumn(c.id)}
                    className={clsx('flex items-start gap-2 rounded border p-2.5 text-left transition active:translate-y-px', on ? 'border-green-600/60 bg-green-600/10' : 'border-zinc-700 bg-zinc-800')}
                  >
                    <span className={clsx('mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border', on ? 'border-green-500 bg-green-500 text-zinc-950' : 'border-zinc-600')}>
                      {on && <Check size={11} strokeWidth={3.5} />}
                    </span>
                    <span>
                      <span className="block font-mc text-[12px] font-bold text-zinc-100">{c.label}</span>
                      <span className="mt-0.5 block font-sans text-[10px] leading-snug text-zinc-500">{c.description}</span>
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
