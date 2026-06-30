import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { BottomSheet } from './BottomSheet'
import { PixelOre } from './PixelOre'
import { TIERS } from '../lib/ranks'
import { useFilters } from '../store/useFilters'

interface CountryOption {
  code: string
  name: string
  flag: string
  count: number
}

export function FilterSheet({
  open,
  onClose,
  countries,
}: {
  open: boolean
  onClose: () => void
  countries: CountryOption[]
}) {
  const { tiers, toggleTier, eloMin, eloMax, setElo, countries: selCountries, toggleCountry, reset } = useFilters()
  const [countrySearch, setCountrySearch] = useState('')

  const filteredCountries = countries.filter(
    (c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch.toLowerCase()),
  )

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex items-center justify-between">
          <button onClick={reset} className="btn">
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={onClose} className="btn btn-primary">
            Show results
          </button>
        </div>
      }
    >
      {/* Tiers */}
      <section className="mb-5">
        <SheetLabel>Rank tier</SheetLabel>
        <div className="flex flex-wrap gap-2">
          {TIERS.map((t) => {
            const active = tiers.has(t.key)
            return (
              <button
                key={t.key}
                onClick={() => toggleTier(t.key)}
                className={clsx('chip', active && 'chip-active')}
                style={active ? { borderColor: t.color + '88', background: t.soft } : undefined}
              >
                <PixelOre tierKey={t.key} size={16} />
                <span style={active ? { color: t.color } : undefined}>{t.name}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-muted">No tier selected = all tiers shown.</p>
      </section>

      {/* Elo range */}
      <section className="mb-5">
        <SheetLabel>Elo range</SheetLabel>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            value={eloMin ?? ''}
            onChange={(e) => setElo(e.target.value === '' ? null : Number(e.target.value), eloMax)}
            className="input mono"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            value={eloMax ?? ''}
            onChange={(e) => setElo(eloMin, e.target.value === '' ? null : Number(e.target.value))}
            className="input mono"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            ['2000+', 2000, null],
            ['1500+', 1500, null],
            ['1200–1500', 1200, 1499],
            ['< 1200', null, 1199],
          ].map(([label, lo, hi]) => (
            <button key={label as string} onClick={() => setElo(lo as number | null, hi as number | null)} className="chip">
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Countries */}
      <section>
        <SheetLabel>Country {selCountries.size > 0 && <span className="text-grass">· {selCountries.size}</span>}</SheetLabel>
        <input
          placeholder="Search countries…"
          value={countrySearch}
          onChange={(e) => setCountrySearch(e.target.value)}
          className="input mb-2"
        />
        <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {filteredCountries.map((c) => {
            const active = selCountries.has(c.code)
            return (
              <button key={c.code} onClick={() => toggleCountry(c.code)} className={clsx('chip', active && 'chip-active')}>
                <span className="text-sm">{c.flag}</span>
                <span>{c.name}</span>
                <span className="mono text-[10px] text-muted">{c.count}</span>
              </button>
            )
          })}
          {filteredCountries.length === 0 && <p className="text-xs text-muted">No matches.</p>}
        </div>
      </section>
    </BottomSheet>
  )
}

function SheetLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{children}</div>
}
