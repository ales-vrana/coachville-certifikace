'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { potvrdUpload, zahajUpload } from '@/lib/nahravky/akce'

type Faze = 'vyber' | 'nahravam' | 'ukladam' | 'hotovo' | 'chyba'

function formatujVelikost(bajty: number): string {
  if (bajty >= 1024 * 1024) return `${(bajty / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.ceil(bajty / 1024)} kB`
}

/** Nahraje soubor XHR PUTem na podepsanou URL, s průběhem (F2: viditelný průběh). */
function nahrajSoubor(
  signedUrl: string,
  soubor: File,
  onPrubeh: (procenta: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('Content-Type', soubor.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onPrubeh(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Přenos selhal (HTTP ${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error('Přenos selhal — zkontrolujte připojení.'))
    xhr.send(soubor)
  })
}

export function NahravaciFormular({ planItemId }: { planItemId: string }) {
  const [faze, setFaze] = useState<Faze>('vyber')
  const [soubor, setSoubor] = useState<File | null>(null)
  const [souhlas, setSouhlas] = useState(false)
  const [prubeh, setPrubeh] = useState(0)
  const [chyba, setChyba] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function odeslat() {
    if (!soubor || !souhlas) return
    setChyba('')
    setFaze('nahravam')
    setPrubeh(0)
    try {
      const zahajeni = await zahajUpload(planItemId, soubor.name)
      if (!zahajeni.ok || !zahajeni.signedUrl || !zahajeni.path) {
        throw new Error(zahajeni.chyba ?? 'Upload se nepodařilo připravit.')
      }
      await nahrajSoubor(zahajeni.signedUrl, soubor, setPrubeh)
      setFaze('ukladam')
      const potvrzeni = await potvrdUpload({
        planItemId,
        path: zahajeni.path,
        puvodniNazev: soubor.name,
        velikostBajtu: soubor.size,
        souhlasKlienta: souhlas,
      })
      if (!potvrzeni.ok) throw new Error(potvrzeni.chyba ?? 'Uložení se nepodařilo.')
      setFaze('hotovo')
    } catch (e) {
      setChyba(e instanceof Error ? e.message : 'Něco se pokazilo, zkuste to znovu.')
      setFaze('chyba')
    }
  }

  if (faze === 'hotovo') {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950">
        <p className="font-medium text-emerald-900 dark:text-emerald-200">
          Nahrávka je odevzdaná 🎉
        </p>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
          Systém ji teď zpracuje — nemusíte dělat nic dalšího. Stav uvidíte na svém přehledu.
        </p>
        <Link
          href="/prehled"
          className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Zpět na přehled
        </Link>
      </div>
    )
  }

  const posila = faze === 'nahravam' || faze === 'ukladam'

  return (
    <div className="mt-8 space-y-5">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={(e) => setSoubor(e.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={posila}
        className="w-full rounded-2xl border-2 border-dashed border-zinc-300 p-8 text-center transition hover:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:hover:border-zinc-500"
      >
        {soubor ? (
          <span className="text-sm text-zinc-900 dark:text-zinc-100">
            🎙️ <strong>{soubor.name}</strong> ({formatujVelikost(soubor.size)})
            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
              Klepnutím vyberete jiný soubor
            </span>
          </span>
        ) : (
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            Klepněte a vyberte nahrávku
            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
              Funguje z počítače i mobilu, jakýkoli formát audia či videa (např. ze Zoomu)
            </span>
          </span>
        )}
      </button>

      <label className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={souhlas}
          onChange={(e) => setSouhlas(e.target.checked)}
          disabled={posila}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          Potvrzuji, že nahrávka obsahuje na začátku namluvený souhlas klienta s pořízením a
          vyhodnocením záznamu a klient neuvádí své příjmení.
        </span>
      </label>

      {posila && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-100"
              style={{ width: `${faze === 'ukladam' ? 100 : prubeh}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {faze === 'ukladam' ? 'Ukládám záznam…' : `Nahrávám… ${prubeh} %`}
          </p>
        </div>
      )}

      {chyba && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {chyba}
        </p>
      )}

      <button
        type="button"
        onClick={odeslat}
        disabled={!soubor || !souhlas || posila}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {posila ? 'Odevzdávám…' : 'Odevzdat nahrávku'}
      </button>
    </div>
  )
}
