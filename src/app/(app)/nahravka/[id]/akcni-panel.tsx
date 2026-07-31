'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { schvalKratkyReport } from '@/lib/fronta/akce'
import { dokonciSchuzku, ulozUpravuReportu, zadejTerminSchuzky } from '@/lib/mentor/akce'

interface Props {
  recordingId: string
  /** režim panelu podle role a stavu nahrávky */
  rezim: 'schvaleni_kratke' | 'mentor_dlouha'
  obsahReportu: string
  terminSchuzky: string | null
  /** mentor/admin: smí zadat termín a dokončit; verca: jen termín */
  muzeDokoncit: boolean
}

const TLACITKO_PRIMARNI =
  'rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300'

export function AkcniPanel(props: Props) {
  const router = useRouter()
  const [probiha, startTransition] = useTransition()
  const [obsah, setObsah] = useState(props.obsahReportu)
  const [termin, setTermin] = useState(
    props.terminSchuzky ? props.terminSchuzky.slice(0, 16) : '',
  )
  const [zprava, setZprava] = useState('')

  function spust(akce: () => Promise<{ ok: boolean; chyba?: string; varovani?: string }>, uspech: string) {
    setZprava('')
    startTransition(async () => {
      const vysledek = await akce()
      setZprava(
        vysledek.ok ? (vysledek.varovani ?? uspech) : (vysledek.chyba ?? 'Akce se nepodařila.'),
      )
      router.refresh()
    })
  }

  if (props.rezim === 'schvaleni_kratke') {
    return (
      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
        <h2 className="text-lg font-medium text-amber-900 dark:text-amber-200">
          Schválení reportu (Verča)
        </h2>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
          Report můžete před odesláním upravit. Schválením odejde studentovi e-mailem, odemkne se
          mu v profilu a položka se započte.
        </p>
        <textarea
          value={obsah}
          onChange={(e) => setObsah(e.target.value)}
          rows={14}
          className="mt-3 w-full rounded-lg border border-amber-300 bg-white p-3 font-mono text-xs leading-relaxed text-zinc-900 outline-none dark:border-amber-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() =>
              spust(
                () => schvalKratkyReport(props.recordingId, obsah),
                'Schváleno, odesláno a započteno ✓',
              )
            }
            disabled={probiha || !obsah.trim()}
            className={TLACITKO_PRIMARNI}
          >
            {probiha ? 'Odesílám…' : 'Schválit a odeslat studentovi'}
          </button>
          {zprava && <span className="text-sm text-zinc-700 dark:text-zinc-300">{zprava}</span>}
        </div>
      </section>
    )
  }

  return (
    <section className="mt-8 rounded-2xl border border-zinc-300 p-5 dark:border-zinc-700">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Mentorská schůzka</h2>

      <div className="mt-3">
        <label className="text-sm text-zinc-600 dark:text-zinc-300">
          Termín schůzky (do 30 dnů od vyhodnocení; pro start se zapisuje ručně)
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            value={termin}
            onChange={(e) => setTermin(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            onClick={() =>
              spust(() => zadejTerminSchuzky(props.recordingId, termin), 'Termín uložen ✓')
            }
            disabled={probiha || !termin}
            className={TLACITKO_PRIMARNI}
          >
            Uložit termín
          </button>
        </div>
      </div>

      {props.muzeDokoncit && (
        <>
          <div className="mt-5">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">
              Oficiální vyhodnocení (můžete upravit — upravená verze je oficiální, R32)
            </label>
            <textarea
              value={obsah}
              onChange={(e) => setObsah(e.target.value)}
              rows={14}
              className="mt-1 w-full rounded-lg border border-zinc-300 p-3 font-mono text-xs leading-relaxed text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <button
              onClick={() =>
                spust(() => ulozUpravuReportu(props.recordingId, obsah), 'Úprava uložena ✓')
              }
              disabled={probiha || !obsah.trim() || obsah === props.obsahReportu}
              className={`mt-2 ${TLACITKO_PRIMARNI}`}
            >
              Uložit úpravu vyhodnocení
            </button>
          </div>

          <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              onClick={() =>
                spust(
                  () => dokonciSchuzku(props.recordingId),
                  'Dokončeno — vyhodnocení odemčeno studentovi ✓',
                )
              }
              disabled={probiha}
              className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              ✓ Schůzka dokončena + report odeslán
            </button>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Tímto se studentovi odemkne oficiální vyhodnocení, položka se započte a student
              dostane e-mail.
            </p>
          </div>
        </>
      )}

      {zprava && <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{zprava}</p>}
    </section>
  )
}
