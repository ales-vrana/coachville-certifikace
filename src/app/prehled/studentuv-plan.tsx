import Link from 'next/link'
import {
  FAZE_POPISKY,
  PROGRAM_POPISKY,
  TYP_POLOZKY_POPISKY,
  formatujDatum,
} from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'

/** Studentův vlastní plán s termíny a stavem dodání (kap. 6: student vidí jen svůj profil). */
export async function StudentuvPlan({ profileId }: { profileId: string }) {
  const admin = createAdminClient()

  const { data: student } = await admin
    .from('students')
    .select('id, program, datum_startu, cilove_datum_certifikace')
    .eq('profile_id', profileId)
    .single()
  if (!student) return null

  const { data: polozky } = await admin
    .from('plan_items')
    .select('id, poradi, typ, faze, termin, stav')
    .eq('student_id', student.id)
    .neq('stav', 'zruseno')
    .order('poradi')
  if (!polozky?.length) return null

  const { data: nahravky } = await admin
    .from('recordings')
    .select('plan_item_id, nahrano_at, stav')
    .eq('student_id', student.id)
    .order('nahrano_at', { ascending: false })
  const posledniNahravka = new Map<string, { nahrano_at: string; stav: string }>()
  for (const n of nahravky ?? []) {
    if (!posledniNahravka.has(n.plan_item_id)) posledniNahravka.set(n.plan_item_id, n)
  }

  const dnes = new Date().toISOString().slice(0, 10)
  const hotovo = polozky.filter((p) =>
    ['nahrano', 'splneno', 'splneno_historicky'].includes(p.stav),
  ).length

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Váš plán nahrávek
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {PROGRAM_POPISKY[student.program]} · odevzdáno {hotovo} z {polozky.length}
        </p>
      </div>

      <ul className="mt-4 space-y-3">
        {polozky.map((p) => {
          const nahravka = posledniNahravka.get(p.id)
          const cekaNaDodani = ['naplanovano', 'po_terminu'].includes(p.stav)
          const poTerminu = cekaNaDodani && p.termin < dnes

          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {p.poradi}. {TYP_POLOZKY_POPISKY[p.typ]}
                  {p.faze && (
                    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {FAZE_POPISKY[p.faze]}
                    </span>
                  )}
                </p>
                <p
                  className={`mt-0.5 text-sm ${
                    poTerminu ? 'font-medium text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  Termín {formatujDatum(p.termin)}
                  {poTerminu && ' · po termínu'}
                </p>
              </div>

              {cekaNaDodani ? (
                <Link
                  href={`/nahrat/${p.id}`}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  Nahrát nahrávku
                </Link>
              ) : nahravka ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Dodáno ✓ {formatujDatum(nahravka.nahrano_at.slice(0, 10))}
                </p>
              ) : (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">Splněno ✓</p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
