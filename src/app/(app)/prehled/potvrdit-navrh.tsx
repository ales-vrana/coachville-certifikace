'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { potvrdMujPlan } from '@/lib/plan/navrh-akce'

/** Potvrzení návrhu plánu přímo z profilu (alternativa k tlačítku v e-mailu). */
export function PotvrditNavrh() {
  const router = useRouter()
  const [probiha, startTransition] = useTransition()
  const [chyba, setChyba] = useState<string | null>(null)

  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={probiha}
        onClick={() =>
          startTransition(async () => {
            setChyba(null)
            const vysledek = await potvrdMujPlan()
            if (!vysledek.ok) {
              setChyba(vysledek.chyba ?? 'Potvrzení se nepodařilo.')
              return
            }
            router.refresh()
          })
        }
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {probiha ? 'Potvrzuji…' : 'Potvrdit plán'}
      </button>
      {chyba && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {chyba}
        </p>
      )}
    </div>
  )
}
