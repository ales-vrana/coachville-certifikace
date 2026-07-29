import Link from 'next/link'
import { TYP_POLOZKY_POPISKY, formatujDatum } from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'

/** Mentor vidí jen jemu přiřazené nahrávky + historii schůzek (kap. 6). */
export async function MentoruvPrehled({ profileId }: { profileId: string }) {
  const admin = createAdminClient()

  const { data: mentor } = await admin
    .from('mentors')
    .select('id')
    .eq('profile_id', profileId)
    .single()
  if (!mentor) return null

  const { data: schuzky } = await admin
    .from('meetings')
    .select('id, recording_id, termin, stav, dokonceno_odeslano_at')
    .eq('mentor_id', mentor.id)
    .neq('stav', 'zrusena')
    .order('created_at', { ascending: false })
  if (!schuzky?.length) {
    return (
      <section className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Zatím vám nebyla přiřazena žádná nahrávka. Jakmile se to stane, přijde vám e-mail a
          nahrávka se objeví tady.
        </p>
      </section>
    )
  }

  const recordingIds = schuzky.map((s) => s.recording_id)
  const { data: nahravky } = await admin
    .from('recordings')
    .select('id, student_id, plan_item_id, stav')
    .in('id', recordingIds)
  const nahravkaMap = new Map((nahravky ?? []).map((n) => [n.id, n]))

  const studentIds = [...new Set((nahravky ?? []).map((n) => n.student_id))]
  const { data: studenti } = studentIds.length
    ? await admin.from('students').select('id, profiles(jmeno)').in('id', studentIds)
    : { data: [] }
  const jmena = new Map((studenti ?? []).map((s) => [s.id, s.profiles?.jmeno ?? '—']))

  const polozkaIds = (nahravky ?? []).map((n) => n.plan_item_id)
  const { data: polozky } = polozkaIds.length
    ? await admin.from('plan_items').select('id, poradi, typ').in('id', polozkaIds)
    : { data: [] }
  const popisy = new Map(
    (polozky ?? []).map((p) => [p.id, `${p.poradi}. ${TYP_POLOZKY_POPISKY[p.typ]}`]),
  )

  const aktivni = schuzky.filter((s) => s.stav !== 'dokoncena')
  const dokoncene = schuzky.filter((s) => s.stav === 'dokoncena')

  return (
    <section className="mt-10">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
        Přiřazené nahrávky ({aktivni.length})
      </h2>
      {aktivni.length ? (
        <ul className="mt-3 space-y-3">
          {aktivni.map((s) => {
            const n = nahravkaMap.get(s.recording_id)
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {n ? jmena.get(n.student_id) : '—'}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {n ? popisy.get(n.plan_item_id) : ''} ·{' '}
                    {s.termin
                      ? `schůzka ${new Date(s.termin).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}`
                      : 'termín schůzky zatím nezadán'}
                  </p>
                </div>
                <Link
                  href={`/nahravka/${s.recording_id}`}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Otevřít nahrávku
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Nic aktuálně nečeká.
        </p>
      )}

      {dokoncene.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
            Realizované schůzky ({dokoncene.length})
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
            {dokoncene.map((s) => {
              const n = nahravkaMap.get(s.recording_id)
              return (
                <li key={s.id}>
                  {n ? jmena.get(n.student_id) : '—'} ·{' '}
                  {s.dokonceno_odeslano_at
                    ? formatujDatum(s.dokonceno_odeslano_at.slice(0, 10))
                    : ''}
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </section>
  )
}
