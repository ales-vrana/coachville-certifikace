import Link from 'next/link'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import {
  PROGRAM_POPISKY,
  STAV_STUDENTA_POPISKY,
  formatujDatum,
} from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function StudentiPage() {
  const profil = await vyzadujRoli(['verca', 'meira', 'admin'])
  const muzeZakladat = profil.role === 'meira' || profil.role === 'admin'

  const admin = createAdminClient()
  const { data: studenti } = await admin
    .from('students')
    .select('id, program, datum_startu, cilove_datum_certifikace, stav, skupina, profiles(jmeno, email)')
    .order('created_at', { ascending: false })

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <header className="mt-2 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Studenti</h1>
        {muzeZakladat && (
          <span className="flex gap-2">
            <Link
              href="/studenti/import"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Import (migrace)
            </Link>
            <Link
              href="/studenti/novy"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              + Založit studenta
            </Link>
          </span>
        )}
      </header>

      {!studenti?.length ? (
        <p className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Zatím tu nejsou žádní studenti.
          {muzeZakladat && ' Založte prvního tlačítkem vpravo nahoře.'}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Jméno</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Program</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">Cíl</th>
                <th className="px-4 py-3">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {studenti.map((s) => (
                <tr key={s.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/studenti/${s.id}`} className="text-zinc-900 hover:underline dark:text-zinc-50">
                      {s.profiles?.jmeno}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{s.profiles?.email}</td>
                  <td className="px-4 py-3">{PROGRAM_POPISKY[s.program]}</td>
                  <td className="px-4 py-3">{formatujDatum(s.datum_startu)}</td>
                  <td className="px-4 py-3">
                    {s.cilove_datum_certifikace ? formatujDatum(s.cilove_datum_certifikace) : '—'}
                  </td>
                  <td className="px-4 py-3">{STAV_STUDENTA_POPISKY[s.stav] ?? s.stav}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
