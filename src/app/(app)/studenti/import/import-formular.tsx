'use client'

import { useActionState } from 'react'
import { importujStudenty } from '@/lib/studenti/import-akce'

export function ImportFormular() {
  const [stav, odeslat, probiha] = useActionState(importujStudenty, null)

  return (
    <form action={odeslat} className="mt-8 space-y-4">
      <textarea
        name="data"
        rows={10}
        placeholder={'Jana Nováková, jana@example.cz, 2\nPetr Svoboda, petr@example.cz, 1, květen 2025'}
        className="w-full rounded-lg border border-zinc-300 p-3 font-mono text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" name="poslat_emaily" defaultChecked className="h-4 w-4" />
        Poslat studentům uvítací e-maily s přihlašovacím odkazem
      </label>

      {stav && !stav.ok && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {stav.chyba}
        </p>
      )}

      <button
        type="submit"
        disabled={probiha}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {probiha ? 'Importuji…' : 'Importovat studenty'}
      </button>

      {stav?.ok && stav.vysledky && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">Řádek</th>
                <th className="px-3 py-2">E-mail</th>
                <th className="px-3 py-2">Výsledek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {stav.vysledky.map((v) => (
                <tr key={v.radek} className="bg-white dark:bg-zinc-950">
                  <td className="px-3 py-2 text-zinc-400">{v.radek}.</td>
                  <td className="px-3 py-2">{v.email}</td>
                  <td
                    className={`px-3 py-2 ${v.stav === 'zalozeno' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}
                  >
                    {v.stav === 'zalozeno' ? '✓ ' : '✗ '}
                    {v.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  )
}
