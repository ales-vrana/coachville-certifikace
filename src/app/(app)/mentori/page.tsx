import { vyzadujRoli } from '@/lib/auth/over-roli'
import { formatujDatum } from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Profily mentorů pro Verču (kap. 6): statistiky vytížení pro vyvažování (R7)
 * a Calendly embed pro telefonické plánování se studenty (R13).
 */
export default async function MentoriPage() {
  await vyzadujRoli(['verca', 'admin'])
  const admin = createAdminClient()

  const { data: mentori } = await admin
    .from('mentors')
    .select('id, calendly_url, calendly_embed, aktivni, profiles(jmeno, email)')
    .order('created_at')

  const { data: schuzky } = await admin
    .from('meetings')
    .select('mentor_id, stav, termin, dokonceno_odeslano_at')

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Mentoři a vytížení
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Orientační kapacita: ~10 hodin měsíčně na mentora (R10). Přes Calendly embed můžete
        studentům plánovat schůzky i telefonicky.
      </p>

      <div className="mt-6 space-y-4">
        {(mentori ?? []).map((m) => {
          const moje = (schuzky ?? []).filter((s) => s.mentor_id === m.id && s.stav !== 'zrusena')
          const rozpracovane = moje.filter((s) => s.stav !== 'dokoncena')
          const dokoncene = moje.filter((s) => s.stav === 'dokoncena')
          const posledni = dokoncene
            .map((s) => s.dokonceno_odeslano_at)
            .filter(Boolean)
            .sort()
            .at(-1)
          return (
            <div
              key={m.id}
              className={`rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800 ${m.aktivni ? '' : 'opacity-60'}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {m.profiles?.jmeno}
                  {!m.aktivni && (
                    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      neaktivní
                    </span>
                  )}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  rozpracované: <strong>{rozpracovane.length}</strong> · dokončené:{' '}
                  {dokoncene.length}
                  {posledni ? ` · poslední ${formatujDatum(posledni.slice(0, 10))}` : ''}
                </p>
              </div>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {m.profiles?.email}
                {m.calendly_url ? (
                  <>
                    {' · '}
                    <a
                      href={m.calendly_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      Calendly
                    </a>
                  </>
                ) : (
                  ' · Calendly nevyplněno'
                )}
              </p>
              {m.calendly_embed && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
                    Zobrazit Calendly pro plánování
                  </summary>
                  {/* embed kód vkládá výhradně admin ve správě mentorů */}
                  <div className="mt-2" dangerouslySetInnerHTML={{ __html: m.calendly_embed }} />
                </details>
              )}
            </div>
          )
        })}
        {!mentori?.length && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Zatím žádní mentoři — přidá je administrátor.
          </p>
        )}
      </div>
    </main>
  )
}
