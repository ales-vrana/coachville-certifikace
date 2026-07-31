'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface PolozkaMenu {
  href: string
  popisek: string
}

export function PostranniNav({ polozky }: { polozky: PolozkaMenu[] }) {
  const cesta = usePathname()

  return (
    <nav className="mt-4 md:mt-6">
      <ul className="flex flex-wrap gap-1 md:flex-col">
        {polozky.map((p) => {
          const aktivni = cesta === p.href || cesta.startsWith(`${p.href}/`)
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  aktivni
                    ? 'bg-zinc-900 font-medium text-white'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                {p.popisek}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
