'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { oznacUhrazeno } from '@/lib/studenti/platby-akce'
import { formatujDatum } from '@/lib/popisky'

export interface Platba {
  id: string
  typ: 'dodatecny_termin_500' | 'opravna_1000'
  castkaKc: number
  stav: 'ceka' | 'uhrazeno'
  vytvoreno: string
  uhrazeno: string | null
}

const TYP_POPISKY: Record<Platba['typ'], string> = {
  dodatecny_termin_500: 'Dodatečný termín vyhodnocení (Stripe odkaz)',
  opravna_1000: 'Opravná nahrávka 2+ (hradí se mimo systém)',
}

export function PlatbySekce({ platby, muzeOznacit }: { platby: Platba[]; muzeOznacit: boolean }) {
  const router = useRouter()
  const [probiha, startTransition] = useTransition()
  const [chyba, setChyba] = useState('')

  if (!platby.length) return null

  return (
    <section className="mt-8">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Platby</h2>
      <ul className="mt-3 space-y-2">
        {platby.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
          >
            <span>
              <strong>{p.castkaKc} Kč</strong> · {TYP_POPISKY[p.typ]} ·{' '}
              {formatujDatum(p.vytvoreno.slice(0, 10))}
            </span>
            {p.stav === 'uhrazeno' ? (
              <span className="text-emerald-700 dark:text-emerald-400">
                Uhrazeno ✓ {p.uhrazeno ? formatujDatum(p.uhrazeno.slice(0, 10)) : ''}
              </span>
            ) : muzeOznacit ? (
              <button
                onClick={() => {
                  setChyba('')
                  startTransition(async () => {
                    const vysledek = await oznacUhrazeno(p.id)
                    if (!vysledek.ok) setChyba(vysledek.chyba ?? 'Nepodařilo se.')
                    router.refresh()
                  })
                }}
                disabled={probiha}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Označit uhrazeno
              </button>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">čeká na úhradu</span>
            )}
          </li>
        ))}
      </ul>
      {chyba && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{chyba}</p>}
      {muzeOznacit && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Označením úhrady poplatku 500 Kč se položka vrátí do plánu s termínem +14 dní
          (doladíte v editaci plánu výše).
        </p>
      )}
    </section>
  )
}
