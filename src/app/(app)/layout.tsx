import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { nactiProfil } from '@/lib/auth/over-roli'
import { ROLE_POPISKY } from '@/lib/popisky'
import { PostranniNav, type PolozkaMenu } from './postranni-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profil = await nactiProfil()
  if (!profil) redirect('/prihlaseni')

  const polozky: PolozkaMenu[] = [{ href: '/prehled', popisek: 'Přehled' }]
  if (['verca', 'meira', 'admin'].includes(profil.role)) {
    polozky.push({ href: '/studenti', popisek: 'Studenti' })
  }
  if (['verca', 'admin'].includes(profil.role)) {
    polozky.push({ href: '/fronta', popisek: 'Fronty a semafor' })
    polozky.push({ href: '/mentori', popisek: 'Mentoři' })
  }
  if (profil.role === 'admin') {
    polozky.push({ href: '/admin', popisek: 'Administrace' })
  }
  polozky.push({ href: '/jak-na-to', popisek: 'Jak na to' })
  polozky.push({ href: '/podminky', popisek: 'Podmínky certifikace' })

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900 md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-zinc-200 bg-white px-4 py-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r md:px-5 md:py-6">
        <Link href="/prehled" className="inline-flex">
          <Image
            src="/coachville-logo.png"
            alt="CoachVille"
            width={130}
            height={31}
            priority
          />
        </Link>
        <p className="mt-1.5 text-xs tracking-wide text-zinc-400">certifikace</p>

        <PostranniNav polozky={polozky} />

        <div className="mt-4 border-t border-zinc-200 pt-4 md:mt-auto">
          <p className="truncate text-sm font-medium text-zinc-900">{profil.jmeno}</p>
          <p className="text-xs text-zinc-500">{ROLE_POPISKY[profil.role] ?? profil.role}</p>
          <div className="mt-3 flex items-center gap-3">
            <form action="/auth/odhlasit" method="post">
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 transition hover:bg-zinc-100"
              >
                Odhlásit se
              </button>
            </form>
            <a
              href="mailto:delivery@coachville.eu"
              className="text-xs text-zinc-500 underline hover:text-zinc-900"
            >
              Podpora
            </a>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
