'use client'

import Link from 'next/link'
import { useActionState, useMemo, useState } from 'react'
import { zalozStudenta } from '@/lib/studenti/akce'
import { generujPlan } from '@/lib/plan/generator'
import type { PolozkaPlanu, Program } from '@/lib/plan/typy'
import {
  FAZE_POPISKY,
  PROGRAM_POPISKY,
  TYP_POLOZKY_POPISKY,
  formatujDatum,
} from '@/lib/popisky'

const INPUT_TRIDA =
  'mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800'

function dnesIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function FormularNovehoStudenta() {
  const [stav, odeslat, probiha] = useActionState(zalozStudenta, null)
  const [program, setProgram] = useState<Program>('acc')
  const [datumStartu, setDatumStartu] = useState(dnesIso())
  const [ciloveDatum, setCiloveDatum] = useState('')

  const nahled = useMemo<{ polozky?: PolozkaPlanu[]; chyba?: string }>(() => {
    if (!datumStartu) return {}
    try {
      return {
        polozky: generujPlan({
          program,
          datumStartu: new Date(datumStartu),
          ciloveDatumCertifikace: ciloveDatum ? new Date(ciloveDatum) : undefined,
        }),
      }
    } catch (e) {
      return { chyba: e instanceof Error ? e.message : 'Plán nejde vygenerovat.' }
    }
  }, [program, datumStartu, ciloveDatum])

  if (stav?.ok) {
    return (
      <div className="mt-8 max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950">
        <p className="font-medium text-emerald-900 dark:text-emerald-200">Student je založen ✅</p>
        {stav.varovani ? (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">⚠️ {stav.varovani}</p>
        ) : (
          <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
            Uvítací e-mail s přihlašovacím odkazem je na cestě.
          </p>
        )}
        <div className="mt-4 flex gap-3">
          <Link
            href={`/studenti/${stav.studentId}`}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Otevřít detail studenta
          </Link>
          <Link
            href="/studenti/novy"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-white dark:border-zinc-700 dark:text-zinc-300"
          >
            Založit dalšího
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <form action={odeslat} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Jméno a příjmení *
          </span>
          <input name="jmeno" required placeholder="Jana Nováková" className={INPUT_TRIDA} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">E-mail *</span>
          <input name="email" type="email" required placeholder="jana@example.cz" className={INPUT_TRIDA} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Program *</span>
          <select
            name="program"
            value={program}
            onChange={(e) => setProgram(e.target.value as Program)}
            className={INPUT_TRIDA}
          >
            {Object.entries(PROGRAM_POPISKY).map(([hodnota, popisek]) => (
              <option key={hodnota} value={hodnota}>
                {popisek}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Datum startu *
            </span>
            <input
              name="datum_startu"
              type="date"
              required
              value={datumStartu}
              onChange={(e) => setDatumStartu(e.target.value)}
              className={INPUT_TRIDA}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Cílové datum certifikace
            </span>
            <input
              name="cilove_datum"
              type="date"
              value={ciloveDatum}
              onChange={(e) => setCiloveDatum(e.target.value)}
              className={INPUT_TRIDA}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Skupina</span>
          <input name="skupina" placeholder="např. květen 2026" className={INPUT_TRIDA} />
        </label>

        {stav?.chyba && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {stav.chyba}
          </p>
        )}

        <button
          type="submit"
          disabled={probiha || !!nahled.chyba}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {probiha ? 'Zakládám…' : 'Založit studenta a poslat uvítací e-mail'}
        </button>
      </form>

      <aside>
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Náhled plánu {nahled.polozky ? `(${nahled.polozky.length} položek)` : ''}
        </h2>
        {nahled.chyba ? (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {nahled.chyba}
          </p>
        ) : nahled.polozky ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {nahled.polozky.map((p) => (
                  <tr key={p.poradi} className="bg-white dark:bg-zinc-950">
                    <td className="px-3 py-2 text-zinc-400">{p.poradi}.</td>
                    <td className="px-3 py-2">
                      {TYP_POLOZKY_POPISKY[p.typ]}
                      <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {FAZE_POPISKY[p.faze]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatujDatum(p.termin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Vyplňte datum startu — termíny se dopočítají tady.
          </p>
        )}
      </aside>
    </div>
  )
}
