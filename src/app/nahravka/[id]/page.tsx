import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import {
  FAZE_POPISKY,
  STAV_NAHRAVKY_POPISKY,
  TYP_POLOZKY_POPISKY,
  formatujDatum,
} from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLE_TITULKY, type Usek } from '@/lib/zpracovani/transkripce'

function formatujCas(sekundy: number): string {
  const m = Math.floor(sekundy / 60)
  const s = Math.floor(sekundy % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default async function NahravkaPage({ params }: { params: Promise<{ id: string }> }) {
  const profil = await vyzadujRoli(['student', 'verca', 'meira', 'admin'])
  const { id } = await params
  const jeStudent = profil.role === 'student'

  const admin = createAdminClient()
  const { data: nahravka } = await admin
    .from('recordings')
    .select('id, student_id, plan_item_id, stav, pokus, puvodni_nazev, puvodni_soubor_path, nahrano_at')
    .eq('id', id)
    .single()
  if (!nahravka) notFound()

  const { data: student } = await admin
    .from('students')
    .select('id, profile_id, profiles(jmeno)')
    .eq('id', nahravka.student_id)
    .single()
  if (jeStudent && student?.profile_id !== profil.id) redirect('/prehled')

  const { data: polozka } = await admin
    .from('plan_items')
    .select('poradi, typ, faze, termin')
    .eq('id', nahravka.plan_item_id)
    .single()

  const { data: transkript } = await admin
    .from('transcripts')
    .select('segmenty, sluzba, created_at')
    .eq('recording_id', id)
    .single()

  const { data: report } = await admin
    .from('reports')
    .select('obsah, stav, odemceno_at')
    .eq('recording_id', id)
    .single()

  // studentovi se vyhodnocení ukazuje až po odemknutí (R12)
  const reportProZobrazeni = report && (!jeStudent || report.stav === 'odemcen') ? report : null

  let audioUrl: string | null = null
  if (nahravka.puvodni_soubor_path) {
    const { data: podepsane } = await admin.storage
      .from('nahravky')
      .createSignedUrl(nahravka.puvodni_soubor_path, 3600)
    audioUrl = podepsane?.signedUrl ?? null
  }

  const useky = ((transkript?.segmenty as { useky?: Usek[] } | null)?.useky ?? []) as Usek[]
  const bezVyhodnoceni = polozka?.typ === 'kratka_bez_vyhodnoceni'

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href={jeStudent ? '/prehled' : `/studenti/${nahravka.student_id}`} className="hover:underline">
          ← Zpět {jeStudent ? 'na přehled' : 'na detail studenta'}
        </Link>
      </nav>

      <header className="mt-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {polozka ? `${polozka.poradi}. ${TYP_POLOZKY_POPISKY[polozka.typ]}` : 'Nahrávka'}
          {polozka?.faze && (
            <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-sm font-normal text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {FAZE_POPISKY[polozka.faze]}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {!jeStudent && student?.profiles?.jmeno ? `${student.profiles.jmeno} · ` : ''}
          odevzdáno {formatujDatum(nahravka.nahrano_at.slice(0, 10))}
          {nahravka.pokus > 1 ? ` · ${nahravka.pokus}. pokus` : ''} ·{' '}
          {STAV_NAHRAVKY_POPISKY[nahravka.stav] ?? nahravka.stav}
        </p>
      </header>

      {/* 1) Nahrávka */}
      <section className="mt-8">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">🎧 Nahrávka</h2>
        {audioUrl ? (
          <div className="mt-3">
            <audio controls preload="none" src={audioUrl} className="w-full" />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {nahravka.puvodni_nazev}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Soubor není k dispozici.</p>
        )}
      </section>

      {/* 2) Transkript */}
      <section className="mt-8">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">📝 Transkript</h2>
        {useky.length ? (
          <div className="mt-3 space-y-4">
            {useky.map((u, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-20 shrink-0 text-right">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
                      u.role === 'kouc'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : u.role === 'klient'
                          ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                    }`}
                  >
                    {ROLE_TITULKY[u.role] ?? u.role}
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-400">{formatujCas(u.od)}</p>
                </div>
                <p className="flex-1 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {u.text.trim()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {nahravka.stav === 'vraceno'
              ? 'Nahrávka byla vrácena z technických důvodů, transkript nevznikne.'
              : bezVyhodnoceni
                ? 'Tato nahrávka se pouze eviduje — transkript se nepořizuje.'
                : 'Transkript se připravuje — objeví se tu automaticky.'}
          </p>
        )}
      </section>

      {/* 3) Vyhodnocení */}
      {!bezVyhodnoceni && (
        <section className="mt-8">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">📋 Vyhodnocení</h2>
          {reportProZobrazeni ? (
            <div className="prose prose-zinc mt-3 max-w-none whitespace-pre-wrap text-sm dark:prose-invert">
              {reportProZobrazeni.obsah}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {jeStudent
                ? polozka?.typ === 'dlouha'
                  ? 'Vyhodnocení se odemkne po schůzce s mentorem.'
                  : 'Vyhodnocení tu bude, jakmile ho schválí Verča.'
                : 'Vyhodnocení se připravuje.'}
            </p>
          )}
        </section>
      )}
    </main>
  )
}
