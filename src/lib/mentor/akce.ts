'use server'

import { revalidatePath } from 'next/cache'
import { vyzadujRoli, type PrihlasenyProfil } from '@/lib/auth/over-roli'
import { appUrl, posliEmail } from '@/lib/email/odesilatel'
import { vyhodnoceniOdemcenoEmail } from '@/lib/email/sablony'
import { createAdminClient } from '@/lib/supabase/admin'

export interface VysledekAkce {
  ok: boolean
  chyba?: string
  varovani?: string
}

/** Ověří, že přihlášený mentor má nahrávku přiřazenou (matice kap. 6). */
async function overPristupMentora(
  profil: PrihlasenyProfil,
  recordingId: string,
): Promise<{ ok: true; meetingId: string } | { ok: false; chyba: string }> {
  const admin = createAdminClient()
  const { data: schuzky } = await admin
    .from('meetings')
    .select('id, mentor_id, stav')
    .eq('recording_id', recordingId)
    .neq('stav', 'zrusena')
    .limit(1)
  const schuzka = schuzky?.[0]
  if (!schuzka) return { ok: false, chyba: 'K nahrávce není přiřazena schůzka.' }

  if (profil.role === 'mentor') {
    const { data: mentor } = await admin
      .from('mentors')
      .select('id')
      .eq('profile_id', profil.id)
      .single()
    if (!mentor || mentor.id !== schuzka.mentor_id) {
      return { ok: false, chyba: 'Tato nahrávka vám není přiřazena.' }
    }
  }
  return { ok: true, meetingId: schuzka.id }
}

/** R32: mentor smí oficiální vyhodnocení před odesláním upravit; upravená verze je oficiální. */
export async function ulozUpravuReportu(
  recordingId: string,
  obsah: string,
): Promise<VysledekAkce> {
  const profil = await vyzadujRoli(['mentor', 'admin'])
  if (!obsah.trim()) return { ok: false, chyba: 'Vyhodnocení nesmí být prázdné.' }

  const pristup = await overPristupMentora(profil, recordingId)
  if (!pristup.ok) return pristup

  const admin = createAdminClient()
  const { data: report } = await admin
    .from('reports')
    .select('stav')
    .eq('recording_id', recordingId)
    .single()
  if (!report) return { ok: false, chyba: 'Report neexistuje.' }
  if (report.stav === 'odemcen') {
    return { ok: false, chyba: 'Report už je odemčený studentovi, nelze ho měnit.' }
  }

  const { error } = await admin
    .from('reports')
    .update({ obsah })
    .eq('recording_id', recordingId)
  if (error) return { ok: false, chyba: error.message }

  await admin.from('recording_events').insert({
    recording_id: recordingId,
    typ: 'report_upraven_mentorem',
    actor_profile_id: profil.id,
  })
  revalidatePath(`/nahravka/${recordingId}`)
  return { ok: true }
}

/** R33: termín schůzky se pro start zapisuje ručně (mentor nebo Verča). */
export async function zadejTerminSchuzky(
  recordingId: string,
  termin: string,
): Promise<VysledekAkce> {
  const profil = await vyzadujRoli(['mentor', 'verca', 'admin'])
  if (!termin || Number.isNaN(Date.parse(termin))) {
    return { ok: false, chyba: 'Zadejte platný termín.' }
  }

  if (profil.role === 'mentor') {
    const pristup = await overPristupMentora(profil, recordingId)
    if (!pristup.ok) return pristup
  }

  const admin = createAdminClient()
  const { data: schuzky } = await admin
    .from('meetings')
    .select('id, stav')
    .eq('recording_id', recordingId)
    .neq('stav', 'zrusena')
    .limit(1)
  const schuzka = schuzky?.[0]
  if (!schuzka) return { ok: false, chyba: 'Nejdřív musí být přiřazen mentor.' }
  if (schuzka.stav === 'dokoncena') return { ok: false, chyba: 'Schůzka už je dokončená.' }

  const { error } = await admin
    .from('meetings')
    .update({ termin: new Date(termin).toISOString(), stav: 'naplanovana' })
    .eq('id', schuzka.id)
  if (error) return { ok: false, chyba: error.message }

  await admin
    .from('recordings')
    .update({ stav: 'schuzka_planovana' })
    .eq('id', recordingId)
    .eq('stav', 'ceka_na_mentora')
  await admin.from('recording_events').insert({
    recording_id: recordingId,
    typ: 'termin_schuzky_zadan',
    detail: { termin },
    actor_profile_id: profil.id,
  })
  revalidatePath(`/nahravka/${recordingId}`)
  revalidatePath('/fronta')
  return { ok: true }
}

/**
 * R12/F4: „schůzka dokončena + report odeslán" — odemkne oficiální vyhodnocení
 * studentovi, započte položku a pošle studentovi upozornění.
 */
export async function dokonciSchuzku(recordingId: string): Promise<VysledekAkce> {
  const profil = await vyzadujRoli(['mentor', 'admin'])
  const pristup = await overPristupMentora(profil, recordingId)
  if (!pristup.ok) return pristup

  const admin = createAdminClient()
  const { data: nahravka } = await admin
    .from('recordings')
    .select('id, stav, student_id, plan_item_id')
    .eq('id', recordingId)
    .single()
  if (!nahravka) return { ok: false, chyba: 'Nahrávka nenalezena.' }
  if (!['ceka_na_mentora', 'schuzka_planovana'].includes(nahravka.stav)) {
    return { ok: false, chyba: 'Nahrávka není ve stavu před dokončením schůzky.' }
  }

  const ted = new Date().toISOString()
  await admin
    .from('meetings')
    .update({ stav: 'dokoncena', dokonceno_odeslano_at: ted })
    .eq('id', pristup.meetingId)
  const { error: chybaReportu } = await admin
    .from('reports')
    .update({
      stav: 'odemcen',
      schvalil_profile_id: profil.id,
      schvaleno_at: ted,
      odeslano_at: ted,
      odemceno_at: ted,
    })
    .eq('recording_id', recordingId)
  if (chybaReportu) return { ok: false, chyba: chybaReportu.message }

  await admin.from('recordings').update({ stav: 'zapocteno' }).eq('id', recordingId)
  await admin
    .from('plan_items')
    .update({ stav: 'splneno', splneno_at: ted })
    .eq('id', nahravka.plan_item_id)
  await admin.from('recording_events').insert({
    recording_id: recordingId,
    typ: 'schuzka_dokoncena_report_odeslan',
    actor_profile_id: profil.id,
  })

  let varovani: string | undefined
  const { data: student } = await admin
    .from('students')
    .select('profiles(jmeno, email)')
    .eq('id', nahravka.student_id)
    .single()
  if (student?.profiles) {
    const vysledekEmailu = await posliEmail({
      komu: student.profiles.email,
      predmet: 'Vaše oficiální vyhodnocení je k dispozici',
      html: vyhodnoceniOdemcenoEmail({
        jmeno: student.profiles.jmeno,
        odkazUrl: `${appUrl()}/nahravka/${recordingId}`,
      }),
    })
    if (!vysledekEmailu.ok) {
      varovani = `Dokončeno a odemčeno, ale e-mail se nepodařilo odeslat (${vysledekEmailu.chyba}).`
    }
  }

  revalidatePath(`/nahravka/${recordingId}`)
  revalidatePath('/fronta')
  return { ok: true, varovani }
}
