'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  obnovPolozku,
  oznacSplnenoHistoricky,
  pridejPolozku,
  zmenTermin,
  zrusPolozku,
  type VysledekAkce,
} from '@/lib/plan/akce'
import type { Faze, TypPolozky } from '@/lib/plan/typy'
import {
  FAZE_POPISKY,
  STAV_NAHRAVKY_POPISKY,
  STAV_POLOZKY_POPISKY,
  TYP_POLOZKY_POPISKY,
  formatujDatum,
} from '@/lib/popisky'

export interface RadekPlanu {
  id: string
  poradi: number
  typ: TypPolozky
  faze: Faze | null
  termin: string
  stav: string
  nahravka?: { id: string; stav: string; nazev: string | null; datum: string; pokus: number }
}

const TLACITKO_MALE =
  'rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'

export function EditacePlanu({ studentId, radky }: { studentId: string; radky: RadekPlanu[] }) {
  const router = useRouter()
  const [probiha, startTransition] = useTransition()
  const [chyba, setChyba] = useState('')
  const [terminy, setTerminy] = useState<Record<string, string>>({})
  const [novaPolozka, setNovaPolozka] = useState({
    typ: 'kratka_s_reportem' as TypPolozky,
    faze: 'acc' as Faze,
    termin: '',
  })

  function spust(akce: () => Promise<VysledekAkce>) {
    setChyba('')
    startTransition(async () => {
      const vysledek = await akce()
      if (!vysledek.ok) setChyba(vysledek.chyba ?? 'Akce se nepodařila.')
      router.refresh()
    })
  }

  return (
    <div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Fáze</th>
              <th className="px-4 py-3">Termín</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {radky.map((p) => {
              const zruseno = p.stav === 'zruseno'
              const upravitelny = ['naplanovano', 'po_terminu'].includes(p.stav)
              const zmeneny = terminy[p.id] !== undefined && terminy[p.id] !== p.termin
              return (
                <tr
                  key={p.id}
                  className={`bg-white dark:bg-zinc-950 ${zruseno ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3 text-zinc-400">{p.poradi}.</td>
                  <td className={`px-4 py-3 ${zruseno ? 'line-through' : ''}`}>
                    {TYP_POLOZKY_POPISKY[p.typ]}
                  </td>
                  <td className="px-4 py-3">{p.faze ? FAZE_POPISKY[p.faze] : '—'}</td>
                  <td className="px-4 py-3">
                    {upravitelny ? (
                      <span className="flex items-center gap-2">
                        <input
                          type="date"
                          value={terminy[p.id] ?? p.termin}
                          onChange={(e) =>
                            setTerminy((t) => ({ ...t, [p.id]: e.target.value }))
                          }
                          disabled={probiha}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        />
                        {zmeneny && (
                          <button
                            onClick={() => spust(() => zmenTermin(p.id, terminy[p.id]!))}
                            disabled={probiha}
                            className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                          >
                            Uložit
                          </button>
                        )}
                      </span>
                    ) : (
                      <span className="font-medium">{formatujDatum(p.termin)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.nahravka
                      ? STAV_NAHRAVKY_POPISKY[p.nahravka.stav]
                      : (STAV_POLOZKY_POPISKY[p.stav] ?? p.stav)}
                    {p.nahravka && (
                      <a
                        href={`/nahravka/${p.nahravka.id}`}
                        className="mt-0.5 block text-xs text-zinc-500 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        {p.nahravka.nazev ?? 'soubor'} · {formatujDatum(p.nahravka.datum)}
                        {p.nahravka.pokus > 1 ? ` · ${p.nahravka.pokus}. pokus` : ''}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex gap-1.5">
                      {upravitelny && (
                        <>
                          <button
                            title="Položka byla splněna ještě před zavedením systému (migrace)"
                            onClick={() => spust(() => oznacSplnenoHistoricky(p.id))}
                            disabled={probiha}
                            className={TLACITKO_MALE}
                          >
                            Splněno dříve
                          </button>
                          <button
                            onClick={() => spust(() => zrusPolozku(p.id))}
                            disabled={probiha}
                            className={TLACITKO_MALE}
                          >
                            Zrušit
                          </button>
                        </>
                      )}
                      {p.stav === 'splneno_historicky' && (
                        <button
                          onClick={() => spust(() => zrusPolozku(p.id))}
                          disabled={probiha}
                          className={TLACITKO_MALE}
                        >
                          Zrušit
                        </button>
                      )}
                      {zruseno && (
                        <button
                          onClick={() => spust(() => obnovPolozku(p.id))}
                          disabled={probiha}
                          className={TLACITKO_MALE}
                        >
                          Obnovit
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {chyba && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {chyba}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
        <label className="text-sm">
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">Typ</span>
          <select
            value={novaPolozka.typ}
            onChange={(e) =>
              setNovaPolozka((n) => ({ ...n, typ: e.target.value as TypPolozky }))
            }
            className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
          >
            {Object.entries(TYP_POLOZKY_POPISKY).map(([hodnota, popisek]) => (
              <option key={hodnota} value={hodnota}>
                {popisek}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">Fáze</span>
          <select
            value={novaPolozka.faze}
            onChange={(e) => setNovaPolozka((n) => ({ ...n, faze: e.target.value as Faze }))}
            className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
          >
            {Object.entries(FAZE_POPISKY).map(([hodnota, popisek]) => (
              <option key={hodnota} value={hodnota}>
                {popisek}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">Termín</span>
          <input
            type="date"
            value={novaPolozka.termin}
            onChange={(e) => setNovaPolozka((n) => ({ ...n, termin: e.target.value }))}
            className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <button
          onClick={() =>
            spust(() =>
              pridejPolozku({
                studentId,
                typ: novaPolozka.typ,
                faze: novaPolozka.faze,
                termin: novaPolozka.termin,
              }),
            )
          }
          disabled={probiha || !novaPolozka.termin}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          + Přidat položku
        </button>
      </div>
    </div>
  )
}
