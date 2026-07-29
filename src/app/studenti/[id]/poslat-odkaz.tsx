'use client'

import { useState } from 'react'
import { posliPrihlasovaciOdkaz } from '@/lib/studenti/akce'

export function TlacitkoPoslatOdkaz({ studentId }: { studentId: string }) {
  const [stav, setStav] = useState<'klid' | 'posilam' | 'odeslano' | 'chyba'>('klid')
  const [chyba, setChyba] = useState('')

  async function poslat() {
    setStav('posilam')
    const vysledek = await posliPrihlasovaciOdkaz(studentId)
    if (vysledek.ok) {
      setStav('odeslano')
    } else {
      setChyba(vysledek.chyba ?? 'Neznámá chyba')
      setStav('chyba')
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={poslat}
        disabled={stav === 'posilam'}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {stav === 'posilam' ? 'Posílám…' : 'Poslat přihlašovací odkaz'}
      </button>
      {stav === 'odeslano' && (
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">Odkaz odeslán ✓</p>
      )}
      {stav === 'chyba' && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{chyba}</p>}
    </div>
  )
}
