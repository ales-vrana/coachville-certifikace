import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ROLE_POPISKY: Record<string, string> = {
  student: 'Student',
  mentor: 'Mentor',
  verca: 'Provoz',
  meira: 'Koordinátorka',
  admin: 'Administrátor',
}

export default async function PrehledPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/prihlaseni')

  const admin = createAdminClient()
  const { data: profil } = await admin
    .from('profiles')
    .select('jmeno, role, email')
    .eq('id', user.id)
    .single()

  if (!profil) {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Váš účet nemá v systému profil. Napište prosím Verče nebo na{' '}
          <a className="underline" href="mailto:delivery@coachville.eu">
            delivery@coachville.eu
          </a>
          .
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">CoachVille certifikace</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Dobrý den, {profil.jmeno}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {ROLE_POPISKY[profil.role] ?? profil.role} · {profil.email}
          </p>
        </div>
        <form action="/auth/odhlasit" method="post">
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Odhlásit se
          </button>
        </form>
      </header>

      <section className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Přihlášení funguje ✅ — moduly (plány, nahrávky, fronty) se právě staví. První ostrá
          nahrávka: září 2026.
        </p>
      </section>
    </main>
  )
}
