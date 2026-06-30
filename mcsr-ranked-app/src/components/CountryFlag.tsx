import { countryName, flagEmoji } from '../lib/countries'

export function CountryFlag({ code, withName = false }: { code: string | null | undefined; withName?: boolean }) {
  const flag = code ? flagEmoji(code) : '🏳️'
  const name = countryName(code)
  return (
    <span className="inline-flex items-center gap-1.5" title={name}>
      <span className="text-[15px] leading-none">{flag}</span>
      {withName ? (
        <span className="truncate font-mc text-[12px] text-zinc-400">{name}</span>
      ) : (
        <span className="font-mc text-[10px] uppercase text-zinc-600">{code ?? '—'}</span>
      )}
    </span>
  )
}
