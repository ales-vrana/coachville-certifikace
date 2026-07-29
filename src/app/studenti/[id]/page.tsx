import Link from 'next/link'
import { notFound } from 'next/navigation'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import {
  PROGRAM_POPISKY,
  STAV_STUDENTA_POPISKY,
  formatujDatum,
} from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'
import { EditacePlanu } from './editace-planu'
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

  const { data: nahravky } = await admin
    .from('recordings')
    .select('plan_item_id, nahrano_at, puvodni_nazev, stav, pokus')
    .eq('student_id', id)
    .order('nahrano_at', { ascending: false })
  const posledniNahravka = new Map<string, NonNullable<typeof nahravky>[number]>()
  for (const n of nahravky ?? []) {
    if (!posledniNahravka.has(n.plan_item_id)) posledniNahravka.set(n.plan_item_id, n)
  }

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
      <EditacePlanu
        studentId={student.id}
        radky={(plan ?? []).map((p) => {
          const nahravka = posledniNahravka.get(p.id)
          return {
            id: p.id,
            poradi: p.poradi,
            typ: p.typ,
            faze: p.faze,
            termin: p.termin,
            stav: p.stav,
            nahravka: nahravka
              ? {
                  stav: nahravka.stav,
                  nazev: nahravka.puvodni_nazev,
                  datum: nahravka.nahrano_at.slice(0, 10),
                  pokus: nahravka.pokus,
                }
              : undefined,
          }
        })}
      />

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
