'use server'

import { revalidatePath } from 'next/cache'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { createAdminClient } from '@/lib/supabase/admin'

export interface VysledekAkce {
  ok: boolean
  chyba?: string
}

/**
 * R19/R35: Meira označí úhradu. U poplatku 500 Kč se položka vrátí do plánu
 * s dodatečným termínem +14 dní (Meira ho může v editaci plánu doladit).
 */
export async function oznacUhrazeno(paymentId: string): Promise<VysledekAkce> {
  const profil = await vyzadujRoli(['meira', 'admin'])
  const admin = createAdminClient()

  const { data: platba } = await admin
    .from('payments')
    .select('id, stav, typ, plan_item_id, student_id')
    .eq('id', paymentId)
    .single()
  if (!platba) return { ok: false, chyba: 'Platba nenalezena.' }
  if (platba.stav === 'uhrazeno') return { ok: false, chyba: 'Platba už je označená.' }

  const ted = new Date().toISOString()
  const { error } = await admin
    .from('payments')
    .update({ stav: 'uhrazeno', uhrazeno_oznacil_profile_id: profil.id, uhrazeno_at: ted })
    .eq('id', paymentId)
  if (error) return { ok: false, chyba: error.message }

  if (platba.typ === 'dodatecny_termin_500' && platba.plan_item_id) {
    const novyTermin = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)
    await admin
      .from('plan_items')
      .update({ stav: 'naplanovano', termin: novyTermin })
      .eq('id', platba.plan_item_id)
      .eq('stav', 'ceka_na_poplatek')
  }

  revalidatePath(`/studenti/${platba.student_id}`)
  return { ok: true }
}
