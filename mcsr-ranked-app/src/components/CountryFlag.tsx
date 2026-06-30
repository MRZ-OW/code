import { countryName, flagEmoji } from '../lib/countries'

export function CountryFlag({ code, withName = false }: { code: string | null | undefined; withName?: boolean }) {
  const flag = code ? flagEmoji(code) : '🏳️'
  const name = countryName(code)
  return (
    <span className="inline-flex items-center gap-1.5" title={name}>
      <span className="text-base leading-none">{flag}</span>
      {withName && <span className="truncate text-xs text-zinc-400">{name}</span>}
      {!withName && <span className="mono text-[11px] uppercase text-zinc-500">{code ?? '—'}</span>}
    </span>
  )
}
