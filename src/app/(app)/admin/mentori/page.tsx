import Link from 'next/link'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { createAdminClient } from '@/lib/supabase/admin'
import { SpravaMentoru } from './sprava-mentoru'

export default async function MentoriAdminPage() {
  await vyzadujRoli(['admin'])
  const admin = createAdminClient()

  const { data: mentori } = await admin
    .from('mentors')
    .select('id, calendly_url, calendly_embed, mcs_stav, aktivni, profiles(jmeno, email)')
    .order('created_at')

  const { data: schuzky } = await admin.from('meetings').select('mentor_id, stav')
  const vytizeni = new Map<string, { aktivni: number; dokoncene: number }>()
  for (const s of schuzky ?? []) {
    const z = vytizeni.get(s.mentor_id) ?? { aktivni: 0, dokoncene: 0 }
    if (s.stav === 'dokoncena') z.dokoncene++
    else if (s.stav !== 'zrusena') z.aktivni++
    vytizeni.set(s.mentor_id, z)
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/admin" className="hover:underline">
          ← Administrace
        </Link>
      </nav>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Mentoři</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Mentor se přihlašuje magic linkem na svůj e-mail a vidí jen nahrávky, které mu Verča
        přiřadí. Calendly embed slouží Verče k telefonickému plánování (R13).
      </p>

      <SpravaMentoru
        mentori={(mentori ?? []).map((m) => ({
          id: m.id,
          jmeno: m.profiles?.jmeno ?? '—',
          email: m.profiles?.email ?? '—',
          calendlyUrl: m.calendly_url,
          calendlyEmbed: m.calendly_embed,
          mcsStav: m.mcs_stav,
          aktivni: m.aktivni,
          schuzkyAktivni: vytizeni.get(m.id)?.aktivni ?? 0,
          schuzkyDokoncene: vytizeni.get(m.id)?.dokoncene ?? 0,
        }))}
      />
    </main>
  )
}
