'use server'

import { revalidatePath } from 'next/cache'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { appUrl, posliEmail } from '@/lib/email/odesilatel'
import { prihlasovaciEmail, uvitaciEmail } from '@/lib/email/sablony'
import type { Program } from '@/lib/plan/typy'
import { createAdminClient } from '@/lib/supabase/admin'

export interface VysledekZalozeni {
  ok: boolean
  chyba?: string
  varovani?: string
  studentId?: string
}

/**
 * F1 Onboarding (kap. 7 zadání): účet → profil → student → uvítací e-mail.
 * Plán termínů se při založení negeneruje — vznikne až návrhem Veroniky po
 * telefonátu se studentem a student ho potvrzuje e-mailem (use case návrhu plánu).
 */
export async function zalozStudenta(
  _predchozi: VysledekZalozeni | null,
  formData: FormData,
): Promise<VysledekZalozeni> {
  await vyzadujRoli(['meira', 'admin'])
  const admin = createAdminClient()

  const jmeno = String(formData.get('jmeno') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const program = String(formData.get('program') ?? '') as Program
  const datumStartu = String(formData.get('datum_startu') ?? '')
  const skupina = String(formData.get('skupina') ?? '').trim()

  if (!jmeno) return { ok: false, chyba: 'Vyplňte jméno a příjmení.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, chyba: 'E-mail nevypadá platně.' }
  }
  if (!['acc', 'upgrade_pcc', 'komplet'].includes(program)) {
    return { ok: false, chyba: 'Vyberte program.' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datumStartu)) {
    return { ok: false, chyba: 'Vyplňte datum startu.' }
  }

  const { data: novy, error: chybaAuth } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (chybaAuth || !novy?.user) {
    if (chybaAuth?.code === 'email_exists') {
      return { ok: false, chyba: 'Uživatel s tímto e-mailem už v systému existuje.' }
    }
    return { ok: false, chyba: `Účet se nepodařilo založit: ${chybaAuth?.message ?? 'neznámá chyba'}` }
  }
  const userId = novy.user.id
  const smazAuth = () => admin.auth.admin.deleteUser(userId).catch(() => {})

  const { error: chybaProfilu } = await admin
    .from('profiles')
    .insert({ id: userId, jmeno, email, role: 'student' })
  if (chybaProfilu) {
    await smazAuth()
    return { ok: false, chyba: `Profil se nepodařilo uložit: ${chybaProfilu.message}` }
  }

  const { data: student, error: chybaStudenta } = await admin
    .from('students')
    .insert({
      profile_id: userId,
      program,
      datum_startu: datumStartu,
      skupina: skupina || null,
    })
    .select('id')
    .single()
  if (chybaStudenta || !student) {
    await admin.from('profiles').delete().eq('id', userId)
    await smazAuth()
    return {
      ok: false,
      chyba: `Studenta se nepodařilo uložit: ${chybaStudenta?.message ?? 'neznámá chyba'}`,
    }
  }

  let varovani: string | undefined
  const { data: odkaz, error: chybaOdkazu } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (chybaOdkazu || !odkaz) {
    varovani =
      'Student je založen, ale přihlašovací odkaz se nepodařilo vygenerovat. Pošlete ho znovu z detailu studenta.'
  } else {
    const odkazUrl = `${appUrl()}/auth/confirm?token_hash=${odkaz.properties.hashed_token}&type=magiclink`
    const email_vysledek = await posliEmail({
      komu: email,
      predmet: 'Vítejte v systému certifikace CoachVille',
      html: uvitaciEmail({
        jmeno,
        odkazUrl,
        prihlaseniUrl: `${appUrl()}/prihlaseni`,
      }),
    })
    if (!email_vysledek.ok) {
      varovani = `Student je založen, ale uvítací e-mail se nepodařilo odeslat (${email_vysledek.chyba}). Pošlete odkaz z detailu studenta.`
    }
  }

  revalidatePath('/studenti')
  return { ok: true, studentId: student.id, varovani }
}

/** Tlačítko Meiry „poslat nový přihlašovací odkaz" (kap. 6 zadání). */
export async function posliPrihlasovaciOdkaz(
  studentId: string,
): Promise<{ ok: boolean; chyba?: string }> {
  await vyzadujRoli(['meira', 'admin'])
  const admin = createAdminClient()

  const { data: student } = await admin
    .from('students')
    .select('profile_id')
    .eq('id', studentId)
    .single()
  if (!student) return { ok: false, chyba: 'Student nenalezen.' }

  const { data: profil } = await admin
    .from('profiles')
    .select('jmeno, email')
    .eq('id', student.profile_id)
    .single()
  if (!profil) return { ok: false, chyba: 'Profil studenta nenalezen.' }

  const { data: odkaz, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: profil.email,
  })
  if (error || !odkaz) {
    return { ok: false, chyba: `Odkaz se nepodařilo vygenerovat: ${error?.message ?? ''}` }
  }

  const odkazUrl = `${appUrl()}/auth/confirm?token_hash=${odkaz.properties.hashed_token}&type=magiclink`
  const vysledek = await posliEmail({
    komu: profil.email,
    predmet: 'Přihlašovací odkaz do systému certifikace',
    html: prihlasovaciEmail({
      jmeno: profil.jmeno,
      odkazUrl,
      prihlaseniUrl: `${appUrl()}/prihlaseni`,
    }),
  })
  if (!vysledek.ok) return { ok: false, chyba: `E-mail se nepodařilo odeslat: ${vysledek.chyba}` }
  return { ok: true }
}
