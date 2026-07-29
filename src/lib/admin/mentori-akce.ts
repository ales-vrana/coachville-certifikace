'use server'

import { revalidatePath } from 'next/cache'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { createAdminClient } from '@/lib/supabase/admin'

export interface VysledekAkce {
  ok: boolean
  chyba?: string
}

/** Založí mentora: auth účet (magic link) + profil s rolí mentor + záznam mentora (R8). */
export async function pridejMentora(vstup: {
  jmeno: string
  email: string
  calendlyUrl?: string
}): Promise<VysledekAkce> {
  await vyzadujRoli(['admin'])
  const jmeno = vstup.jmeno.trim()
  const email = vstup.email.trim().toLowerCase()
  if (!jmeno) return { ok: false, chyba: 'Vyplňte jméno.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, chyba: 'E-mail nevypadá platně.' }
  }

  const admin = createAdminClient()
  const { data: novy, error: chybaAuth } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (chybaAuth || !novy?.user) {
    if (chybaAuth?.code === 'email_exists') {
      return { ok: false, chyba: 'Uživatel s tímto e-mailem už v systému existuje.' }
    }
    return { ok: false, chyba: `Účet se nepodařilo založit: ${chybaAuth?.message ?? ''}` }
  }
  const userId = novy.user.id

  const { error: chybaProfilu } = await admin
    .from('profiles')
    .insert({ id: userId, jmeno, email, role: 'mentor' })
  if (chybaProfilu) {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    return { ok: false, chyba: `Profil se nepodařilo uložit: ${chybaProfilu.message}` }
  }

  const { error: chybaMentora } = await admin.from('mentors').insert({
    profile_id: userId,
    calendly_url: vstup.calendlyUrl?.trim() || null,
  })
  if (chybaMentora) {
    await admin.from('profiles').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    return { ok: false, chyba: `Mentora se nepodařilo uložit: ${chybaMentora.message}` }
  }

  revalidatePath('/admin/mentori')
  return { ok: true }
}

export async function upravMentora(
  mentorId: string,
  zmeny: {
    calendlyUrl?: string
    calendlyEmbed?: string
    mcsStav?: 'nema' | 'v_priprave' | 'ziskano'
    aktivni?: boolean
  },
): Promise<VysledekAkce> {
  await vyzadujRoli(['admin'])
  const admin = createAdminClient()

  const { error } = await admin
    .from('mentors')
    .update({
      ...(zmeny.calendlyUrl !== undefined && { calendly_url: zmeny.calendlyUrl.trim() || null }),
      ...(zmeny.calendlyEmbed !== undefined && {
        calendly_embed: zmeny.calendlyEmbed.trim() || null,
      }),
      ...(zmeny.mcsStav !== undefined && { mcs_stav: zmeny.mcsStav }),
      ...(zmeny.aktivni !== undefined && { aktivni: zmeny.aktivni }),
    })
    .eq('id', mentorId)
  if (error) return { ok: false, chyba: error.message }

  revalidatePath('/admin/mentori')
  return { ok: true }
}
