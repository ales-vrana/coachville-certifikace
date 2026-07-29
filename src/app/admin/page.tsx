import Link from 'next/link'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminObsah } from './admin-obsah'

export default async function AdminPage() {
  await vyzadujRoli(['admin'])
  const admin = createAdminClient()

  const { data: prompty } = await admin
    .from('master_prompts')
    .select('id, typ, verze, obsah, aktivni, platny_od')
    .order('verze', { ascending: false })

  const { data: standardy } = await admin
    .from('standards')
    .select('id, nazev, obsah, aktivni, poradi')
    .order('poradi')

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/prehled" className="hover:underline">
          ← Přehled
        </Link>
      </nav>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Administrace
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Master Prompty (verzované — uložením vzniká nová verze) a knihovna ICF standardů,
        která se vkládá do kontextu každého vyhodnocení.
      </p>

      <AdminObsah prompty={prompty ?? []} standardy={standardy ?? []} />
    </main>
  )
}
