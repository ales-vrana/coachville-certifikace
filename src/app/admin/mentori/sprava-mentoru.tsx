'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { pridejMentora, upravMentora, type VysledekAkce } from '@/lib/admin/mentori-akce'

interface Mentor {
  id: string
  jmeno: string
  email: string
  calendlyUrl: string | null
  calendlyEmbed: string | null
  mcsStav: 'nema' | 'v_priprave' | 'ziskano'
  aktivni: boolean
  schuzkyAktivni: number
  schuzkyDokoncene: number
}

const MCS_POPISKY: Record<Mentor['mcsStav'], string> = {
  nema: 'MCS: nemá',
  v_priprave: 'MCS: v přípravě',
  ziskano: 'MCS: získáno',
}

const INPUT_TRIDA =
  'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100'

function KartaMentora({ mentor }: { mentor: Mentor }) {
  const router = useRouter()
  const [probiha, startTransition] = useTransition()
  const [upravuji, setUpravuji] = useState(false)
  const [calendlyUrl, setCalendlyUrl] = useState(mentor.calendlyUrl ?? '')
  const [calendlyEmbed, setCalendlyEmbed] = useState(mentor.calendlyEmbed ?? '')
  const [mcsStav, setMcsStav] = useState(mentor.mcsStav)
  const [zprava, setZprava] = useState('')

  function spust(akce: () => Promise<VysledekAkce>) {
    setZprava('')
    startTransition(async () => {
      const vysledek = await akce()
      if (!vysledek.ok) setZprava(vysledek.chyba ?? 'Akce se nepodařila.')
      else setUpravuji(false)
      router.refresh()
    })
  }

  return (
    <div
      className={`rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800 ${mentor.aktivni ? '' : 'opacity-60'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {mentor.jmeno}
            {!mentor.aktivni && (
              <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                neaktivní
              </span>
            )}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {mentor.email} · {MCS_POPISKY[mentor.mcsStav]}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Rozpracované schůzky: {mentor.schuzkyAktivni} · dokončené: {mentor.schuzkyDokoncene}
            {mentor.calendlyUrl ? ' · Calendly ✓' : ' · Calendly chybí'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setUpravuji((u) => !u)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {upravuji ? 'Zavřít' : 'Upravit'}
          </button>
          <button
            onClick={() => spust(() => upravMentora(mentor.id, { aktivni: !mentor.aktivni }))}
            disabled={probiha}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {mentor.aktivni ? 'Deaktivovat' : 'Aktivovat'}
          </button>
        </div>
      </div>

      {upravuji && (
        <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">Calendly odkaz</span>
            <input
              value={calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
              placeholder="https://calendly.com/…"
              className={`mt-1 ${INPUT_TRIDA}`}
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">
              Calendly embed (kód pro vložení, pro telefonické plánování Verčou)
            </span>
            <textarea
              value={calendlyEmbed}
              onChange={(e) => setCalendlyEmbed(e.target.value)}
              rows={3}
              className={`mt-1 ${INPUT_TRIDA} font-mono text-xs`}
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">Stav MCS</span>
            <select
              value={mcsStav}
              onChange={(e) => setMcsStav(e.target.value as Mentor['mcsStav'])}
              className={`mt-1 ${INPUT_TRIDA}`}
            >
              <option value="nema">Nemá</option>
              <option value="v_priprave">V přípravě</option>
              <option value="ziskano">Získáno</option>
            </select>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                spust(() => upravMentora(mentor.id, { calendlyUrl, calendlyEmbed, mcsStav }))
              }
              disabled={probiha}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Uložit
            </button>
            {zprava && <span className="text-sm text-red-700 dark:text-red-400">{zprava}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export function SpravaMentoru({ mentori }: { mentori: Mentor[] }) {
  const router = useRouter()
  const [probiha, startTransition] = useTransition()
  const [jmeno, setJmeno] = useState('')
  const [email, setEmail] = useState('')
  const [calendlyUrl, setCalendlyUrl] = useState('')
  const [zprava, setZprava] = useState('')

  return (
    <div className="mt-8 space-y-4">
      {mentori.map((m) => (
        <KartaMentora key={m.id} mentor={m} />
      ))}
      {!mentori.length && (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Zatím žádní mentoři — přidejte prvního níže (R8: Helena Seifertová, Pavel Heidler,
          Silvie Ptašková).
        </p>
      )}

      <div className="rounded-2xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Přidat mentora</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            value={jmeno}
            onChange={(e) => setJmeno(e.target.value)}
            placeholder="Jméno a příjmení"
            className={INPUT_TRIDA}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="E-mail"
            className={INPUT_TRIDA}
          />
          <input
            value={calendlyUrl}
            onChange={(e) => setCalendlyUrl(e.target.value)}
            placeholder="Calendly odkaz (volitelné)"
            className={INPUT_TRIDA}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => {
              setZprava('')
              startTransition(async () => {
                const vysledek = await pridejMentora({ jmeno, email, calendlyUrl })
                if (!vysledek.ok) setZprava(vysledek.chyba ?? 'Přidání se nepodařilo.')
                else {
                  setJmeno('')
                  setEmail('')
                  setCalendlyUrl('')
                  setZprava('Mentor přidán ✓')
                }
                router.refresh()
              })
            }}
            disabled={probiha || !jmeno.trim() || !email.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Přidat mentora
          </button>
          {zprava && <span className="text-sm text-zinc-600 dark:text-zinc-300">{zprava}</span>}
        </div>
      </div>
    </div>
  )
}
