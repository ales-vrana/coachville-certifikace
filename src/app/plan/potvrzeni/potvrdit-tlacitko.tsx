'use client'

import { useState, useTransition } from 'react'
import { potvrdPlanTokenem } from '@/lib/plan/navrh-akce'

export function PotvrditTlacitko({ token }: { token: string }) {
  const [probiha, startTransition] = useTransition()
  const [vysledek, setVysledek] = useState<{ ok: boolean; chyba?: string; varovani?: string } | null>(null)

  if (vysledek?.ok) {
    return (
      <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-medium">Plán je potvrzen ✅</p>
        <p className="mt-1">
          Od teď je závazný — termíny si zapiš do kalendáře. Poslali jsme ti je i e-mailem.
          Nahrávky budeš odevzdávat po přihlášení do systému.
        </p>
        {vysledek.varovani && <p className="mt-2 text-amber-800">⚠️ {vysledek.varovani}</p>}
      </div>
    )
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={probiha}
        onClick={() =>
          startTransition(async () => {
            setVysledek(await potvrdPlanTokenem(token))
          })
        }
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
      >
        {probiha ? 'Potvrzuji…' : 'Potvrdit plán'}
      </button>
      {vysledek && !vysledek.ok && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{vysledek.chyba}</p>
      )}
      <p className="mt-3 text-xs text-zinc-500">
        Termíny ti nevyhovují? Ozvi se Veronice — pošle ti nový návrh.
      </p>
    </div>
  )
}
