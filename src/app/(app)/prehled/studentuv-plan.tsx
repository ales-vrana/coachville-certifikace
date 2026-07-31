import Link from 'next/link'
import {
  FAZE_POPISKY,
  PROGRAM_POPISKY,
  TYP_POLOZKY_POPISKY,
  formatujDatum,
} from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'
import { PotvrditNavrh } from './potvrdit-navrh'

/** Studentův vlastní plán s termíny a stavem dodání (kap. 6: student vidí jen svůj profil). */
export async function StudentuvPlan({ profileId }: { profileId: string }) {
  const admin = createAdminClient()

  const { data: student } = await admin
    .from('students')
    .select('id, program, datum_startu, plan_navrh_odeslan_at, plan_potvrzen_at')
    .eq('profile_id', profileId)
    .single()
  if (!student) return null

  const { data: polozky } = await admin
    .from('plan_items')
    .select('id, poradi, typ, faze, termin, stav')
    .eq('student_id', student.id)
    .neq('stav', 'zruseno')
    .order('poradi')

  // Plán ještě nebyl navržen — Veronika ho domluví telefonátem.
  if (!polozky?.length) {
    return (
      <section className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Váš plán nahrávek</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Plán termínů se právě připravuje. Veronika se s vámi domluví na délce studia a poté vám
          e-mailem přijde návrh termínů, který jedním kliknutím potvrdíte — tím se stane závazným.
        </p>
      </section>
    )
  }

  // Návrh odeslán, ale student ho ještě nepotvrdil — jen výpis termínů a potvrzení.
  if (!student.plan_potvrzen_at) {
    return (
      <section className="mt-10">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Návrh plánu nahrávek — čeká na vaše potvrzení
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Tyto termíny vám přišly i e-mailem. Potvrdit je můžete tlačítkem v e-mailu, nebo rovnou
          tady. Potvrzením je plán stanoven napevno — nahrávat půjde až potom. Pokud vám termíny
          nevyhovují, ozvěte se Veronice a pošle vám nový návrh.
        </p>
        <ul className="mt-4 space-y-2">
          {polozky.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-baseline justify-between gap-3 rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="mr-2 text-zinc-400">{p.poradi}.</span>
                {TYP_POLOZKY_POPISKY[p.typ]}
                {p.faze && (
                  <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {FAZE_POPISKY[p.faze]}
                  </span>
                )}
              </p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {formatujDatum(p.termin)}
              </p>
            </li>
          ))}
        </ul>
        <PotvrditNavrh />
      </section>
    )
  }

  const { data: nahravky } = await admin
    .from('recordings')
    .select('id, plan_item_id, nahrano_at, stav')
    .eq('student_id', student.id)
    .order('nahrano_at', { ascending: false })
  const posledniNahravka = new Map<string, { id: string; nahrano_at: string; stav: string }>()
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
                <div className="text-right">
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    Dodáno ✓ {formatujDatum(nahravka.nahrano_at.slice(0, 10))}
                  </p>
                  <Link
                    href={`/nahravka/${nahravka.id}`}
                    className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Nahrávka, transkript a vyhodnocení
                  </Link>
                </div>
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
