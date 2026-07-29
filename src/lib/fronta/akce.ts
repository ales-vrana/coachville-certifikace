'use server'

import { revalidatePath } from 'next/cache'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { appUrl, posliEmail } from '@/lib/email/odesilatel'
import { kratkyReportEmail, prirazeniMentoroviEmail } from '@/lib/email/sablony'
import { createAdminClient } from '@/lib/supabase/admin'

export interface VysledekAkce {
  ok: boolean
  chyba?: string
  varovani?: string
}

/** F4: Verča přiřadí mentora k vyhodnocené dlouhé nahrávce; mentor dostane e-mail. */
export async function priradMentora(
  recordingId: string,
  mentorId: string,
): Promise<VysledekAkce> {
  await vyzadujRoli(['verca', 'admin'])
  const admin = createAdminClient()

  const { data: nahravka } = await admin
    .from('recordings')
    .select('id, stav, student_id')
    .eq('id', recordingId)
    .single()
  if (!nahravka) return { ok: false, chyba: 'Nahrávka nenalezena.' }
  if (nahravka.stav !== 'ceka_na_mentora') {
    return { ok: false, chyba: 'Nahrávka nečeká na přiřazení mentora.' }
  }

  const { data: existujici } = await admin
    .from('meetings')
    .select('id')
    .eq('recording_id', recordingId)
    .neq('stav', 'zrusena')
    .limit(1)
  if (existujici?.length) return { ok: false, chyba: 'Nahrávka už mentora přiřazeného má.' }

  const { data: mentor } = await admin
    .from('mentors')
    .select('id, aktivni, profiles(jmeno, email)')
    .eq('id', mentorId)
    .single()
  if (!mentor?.aktivni) return { ok: false, chyba: 'Mentor nenalezen nebo není aktivní.' }

  const { error } = await admin
    .from('meetings')
    .insert({ recording_id: recordingId, mentor_id: mentorId, stav: 'bez_terminu' })
  if (error) return { ok: false, chyba: error.message }

  await admin.from('recording_events').insert({
    recording_id: recordingId,
    typ: 'mentor_prirazen',
    detail: { mentor: mentor.profiles?.jmeno ?? mentorId },
  })

  let varovani: string | undefined
  const { data: student } = await admin
    .from('students')
    .select('profiles(jmeno)')
    .eq('id', nahravka.student_id)
    .single()
  const vysledekEmailu = await posliEmail({
    komu: mentor.profiles!.email,
    predmet: `Nová nahrávka k mentorské schůzce — ${student?.profiles?.jmeno ?? 'student'}`,
    html: prirazeniMentoroviEmail({
      mentorJmeno: mentor.profiles!.jmeno,
      studentJmeno: student?.profiles?.jmeno ?? 'student',
      odkazUrl: `${appUrl()}/nahravka/${recordingId}`,
    }),
  })
  if (!vysledekEmailu.ok) {
    varovani = `Mentor je přiřazen, ale e-mail se nepodařilo odeslat (${vysledekEmailu.chyba}).`
  }

  revalidatePath('/fronta')
  revalidatePath(`/nahravka/${recordingId}`)
  return { ok: true, varovani }
}

/** F5: Verča (případně po úpravě) schválí krátký report — odejde studentovi a započte se. */
export async function schvalKratkyReport(
  recordingId: string,
  upravenyObsah: string,
): Promise<VysledekAkce> {
  const profil = await vyzadujRoli(['verca', 'admin'])
  if (!upravenyObsah.trim()) return { ok: false, chyba: 'Report nesmí být prázdný.' }

  const admin = createAdminClient()
  const { data: nahravka } = await admin
    .from('recordings')
    .select('id, stav, student_id, plan_item_id')
    .eq('id', recordingId)
    .single()
  if (!nahravka) return { ok: false, chyba: 'Nahrávka nenalezena.' }
  if (nahravka.stav !== 'ceka_na_schvaleni') {
    return { ok: false, chyba: 'Report nečeká na schválení.' }
  }

  const ted = new Date().toISOString()
  const { error: chybaReportu } = await admin
    .from('reports')
    .update({
      obsah: upravenyObsah,
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
    typ: 'report_schvalen_a_odeslan',
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
      predmet: 'Zpětná vazba k vaší nahrávce',
      html: kratkyReportEmail({
        jmeno: student.profiles.jmeno,
        reportText: upravenyObsah,
        odkazUrl: `${appUrl()}/nahravka/${recordingId}`,
      }),
    })
    if (!vysledekEmailu.ok) {
      varovani = `Report je schválen a započten, ale e-mail se nepodařilo odeslat (${vysledekEmailu.chyba}). Student ho uvidí v profilu.`
    }
  }

  revalidatePath('/fronta')
  revalidatePath(`/nahravka/${recordingId}`)
  return { ok: true, varovani }
}
