'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { ROZSAHY_DELEK, generujPlanZDelek } from '@/lib/plan/generator'
import { navrhniPlan } from '@/lib/plan/navrh-akce'
import type { PolozkaPlanu, Program } from '@/lib/plan/typy'
import { FAZE_POPISKY, TYP_POLOZKY_POPISKY, formatujDatum } from '@/lib/popisky'

const INPUT_TRIDA =
  'mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800'

interface Props {
  studentId: string
  program: Program
  datumStartu: string
  delkaAcc: number | null
  delkaCelkem: number | null
  navrhOdeslanAt: string | null
  potvrzenAt: string | null
  planBezi: boolean
  smiNavrhovat: boolean
}

function StavovyRadek({ navrhOdeslanAt, potvrzenAt }: Pick<Props, 'navrhOdeslanAt' | 'potvrzenAt'>) {
  if (potvrzenAt) {
    return (
      <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        Plán potvrzen studentem <strong>{formatujDatum(potvrzenAt.slice(0, 10))}</strong> — termíny
        jsou závazné.
      </p>
    )
  }
  if (navrhOdeslanAt) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Návrh odeslán <strong>{formatujDatum(navrhOdeslanAt.slice(0, 10))}</strong> — čeká na
        potvrzení studenta (tlačítkem v e-mailu nebo ve svém profilu).
      </p>
    )
  }
  return (
    <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
      Plán zatím nebyl navržen. Po telefonátu se studentem zadejte domluvenou délku studia a
      pošlete návrh k potvrzení.
    </p>
  )
}

/** Use case „telefonát Veroniky": zadání délek v měsících → návrh e-mailem k potvrzení. */
export function NavrhPlanu(props: Props) {
  const router = useRouter()
  const [probiha, startTransition] = useTransition()
  const [vysledek, setVysledek] = useState<{ ok: boolean; chyba?: string; varovani?: string } | null>(null)
  const [delkaAcc, setDelkaAcc] = useState(String(props.delkaAcc ?? ''))
  const [delkaCelkem, setDelkaCelkem] = useState(String(props.delkaCelkem ?? ''))

  const zadavaAcc = props.program === 'acc' || props.program === 'komplet'
  const zadavaCelkem = props.program === 'upgrade_pcc' || props.program === 'komplet'

  const nahled = useMemo<{ polozky?: PolozkaPlanu[]; chyba?: string }>(() => {
    if ((zadavaAcc && !delkaAcc) || (zadavaCelkem && !delkaCelkem)) return {}
    try {
      return {
        polozky: generujPlanZDelek({
          program: props.program,
          datumStartu: new Date(props.datumStartu),
          delkaAccMesicu: zadavaAcc ? Number(delkaAcc) : undefined,
          delkaCelkemMesicu: zadavaCelkem ? Number(delkaCelkem) : undefined,
        }),
      }
    } catch (e) {
      return { chyba: e instanceof Error ? e.message : 'Plán nejde vygenerovat.' }
    }
  }, [props.program, props.datumStartu, zadavaAcc, zadavaCelkem, delkaAcc, delkaCelkem])

  function odeslat() {
    startTransition(async () => {
      setVysledek(null)
      const v = await navrhniPlan({
        studentId: props.studentId,
        delkaAccMesicu: zadavaAcc ? Number(delkaAcc) : undefined,
        delkaCelkemMesicu: zadavaCelkem ? Number(delkaCelkem) : undefined,
      })
      setVysledek(v)
      if (v.ok) router.refresh()
    })
  }

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
        Plán termínů — návrh a potvrzení
      </h2>
      <div className="mt-3">
        <StavovyRadek navrhOdeslanAt={props.navrhOdeslanAt} potvrzenAt={props.potvrzenAt} />
      </div>

      {props.smiNavrhovat && props.planBezi && (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Student už odevzdává nahrávky — nový návrh celého plánu poslat nelze, jednotlivé termíny
          upravíte v editaci níže.
        </p>
      )}

      {props.smiNavrhovat && !props.planBezi && (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {zadavaAcc && (
              <label className="block">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {props.program === 'komplet' ? 'Délka ACC fáze' : 'Délka studia ACC'} (
                  {ROZSAHY_DELEK.acc.min}–{ROZSAHY_DELEK.acc.max} měsíců) *
                </span>
                <input
                  type="number"
                  min={ROZSAHY_DELEK.acc.min}
                  max={ROZSAHY_DELEK.acc.max}
                  value={delkaAcc}
                  onChange={(e) => setDelkaAcc(e.target.value)}
                  placeholder="např. 12"
                  className={INPUT_TRIDA}
                />
              </label>
            )}
            {zadavaCelkem && (
              <label className="block">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {props.program === 'komplet' ? 'Celková délka studia do PCC' : 'Délka studia PCC'}{' '}
                  ({ROZSAHY_DELEK.pcc.min}–{ROZSAHY_DELEK.pcc.max} měsíců) *
                </span>
                <input
                  type="number"
                  min={ROZSAHY_DELEK.pcc.min}
                  max={ROZSAHY_DELEK.pcc.max}
                  value={delkaCelkem}
                  onChange={(e) => setDelkaCelkem(e.target.value)}
                  placeholder="např. 24"
                  className={INPUT_TRIDA}
                />
              </label>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Délka se počítá od data startu studia. Termíny se rozvrhnou automaticky a poslední
              padne přesně na konec domluvené délky.
            </p>

            {vysledek?.ok && (
              <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                Návrh je odeslán studentovi k potvrzení ✅
                {vysledek.varovani && <span className="mt-1 block text-amber-800">⚠️ {vysledek.varovani}</span>}
              </p>
            )}
            {vysledek && !vysledek.ok && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                {vysledek.chyba}
              </p>
            )}

            <button
              type="button"
              disabled={probiha || !nahled.polozky}
              onClick={odeslat}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {probiha
                ? 'Odesílám…'
                : props.navrhOdeslanAt && !props.potvrzenAt
                  ? 'Poslat nový návrh (starý odkaz přestane platit)'
                  : props.potvrzenAt
                    ? 'Poslat nový návrh místo potvrzeného plánu'
                    : 'Vygenerovat návrh a poslat studentovi'}
            </button>
          </div>

          <aside>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Náhled termínů {nahled.polozky ? `(${nahled.polozky.length} nahrávek)` : ''}
            </h3>
            {nahled.chyba ? (
              <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {nahled.chyba}
              </p>
            ) : nahled.polozky ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {nahled.polozky.map((p) => (
                      <tr key={p.poradi} className="bg-white dark:bg-zinc-950">
                        <td className="px-3 py-1.5 text-zinc-400">{p.poradi}.</td>
                        <td className="px-3 py-1.5">
                          {TYP_POLOZKY_POPISKY[p.typ]}
                          <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            {FAZE_POPISKY[p.faze]}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium">
                          {formatujDatum(p.termin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Zadejte délku v měsících — termíny se dopočítají tady.
              </p>
            )}
          </aside>
        </div>
      )}
    </section>
  )
}
