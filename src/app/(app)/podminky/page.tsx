import { vyzadujRoli } from '@/lib/auth/over-roli'
import { obsahKZobrazeni } from '@/lib/obsah'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function PodminkyPage() {
  await vyzadujRoli(['student', 'mentor', 'verca', 'meira', 'admin'])
  const admin = createAdminClient()
  const { data } = await admin.from('settings').select('value').eq('key', 'text_podminky').single()
  const text = typeof data?.value === 'string' ? data.value : ''

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Podmínky certifikace
      </h1>
      {text ? (
        <div
          className="prose prose-zinc mt-6 max-w-none"
          // obsah vkládá výhradně admin a při uložení i zde prochází sanitizací
          dangerouslySetInnerHTML={{ __html: obsahKZobrazeni(text) }}
        />
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Úplné znění podmínek se připravuje. Rámcově: dlouhá nahrávka 20–40 minut, krátká 10–15
          minut (tolerance ±5 minut, strop 60 minut), termíny hlídá systém, po 14 dnech po
          termínu se účtuje poplatek 500 Kč za nový termín, druhá a další opravná nahrávka
          1 000 Kč. Nahrávky se uchovávají 5 let.
        </p>
      )}
    </main>
  )
}
