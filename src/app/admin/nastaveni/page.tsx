import Link from 'next/link'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { createAdminClient } from '@/lib/supabase/admin'
import { NastaveniFormular } from './nastaveni-formular'

export default async function NastaveniPage() {
  await vyzadujRoli(['admin'])
  const admin = createAdminClient()

  const { data: nastaveni } = await admin
    .from('settings')
    .select('key, value')
    .in('key', ['stripe_link_500', 'text_jak_na_to', 'text_podminky'])
  const hodnoty = new Map((nastaveni ?? []).map((n) => [n.key, String(n.value ?? '')]))

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/admin" className="hover:underline">
          ← Administrace
        </Link>
      </nav>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Nastavení a texty
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Stripe odkaz je jediný platební odkaz v systému (R35) — posílá se v e-mailu při režimu
        poplatku 500 Kč. Texty se zobrazují studentům v sekcích „Jak na to" a „Podmínky
        certifikace".
      </p>

      <NastaveniFormular
        stripeLink={hodnoty.get('stripe_link_500') ?? ''}
        jakNaTo={hodnoty.get('text_jak_na_to') ?? ''}
        podminky={hodnoty.get('text_podminky') ?? ''}
      />
    </main>
  )
}
