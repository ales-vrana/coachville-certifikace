'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { priradMentora } from '@/lib/fronta/akce'

export function PrirazeniRadek(props: {
  recordingId: string
  student: string
  polozka: string
  nahrano: string
  mentori: { id: string; popisek: string }[]
}) {
  const router = useRouter()
  const [probiha, startTransition] = useTransition()
  const [mentorId, setMentorId] = useState(props.mentori[0]?.id ?? '')
  const [zprava, setZprava] = useState('')

  return (
    <li className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm">
          <Link href={`/nahravka/${props.recordingId}`} className="font-medium hover:underline">
            {props.student}
          </Link>{' '}
          · {props.polozka} · nahráno {props.nahrano}
        </span>
        <span className="flex items-center gap-2">
          <select
            value={mentorId}
            onChange={(e) => setMentorId(e.target.value)}
            disabled={probiha || !props.mentori.length}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            {props.mentori.map((m) => (
              <option key={m.id} value={m.id}>
                {m.popisek}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setZprava('')
              startTransition(async () => {
                const vysledek = await priradMentora(props.recordingId, mentorId)
                setZprava(
                  vysledek.ok
                    ? (vysledek.varovani ?? 'Přiřazeno ✓')
                    : (vysledek.chyba ?? 'Nepodařilo se.'),
                )
                router.refresh()
              })
            }}
            disabled={probiha || !mentorId}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {probiha ? 'Přiřazuji…' : 'Přiřadit mentora'}
          </button>
        </span>
      </div>
      {!props.mentori.length && (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          Žádní aktivní mentoři — přidejte je v Administraci → Správa mentorů.
        </p>
      )}
      {zprava && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{zprava}</p>}
    </li>
  )
}
