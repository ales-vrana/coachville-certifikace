'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ulozNastaveni, type KlicNastaveni } from '@/lib/admin/nastaveni-akce'

const TEXTAREA_TRIDA =
  'mt-1 w-full rounded-lg border border-zinc-300 p-3 text-sm leading-relaxed text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100'

function Pole(props: {
  klic: KlicNastaveni
  popisek: string
  napoveda?: string
  vychozi: string
  radku?: number
}) {
  const router = useRouter()
  const [probiha, startTransition] = useTransition()
  const [hodnota, setHodnota] = useState(props.vychozi)
  const [zprava, setZprava] = useState('')

  return (
    <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <label className="block">
        <span className="font-medium text-zinc-900 dark:text-zinc-50">{props.popisek}</span>
        {props.napoveda && (
          <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
            {props.napoveda}
          </span>
        )}
        {props.radku ? (
          <textarea
            value={hodnota}
            onChange={(e) => setHodnota(e.target.value)}
            rows={props.radku}
            className={TEXTAREA_TRIDA}
          />
        ) : (
          <input
            value={hodnota}
            onChange={(e) => setHodnota(e.target.value)}
            placeholder="https://buy.stripe.com/…"
            className={TEXTAREA_TRIDA}
          />
        )}
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => {
            setZprava('')
            startTransition(async () => {
              const vysledek = await ulozNastaveni(props.klic, hodnota)
              setZprava(vysledek.ok ? 'Uloženo ✓' : (vysledek.chyba ?? 'Nepodařilo se.'))
              router.refresh()
            })
          }}
          disabled={probiha || hodnota === props.vychozi}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Uložit
        </button>
        {zprava && <span className="text-sm text-zinc-600 dark:text-zinc-300">{zprava}</span>}
      </div>
    </div>
  )
}

export function NastaveniFormular(props: {
  stripeLink: string
  jakNaTo: string
  podminky: string
}) {
  return (
    <div className="mt-8 space-y-5">
      <Pole
        klic="stripe_link_500"
        popisek="Stripe Payment Link — poplatek 500 Kč"
        napoveda="Vytvořte ručně ve Stripe (Payment Links) a vložte sem. Dokud je prázdný, e-mail o poplatku odejde bez platebního odkazu s pokynem počkat na Meiru."
        vychozi={props.stripeLink}
      />
      <Pole
        klic="text_jak_na_to"
        popisek={'Text sekce „Jak na to"'}
        napoveda="Návody pro studenty (nahrávání, formáty, souhlas klienta). Sekce unese i placeholder, videa doplníte později."
        vychozi={props.jakNaTo}
        radku={10}
      />
      <Pole
        klic="text_podminky"
        popisek={'Text sekce „Podmínky certifikace"'}
        napoveda="Podmínky programu: povinnosti, tolerance délek, poplatky 500/1000 Kč, retence nahrávek."
        vychozi={props.podminky}
        radku={10}
      />
    </div>
  )
}
