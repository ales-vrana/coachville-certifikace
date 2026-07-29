import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { FAZE_POPISKY, TYP_POLOZKY_POPISKY, formatujDatum } from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'
import { NahravaciFormular } from './nahravaci-formular'

export default async function NahratPage({
  params,
}: {
  params: Promise<{ planItemId: string }>
}) {
  const profil = await vyzadujRoli(['student', 'admin'])
  const { planItemId } = await params

  const admin = createAdminClient()
  const { data: polozka } = await admin
    .from('plan_items')
    .select('id, student_id, poradi, typ, faze, termin, stav')
    .eq('id', planItemId)
    .single()
  if (!polozka) notFound()

  if (profil.role === 'student') {
    const { data: student } = await admin
      .from('students')
      .select('profile_id')
      .eq('id', polozka.student_id)
      .single()
    if (!student || student.profile_id !== profil.id) redirect('/prehled')
  }

  const lzeNahrat = ['naplanovano', 'po_terminu'].includes(polozka.stav)

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/prehled" className="hover:underline">
          ← Zpět na přehled
        </Link>
      </nav>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Nahrát nahrávku
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {polozka.poradi}. {TYP_POLOZKY_POPISKY[polozka.typ]}
        {polozka.faze ? ` · fáze ${FAZE_POPISKY[polozka.faze]}` : ''} · termín{' '}
        {formatujDatum(polozka.termin)}
      </p>

      {lzeNahrat ? (
        <NahravaciFormular planItemId={polozka.id} />
      ) : (
        <p className="mt-8 rounded-2xl border border-zinc-200 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
          K této položce už je nahrávka odevzdaná. Pokud potřebujete něco změnit, napište Verče na{' '}
          <a className="underline" href="mailto:delivery@coachville.eu">
            delivery@coachville.eu
          </a>
          .
        </p>
      )}
    </main>
  )
}
