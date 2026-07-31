'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { zalozStudenta } from '@/lib/studenti/akce'
import type { Program } from '@/lib/plan/typy'
import { PROGRAM_POPISKY } from '@/lib/popisky'

const INPUT_TRIDA =
  'mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800'

function dnesIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function FormularNovehoStudenta() {
  const [stav, odeslat, probiha] = useActionState(zalozStudenta, null)
  const [program, setProgram] = useState<Program>('acc')

  if (stav?.ok) {
    return (
      <div className="mt-8 max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950">
        <p className="font-medium text-emerald-900 dark:text-emerald-200">Student je založen ✅</p>
        {stav.varovani ? (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">⚠️ {stav.varovani}</p>
        ) : (
          <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
            Uvítací e-mail s přihlašovacím odkazem je na cestě. Plán termínů vznikne, až Veronika
            se studentem domluví délku studia — návrh mu pošle z detailu studenta.
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
    <div className="mt-8 max-w-xl">
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
              defaultValue={dnesIso()}
              className={INPUT_TRIDA}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Skupina</span>
            <input name="skupina" placeholder="např. květen 2026" className={INPUT_TRIDA} />
          </label>
        </div>

        <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          Plán termínů se při založení nevytváří. Domluví ho Veronika telefonátem se studentem —
          na detailu studenta pak zadá délku studia a pošle návrh, který student potvrdí e-mailem.
        </p>

        {stav?.chyba && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {stav.chyba}
          </p>
        )}

        <button
          type="submit"
          disabled={probiha}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {probiha ? 'Zakládám…' : 'Založit studenta a poslat uvítací e-mail'}
        </button>
      </form>
    </div>
  )
}
