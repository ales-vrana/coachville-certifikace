'use client'

import { useState } from 'react'
import { posliMagicLink } from '@/lib/auth/prihlaseni-akce'

type Stav = 'formular' | 'odesilam' | 'odeslano'

export default function PrihlaseniPage() {
  const [email, setEmail] = useState('')
  const [stav, setStav] = useState<Stav>('formular')
  const [chyba, setChyba] = useState<string | null>(null)

  async function odeslat(e: React.FormEvent) {
    e.preventDefault()
    setChyba(null)
    setStav('odesilam')

    const vysledek = await posliMagicLink(email)
    if (!vysledek.ok) {
      setStav('formular')
      setChyba(vysledek.chyba ?? 'Odkaz se nepodařilo odeslat.')
      return
    }
    setStav('odeslano')
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          CoachVille certifikace
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Správa koučovacích nahrávek
        </p>

        {stav === 'odeslano' ? (
          <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <p className="font-medium">Odkaz je na cestě 📬</p>
            <p className="mt-1">
              Poslali jsme vám přihlašovací odkaz na <strong>{email}</strong>. Otevřete e-mail a
              klikněte na něj — platí krátce, tak s tím neotálejte. Nic nepřišlo? Mrkněte do spamu.
            </p>
          </div>
        ) : (
          <form onSubmit={odeslat} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Váš e-mail
              </span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jmeno@example.cz"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-800"
              />
            </label>

            {chyba && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                {chyba}
              </p>
            )}

            <button
              type="submit"
              disabled={stav === 'odesilam'}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {stav === 'odesilam' ? 'Odesílám…' : 'Poslat přihlašovací odkaz'}
            </button>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Žádná hesla — přihlásíte se kliknutím na jednorázový odkaz, který vám přijde e-mailem.
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
