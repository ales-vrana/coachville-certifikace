import Link from 'next/link'
import { notFound } from 'next/navigation'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import {
  FAZE_POPISKY,
  PROGRAM_POPISKY,
  STAV_POLOZKY_POPISKY,
  STAV_STUDENTA_POPISKY,
  TYP_POLOZKY_POPISKY,
  formatujDatum,
} from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'
import { TlacitkoPoslatOdkaz } from './poslat-odkaz'

export default async function DetailStudentaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profil = await vyzadujRoli(['verca', 'meira', 'admin'])
  const { id } = await params

  const admin = createAdminClient()
  const { data: student } = await admin
    .from('students')
    .select(
      'id, program, datum_startu, cilove_datum_certifikace, stav, skupina, poznamky, profiles(jmeno, email)',
    )
    .eq('id', id)
    .single()
  if (!student) notFound()

  const { data: plan } = await admin
    .from('plan_items')
    .select('id, poradi, typ, faze, termin, stav')
    .eq('student_id', id)
    .order('poradi')

  const muzePosilatOdkaz = profil.role === 'meira' || profil.role === 'admin'

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/studenti" className="hover:underline">
          ← Studenti
        </Link>
      </nav>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {student.profiles?.jmeno}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {student.profiles?.email} · {PROGRAM_POPISKY[student.program]}
            {student.skupina ? ` · skupina ${student.skupina}` : ''}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Start {formatujDatum(student.datum_startu)}
            {student.cilove_datum_certifikace
              ? ` · cíl certifikace ${formatujDatum(student.cilove_datum_certifikace)}`
              : ''}{' '}
            · {STAV_STUDENTA_POPISKY[student.stav] ?? student.stav}
          </p>
        </div>
        {muzePosilatOdkaz && <TlacitkoPoslatOdkaz studentId={student.id} />}
      </header>

      <h2 className="mt-10 text-lg font-medium text-zinc-900 dark:text-zinc-50">
        Plán dodávek {plan?.length ? `(${plan.length} položek)` : ''}
      </h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Fáze</th>
              <th className="px-4 py-3">Termín</th>
              <th className="px-4 py-3">Stav</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {plan?.map((p) => (
              <tr key={p.id} className="bg-white dark:bg-zinc-950">
                <td className="px-4 py-3 text-zinc-400">{p.poradi}.</td>
                <td className="px-4 py-3">{TYP_POLOZKY_POPISKY[p.typ]}</td>
                <td className="px-4 py-3">{p.faze ? FAZE_POPISKY[p.faze] : '—'}</td>
                <td className="px-4 py-3 font-medium">{formatujDatum(p.termin)}</td>
                <td className="px-4 py-3">{STAV_POLOZKY_POPISKY[p.stav] ?? p.stav}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {student.poznamky && (
        <section className="mt-8">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Poznámky</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
            {student.poznamky}
          </p>
        </section>
      )}
    </main>
  )
}
