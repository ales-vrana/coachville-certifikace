'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  aktivujVerziPromptu,
  pridejStandard,
  prepniStandard,
  ulozNovyPrompt,
  type VysledekAkce,
} from '@/lib/admin/akce'
import { formatujDatum } from '@/lib/popisky'

interface Prompt {
  id: string
  typ: 'dlouha' | 'kratka'
  verze: number
  obsah: string
  aktivni: boolean
  platny_od: string
}

interface Standard {
  id: string
  nazev: string
  obsah: string
  aktivni: boolean
  poradi: number
}

const TYP_PROMPTU_POPISKY: Record<'dlouha' | 'kratka', string> = {
  dlouha: 'Dlouhé nahrávky (oficiální vyhodnocení)',
  kratka: 'Krátké nahrávky (report e-mailem)',
}

const TEXTAREA_TRIDA =
  'mt-2 w-full rounded-lg border border-zinc-300 p-3 font-mono text-xs leading-relaxed text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100'

function EditorPromptu({ typ, verze }: { typ: 'dlouha' | 'kratka'; verze: Prompt[] }) {
  const router = useRouter()
  const [probiha, startTransition] = useTransition()
  const aktivni = verze.find((v) => v.aktivni)
  const [obsah, setObsah] = useState(aktivni?.obsah ?? '')
  const [zprava, setZprava] = useState('')

  function spust(akce: () => Promise<VysledekAkce>, uspech: string) {
    setZprava('')
    startTransition(async () => {
      const vysledek = await akce()
      setZprava(vysledek.ok ? uspech : (vysledek.chyba ?? 'Akce se nepodařila.'))
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
          {TYP_PROMPTU_POPISKY[typ]}
        </h3>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          aktivní verze: {aktivni ? `v${aktivni.verze}` : 'žádná'}
        </span>
      </div>

      <textarea
        value={obsah}
        onChange={(e) => setObsah(e.target.value)}
        rows={14}
        className={TEXTAREA_TRIDA}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={() => spust(() => ulozNovyPrompt(typ, obsah), 'Uloženo jako nová verze ✓')}
          disabled={probiha || !obsah.trim() || obsah === aktivni?.obsah}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Uložit jako novou verzi
        </button>
        {zprava && <span className="text-sm text-zinc-600 dark:text-zinc-300">{zprava}</span>}
      </div>

      {verze.length > 1 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
            Historie verzí ({verze.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {verze.map((v) => (
              <li key={v.id} className="flex items-center gap-3 text-sm">
                <span className={v.aktivni ? 'font-medium' : 'text-zinc-500 dark:text-zinc-400'}>
                  v{v.verze} · od {formatujDatum(v.platny_od.slice(0, 10))}
                  {v.aktivni ? ' · aktivní' : ''}
                </span>
                {!v.aktivni && (
                  <button
                    onClick={() =>
                      spust(() => aktivujVerziPromptu(v.id), `Verze v${v.verze} aktivována ✓`)
                    }
                    disabled={probiha}
                    className="rounded-md border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Aktivovat
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function KnihovnaStandardu({ standardy }: { standardy: Standard[] }) {
  const router = useRouter()
  const [probiha, startTransition] = useTransition()
  const [nazev, setNazev] = useState('')
  const [obsah, setObsah] = useState('')
  const [zprava, setZprava] = useState('')

  function spust(akce: () => Promise<VysledekAkce>, uspech: string) {
    setZprava('')
    startTransition(async () => {
      const vysledek = await akce()
      setZprava(vysledek.ok ? uspech : (vysledek.chyba ?? 'Akce se nepodařila.'))
      if (vysledek.ok) {
        setNazev('')
        setObsah('')
      }
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h3 className="font-medium text-zinc-900 dark:text-zinc-50">Knihovna ICF standardů</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Kompetence, markery, MSR/BARS — aktivní texty se přikládají ke každému vyhodnocení.
      </p>

      {standardy.length ? (
        <ul className="mt-4 space-y-2">
          {standardy.map((s) => (
            <li
              key={s.id}
              className={`flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 ${s.aktivni ? '' : 'opacity-50'}`}
            >
              <span>
                {s.nazev}
                <span className="ml-2 text-xs text-zinc-400">
                  {Math.ceil(s.obsah.length / 1000)} tis. znaků
                </span>
              </span>
              <button
                onClick={() =>
                  spust(
                    () => prepniStandard(s.id, !s.aktivni),
                    s.aktivni ? 'Deaktivováno ✓' : 'Aktivováno ✓',
                  )
                }
                disabled={probiha}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {s.aktivni ? 'Deaktivovat' : 'Aktivovat'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Knihovna je zatím prázdná — vyhodnocení běží jen podle Master Promptu.
        </p>
      )}

      <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Přidat standard</h4>
        <input
          value={nazev}
          onChange={(e) => setNazev(e.target.value)}
          placeholder="Název (např. Kompetence ICF — česky)"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <textarea
          value={obsah}
          onChange={(e) => setObsah(e.target.value)}
          rows={6}
          placeholder="Text standardu…"
          className={TEXTAREA_TRIDA}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => spust(() => pridejStandard(nazev, obsah), 'Standard přidán ✓')}
            disabled={probiha || !nazev.trim() || !obsah.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Přidat standard
          </button>
          {zprava && <span className="text-sm text-zinc-600 dark:text-zinc-300">{zprava}</span>}
        </div>
      </div>
    </div>
  )
}

export function AdminObsah({
  prompty,
  standardy,
}: {
  prompty: Prompt[]
  standardy: Standard[]
}) {
  return (
    <div className="mt-8 space-y-6">
      <EditorPromptu typ="dlouha" verze={prompty.filter((p) => p.typ === 'dlouha')} />
      <EditorPromptu typ="kratka" verze={prompty.filter((p) => p.typ === 'kratka')} />
      <KnihovnaStandardu standardy={standardy} />
    </div>
  )
}
