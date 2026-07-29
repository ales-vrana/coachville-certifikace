import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ROLE_POPISKY } from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { MentoruvPrehled } from './mentoruv-prehled'
import { StudentuvPlan } from './studentuv-plan'

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

  const jeStaff = ['verca', 'meira', 'admin'].includes(profil.role)

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

      {jeStaff && (
        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Moduly
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Link
              href="/studenti"
              className="rounded-2xl border border-zinc-200 p-5 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <p className="font-medium text-zinc-900 dark:text-zinc-50">Studenti</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Seznam studentů, zakládání a plány dodávek
              </p>
            </Link>
            {['verca', 'admin'].includes(profil.role) && (
              <Link
                href="/fronta"
                className="rounded-2xl border border-zinc-200 p-5 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-50">Fronty a semafor</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Přiřazování mentorů, schvalování reportů, neplniči
                </p>
              </Link>
            )}
            {['verca', 'admin'].includes(profil.role) && (
              <Link
                href="/mentori"
                className="rounded-2xl border border-zinc-200 p-5 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-50">Mentoři</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Vytížení, statistiky a Calendly pro plánování
                </p>
              </Link>
            )}
            {profil.role === 'admin' && (
              <Link
                href="/admin"
                className="rounded-2xl border border-zinc-200 p-5 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-50">Administrace</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Master Prompty a knihovna ICF standardů
                </p>
              </Link>
            )}
          </div>
        </section>
      )}

      {profil.role === 'student' && <StudentuvPlan profileId={user.id} />}
      {profil.role === 'mentor' && <MentoruvPrehled profileId={user.id} />}

      <footer className="mt-12 border-t border-zinc-200 pt-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <Link href="/jak-na-to" className="hover:underline">
          Jak na to
        </Link>
        {' · '}
        <Link href="/podminky" className="hover:underline">
          Podmínky certifikace
        </Link>
        {' · '}
        <a href="mailto:delivery@coachville.eu" className="hover:underline">
          Podpora
        </a>
      </footer>
    </main>
  )
}
