import { vyzadujRoli } from '@/lib/auth/over-roli'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function JakNaToPage() {
  await vyzadujRoli(['student', 'mentor', 'verca', 'meira', 'admin'])
  const admin = createAdminClient()
  const { data } = await admin.from('settings').select('value').eq('key', 'text_jak_na_to').single()
  const text = typeof data?.value === 'string' ? data.value : ''

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Jak na to</h1>
      {text ? (
        <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {text}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Návody se připravují. Zatím platí: nahrávejte v jakémkoli formátu z počítače i mobilu,
          na začátku nahrávky musí zaznít souhlas klienta a klient nevystupuje pod příjmením.
          S čímkoli vám poradí Verča na delivery@coachville.eu.
        </p>
      )}
    </main>
  )
}
