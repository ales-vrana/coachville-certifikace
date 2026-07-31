import Link from 'next/link'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { TYP_POLOZKY_POPISKY, formatujDatum } from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'
import { PrirazeniRadek } from './prirazeni-radek'

export default async function FrontaPage() {
  await vyzadujRoli(['verca', 'admin'])
  const admin = createAdminClient()

  const nactiFrontu = async (stav: 'ceka_na_mentora' | 'ceka_na_schvaleni') => {
    const { data } = await admin
      .from('recordings')
      .select('id, nahrano_at, student_id, plan_item_id')
      .eq('stav', stav)
      .order('nahrano_at')
    return data ?? []
  }

  const [dlouhe, kratke] = await Promise.all([
    nactiFrontu('ceka_na_mentora'),
    nactiFrontu('ceka_na_schvaleni'),
  ])

  const studentIds = [...new Set([...dlouhe, ...kratke].map((n) => n.student_id))]
  const { data: studenti } = studentIds.length
    ? await admin.from('students').select('id, profiles(jmeno)').in('id', studentIds)
    : { data: [] }
  const jmenaStudentu = new Map((studenti ?? []).map((s) => [s.id, s.profiles?.jmeno ?? '—']))

  const polozkaIds = [...dlouhe, ...kratke].map((n) => n.plan_item_id)
  const { data: polozky } = polozkaIds.length
    ? await admin.from('plan_items').select('id, poradi, typ').in('id', polozkaIds)
    : { data: [] }
  const popisyPolozek = new Map(
    (polozky ?? []).map((p) => [p.id, `${p.poradi}. ${TYP_POLOZKY_POPISKY[p.typ]}`]),
  )

  const { data: schuzky } = await admin
    .from('meetings')
    .select('recording_id, mentor_id, stav, termin')
    .neq('stav', 'zrusena')
  const schuzkaProNahravku = new Map((schuzky ?? []).map((s) => [s.recording_id, s]))

  const { data: mentori } = await admin
    .from('mentors')
    .select('id, aktivni, profiles(jmeno)')
    .eq('aktivni', true)
  const aktivniSchuzky = new Map<string, number>()
  for (const s of schuzky ?? []) {
    if (s.stav !== 'dokoncena') {
      aktivniSchuzky.set(s.mentor_id, (aktivniSchuzky.get(s.mentor_id) ?? 0) + 1)
    }
  }
  const mentorVolby = (mentori ?? []).map((m) => ({
    id: m.id,
    popisek: `${m.profiles?.jmeno ?? '—'} (${aktivniSchuzky.get(m.id) ?? 0} rozprac.)`,
  }))
  const jmenaMentoru = new Map((mentori ?? []).map((m) => [m.id, m.profiles?.jmeno ?? '—']))

  const neprirazene = dlouhe.filter((n) => !schuzkaProNahravku.has(n.id))
  const bezTerminu = dlouhe.filter((n) => schuzkaProNahravku.get(n.id)?.stav === 'bez_terminu')

  // semafor neplničů (kap. 6): položky po termínu podle skluzu
  const dnes = new Date().toISOString().slice(0, 10)
  const { data: poTerminu } = await admin
    .from('plan_items')
    .select('id, poradi, typ, termin, stav, student_id')
    .in('stav', ['naplanovano', 'po_terminu', 'ceka_na_poplatek'])
    .lt('termin', dnes)
    .order('termin')
  const neplniciIds = [...new Set((poTerminu ?? []).map((p) => p.student_id))]
  const { data: neplniciStudenti } = neplniciIds.length
    ? await admin.from('students').select('id, profiles(jmeno)').in('id', neplniciIds)
    : { data: [] }
  const jmenaNeplnicu = new Map(
    (neplniciStudenti ?? []).map((s) => [s.id, s.profiles?.jmeno ?? '—']),
  )
  const dniPoTerminu = (termin: string) =>
    Math.floor((Date.parse(dnes) - Date.parse(termin)) / 86_400_000)

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Fronty a semafor
      </h1>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Dlouhé čekající na přiřazení mentora ({neprirazene.length})
        </h2>
        {neprirazene.length ? (
          <ul className="mt-3 space-y-3">
            {neprirazene.map((n) => (
              <PrirazeniRadek
                key={n.id}
                recordingId={n.id}
                student={jmenaStudentu.get(n.student_id) ?? '—'}
                polozka={popisyPolozek.get(n.plan_item_id) ?? 'položka'}
                nahrano={formatujDatum(n.nahrano_at.slice(0, 10))}
                mentori={mentorVolby}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Nic nečeká. 🎉
          </p>
        )}

        {bezTerminu.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Přiřazené, čeká se na termín schůzky ({bezTerminu.length})
            </h3>
            <ul className="mt-2 space-y-2">
              {bezTerminu.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
                >
                  <span>
                    <Link href={`/nahravka/${n.id}`} className="font-medium hover:underline">
                      {jmenaStudentu.get(n.student_id)}
                    </Link>{' '}
                    · {popisyPolozek.get(n.plan_item_id)} · mentor{' '}
                    {jmenaMentoru.get(schuzkaProNahravku.get(n.id)!.mentor_id) ?? '—'}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    termín zadá mentor nebo Verča na detailu
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Krátké reporty ke schválení ({kratke.length})
        </h2>
        {kratke.length ? (
          <ul className="mt-3 space-y-2">
            {kratke.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
              >
                <span>
                  <span className="font-medium">{jmenaStudentu.get(n.student_id)}</span> ·{' '}
                  {popisyPolozek.get(n.plan_item_id)} · nahráno{' '}
                  {formatujDatum(n.nahrano_at.slice(0, 10))}
                </span>
                <Link
                  href={`/nahravka/${n.id}`}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Zkontrolovat a schválit
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Nic nečeká. 🎉
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Semafor neplničů ({(poTerminu ?? []).length})
        </h2>
        {poTerminu?.length ? (
          <ul className="mt-3 space-y-2">
            {poTerminu.map((p) => {
              const dni = dniPoTerminu(p.termin)
              const barva =
                p.stav === 'ceka_na_poplatek' || dni >= 14
                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                  : dni >= 7
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
                >
                  <span>
                    <Link
                      href={`/studenti/${p.student_id}`}
                      className="font-medium hover:underline"
                    >
                      {jmenaNeplnicu.get(p.student_id)}
                    </Link>{' '}
                    · {p.poradi}. {TYP_POLOZKY_POPISKY[p.typ]} · termín {formatujDatum(p.termin)}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${barva}`}>
                    {p.stav === 'ceka_na_poplatek' ? `čeká na poplatek · ${dni} dní` : `${dni} dní po termínu`}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Všichni plní. 🟢
          </p>
        )}
      </section>
    </main>
  )
}
