'use server'

import { revalidatePath } from 'next/cache'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { createAdminClient } from '@/lib/supabase/admin'

export interface VysledekAkce {
  ok: boolean
  chyba?: string
}

/** Povolené klíče nastavení — nic jiného přes tuto akci uložit nejde. */
const POVOLENE_KLICE = ['stripe_link_500', 'text_jak_na_to', 'text_podminky'] as const
export type KlicNastaveni = (typeof POVOLENE_KLICE)[number]

export async function ulozNastaveni(klic: KlicNastaveni, hodnota: string): Promise<VysledekAkce> {
  const profil = await vyzadujRoli(['admin'])
  if (!POVOLENE_KLICE.includes(klic)) return { ok: false, chyba: 'Neznámý klíč nastavení.' }
  if (klic === 'stripe_link_500' && hodnota.trim() && !/^https:\/\//.test(hodnota.trim())) {
    return { ok: false, chyba: 'Stripe odkaz musí začínat https://' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('settings').upsert({
    key: klic,
    value: hodnota.trim(),
    updated_at: new Date().toISOString(),
    updated_by_profile_id: profil.id,
  })
  if (error) return { ok: false, chyba: error.message }

  revalidatePath('/admin/nastaveni')
  revalidatePath('/jak-na-to')
  revalidatePath('/podminky')
  return { ok: true }
}
