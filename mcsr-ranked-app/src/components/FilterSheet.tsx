import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { BottomSheet } from './BottomSheet'
import { RankIcon } from './RankIcon'
import { TIERS } from '../lib/ranks'
import { useFilters } from '../store/useFilters'

interface CountryOption {
  code: string
  name: string
  flag: string
  count: number
}

export function FilterSheet({ open, onClose, countries }: { open: boolean; onClose: () => void; countries: CountryOption[] }) {
  const { tiers, toggleTier, eloMin, eloMax, setElo, countries: selCountries, toggleCountry, reset } = useFilters()
  const [countrySearch, setCountrySearch] = useState('')

  const filtered = countries.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch.toLowerCase()))

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={reset} className="btn">
            <RotateCcw size={13} /> Reset
          </button>
          <button onClick={onClose} className="btn btn-primary">
            Show results
          </button>
        </div>
      }
    >
      <Section label="Rank tier" hint="none = all tiers">
        <div className="flex flex-wrap gap-1.5">
          {TIERS.map((t) => {
            const on = tiers.has(t.key)
            return (
              <button key={t.key} onClick={() => toggleTier(t.key)} className={clsx('chip', on && 'chip-on')} style={on ? { borderColor: t.color + '88', background: t.color + '22' } : undefined}>
                <RankIcon tierKey={t.key} size={15} />
                <span style={on ? { color: t.color } : undefined}>{t.name}</span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section label="Elo range">
        <div className="flex items-center gap-2">
          <input type="number" inputMode="numeric" placeholder="min" value={eloMin ?? ''} onChange={(e) => setElo(e.target.value === '' ? null : Number(e.target.value), eloMax)} className="input" />
          <span className="text-zinc-600">–</span>
          <input type="number" inputMode="numeric" placeholder="max" value={eloMax ?? ''} onChange={(e) => setElo(eloMin, e.target.value === '' ? null : Number(e.target.value))} className="input" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {([['Netherite 2000+', 2000, null], ['Diamond+ 1500+', 1500, null], ['Emerald 1200–1499', 1200, 1499], ['below 1200', null, 1199]] as const).map(([label, lo, hi]) => (
            <button key={label} onClick={() => setElo(lo, hi)} className="chip">
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Country" hint={selCountries.size > 0 ? `${selCountries.size} selected` : undefined}>
        <input placeholder="search countries…" value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="input mb-2" />
        <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {filtered.map((c) => {
            const on = selCountries.has(c.code)
            return (
              <button key={c.code} onClick={() => toggleCountry(c.code)} className={clsx('chip', on && 'chip-on')}>
                <span className="text-sm">{c.flag}</span>
                <span className="normal-case">{c.name}</span>
                <span className="text-[10px] text-zinc-600">{c.count}</span>
              </button>
            )
          })}
          {filtered.length === 0 && <p className="font-mc text-xs text-zinc-600">no matches</p>}
        </div>
      </Section>
    </BottomSheet>
  )
}

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mc text-[11px] font-bold uppercase tracking-wider text-zinc-400">{label}</span>
        {hint && <span className="font-mc text-[10px] text-zinc-600">{hint}</span>}
      </div>
      {children}
    </section>
  )
}
