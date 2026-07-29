'use server'

import { waitUntil } from '@vercel/functions'
import { vyzadujRoli, type PrihlasenyProfil } from '@/lib/auth/over-roli'
import { appUrl } from '@/lib/email/odesilatel'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'nahravky'

interface PolozkaProUpload {
  planItemId: string
  studentId: string
}

/**
 * Ověří, že položka plánu existuje, patří přihlášenému studentovi
 * (admin smí vše — matice v kap. 6) a je ve stavu, kdy lze nahrávat.
 */
async function overPolozkuProUpload(
  profil: PrihlasenyProfil,
  planItemId: string,
): Promise<{ ok: true; polozka: PolozkaProUpload } | { ok: false; chyba: string }> {
  const admin = createAdminClient()

  const { data: polozka } = await admin
    .from('plan_items')
    .select('id, student_id, stav')
    .eq('id', planItemId)
    .single()
  if (!polozka) return { ok: false, chyba: 'Položka plánu nenalezena.' }

  if (!['naplanovano', 'po_terminu'].includes(polozka.stav)) {
    return { ok: false, chyba: 'K této položce už nahrávka existuje nebo ji nyní nelze nahrát.' }
  }

  if (profil.role === 'student') {
    const { data: student } = await admin
      .from('students')
      .select('id, profile_id')
      .eq('id', polozka.student_id)
      .single()
    if (!student || student.profile_id !== profil.id) {
      return { ok: false, chyba: 'Tato položka nepatří k vašemu plánu.' }
    }
  }

  return { ok: true, polozka: { planItemId: polozka.id, studentId: polozka.student_id } }
}

function bezpecnyNazev(nazev: string): string {
  return (
    nazev
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // odstranit diakritiku
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .slice(-80) || 'nahravka'
  )
}

export interface VysledekZahajeni {
  ok: boolean
  chyba?: string
  signedUrl?: string
  path?: string
}

/** Krok 1: vytvoří podepsanou upload URL pro přímé nahrání do Storage (kap. 11). */
export async function zahajUpload(
  planItemId: string,
  nazevSouboru: string,
): Promise<VysledekZahajeni> {
  const profil = await vyzadujRoli(['student', 'admin'])
  const overeni = await overPolozkuProUpload(profil, planItemId)
  if (!overeni.ok) return { ok: false, chyba: overeni.chyba }

  const admin = createAdminClient()
  const path = `${overeni.polozka.studentId}/${planItemId}/${Date.now()}-${bezpecnyNazev(nazevSouboru)}`
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    return { ok: false, chyba: `Upload se nepodařilo připravit: ${error?.message ?? ''}` }
  }
  return { ok: true, signedUrl: data.signedUrl, path: data.path }
}

export interface VysledekPotvrzeni {
  ok: boolean
  chyba?: string
}

/**
 * Krok 2 (po dokončeném přenosu): založí nahrávku, označí položku plánu
 * jako nahranou, zapíše událost a zařadí konverzi do fronty (F2 → F3).
 */
export async function potvrdUpload(vstup: {
  planItemId: string
  path: string
  puvodniNazev: string
  velikostBajtu: number
  souhlasKlienta: boolean
}): Promise<VysledekPotvrzeni> {
  const profil = await vyzadujRoli(['student', 'admin'])

  if (!vstup.souhlasKlienta) {
    return { ok: false, chyba: 'Bez potvrzení souhlasu klienta nelze nahrávku odevzdat (R16).' }
  }

  const overeni = await overPolozkuProUpload(profil, vstup.planItemId)
  if (!overeni.ok) return { ok: false, chyba: overeni.chyba }
  const { studentId } = overeni.polozka

  if (!vstup.path.startsWith(`${studentId}/${vstup.planItemId}/`)) {
    return { ok: false, chyba: 'Cesta souboru neodpovídá položce plánu.' }
  }

  const admin = createAdminClient()

  // soubor musí ve Storage skutečně existovat
  const slozka = vstup.path.split('/').slice(0, -1).join('/')
  const soubor = vstup.path.split('/').at(-1)!
  const { data: objekty } = await admin.storage.from(BUCKET).list(slozka, { search: soubor })
  if (!objekty?.some((o) => o.name === soubor)) {
    return { ok: false, chyba: 'Soubor se ve úložišti nenašel — zkuste nahrání zopakovat.' }
  }

  const { count } = await admin
    .from('recordings')
    .select('id', { count: 'exact', head: true })
    .eq('plan_item_id', vstup.planItemId)

  const { data: nahravka, error: chybaNahravky } = await admin
    .from('recordings')
    .insert({
      student_id: studentId,
      plan_item_id: vstup.planItemId,
      pokus: (count ?? 0) + 1,
      puvodni_soubor_path: vstup.path,
      puvodni_nazev: vstup.puvodniNazev,
      souhlas_klienta: true,
      stav: 'nahrano',
    })
    .select('id')
    .single()
  if (chybaNahravky || !nahravka) {
    return { ok: false, chyba: `Nahrávku se nepodařilo uložit: ${chybaNahravky?.message ?? ''}` }
  }

  await admin.from('recording_events').insert({
    recording_id: nahravka.id,
    typ: 'nahrano',
    detail: { nazev: vstup.puvodniNazev, velikost_bajtu: vstup.velikostBajtu },
    actor_profile_id: profil.id,
  })

  await admin.from('plan_items').update({ stav: 'nahrano' }).eq('id', vstup.planItemId)

  await admin.from('job_queue').insert({
    typ: 'konverze_mp3',
    payload: { recording_id: nahravka.id },
  })

  // Zpracování se rozběhne hned po odpovědi (fire-and-forget); záchytnou
  // sítí pro spadlé úlohy je Vercel Cron na /api/zpracuj.
  waitUntil(
    fetch(`${appUrl()}/api/zpracuj`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
    }).catch(() => {}),
  )

  // Bez revalidatePath: stránky jsou dynamické (čtou cookies), čerstvá data
  // se načtou při návratu na přehled — a potvrzovací panel zůstane vidět.
  return { ok: true }
}
