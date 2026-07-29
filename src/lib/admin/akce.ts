'use server'

import { revalidatePath } from 'next/cache'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { createAdminClient } from '@/lib/supabase/admin'

export interface VysledekAkce {
  ok: boolean
  chyba?: string
}

/**
 * Uloží nový Master Prompt jako novou verzi a aktivuje ji (R14: verzování,
 * žádné přepisování — každý report nese verzi promptu, kterou vznikl).
 */
export async function ulozNovyPrompt(
  typ: 'dlouha' | 'kratka',
  obsah: string,
): Promise<VysledekAkce> {
  const profil = await vyzadujRoli(['admin'])
  if (!obsah.trim()) return { ok: false, chyba: 'Prompt nesmí být prázdný.' }
  if (!['dlouha', 'kratka'].includes(typ)) return { ok: false, chyba: 'Neplatný typ.' }

  const admin = createAdminClient()
  const { data: posledni } = await admin
    .from('master_prompts')
    .select('verze')
    .eq('typ', typ)
    .order('verze', { ascending: false })
    .limit(1)
    .single()

  await admin.from('master_prompts').update({ aktivni: false }).eq('typ', typ)
  const { error } = await admin.from('master_prompts').insert({
    typ,
    verze: (posledni?.verze ?? 0) + 1,
    obsah,
    aktivni: true,
    created_by_profile_id: profil.id,
  })
  if (error) return { ok: false, chyba: error.message }

  revalidatePath('/admin')
  return { ok: true }
}

/** Aktivuje starší verzi promptu (návrat po nepovedené změně). */
export async function aktivujVerziPromptu(promptId: string): Promise<VysledekAkce> {
  await vyzadujRoli(['admin'])
  const admin = createAdminClient()

  const { data: prompt } = await admin
    .from('master_prompts')
    .select('id, typ')
    .eq('id', promptId)
    .single()
  if (!prompt) return { ok: false, chyba: 'Verze nenalezena.' }

  await admin.from('master_prompts').update({ aktivni: false }).eq('typ', prompt.typ)
  const { error } = await admin
    .from('master_prompts')
    .update({ aktivni: true })
    .eq('id', prompt.id)
  if (error) return { ok: false, chyba: error.message }

  revalidatePath('/admin')
  return { ok: true }
}

/** Přidá text do knihovny ICF standardů (vkládá se do kontextu vyhodnocení). */
export async function pridejStandard(nazev: string, obsah: string): Promise<VysledekAkce> {
  await vyzadujRoli(['admin'])
  if (!nazev.trim() || !obsah.trim()) {
    return { ok: false, chyba: 'Vyplňte název i obsah.' }
  }

  const admin = createAdminClient()
  const { data: posledni } = await admin
    .from('standards')
    .select('poradi')
    .order('poradi', { ascending: false })
    .limit(1)
    .single()

  const { error } = await admin.from('standards').insert({
    nazev: nazev.trim(),
    obsah,
    poradi: (posledni?.poradi ?? 0) + 1,
  })
  if (error) return { ok: false, chyba: error.message }

  revalidatePath('/admin')
  return { ok: true }
}

export async function prepniStandard(id: string, aktivni: boolean): Promise<VysledekAkce> {
  await vyzadujRoli(['admin'])
  const admin = createAdminClient()
  const { error } = await admin.from('standards').update({ aktivni }).eq('id', id)
  if (error) return { ok: false, chyba: error.message }
  revalidatePath('/admin')
  return { ok: true }
}
