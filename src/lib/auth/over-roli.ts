import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type Role = 'student' | 'mentor' | 'verca' | 'meira' | 'admin'

export interface PrihlasenyProfil {
  id: string
  jmeno: string
  email: string
  role: Role
}

/** Vrátí profil přihlášeného uživatele, nebo null. */
export async function nactiProfil(): Promise<PrihlasenyProfil | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, jmeno, email, role')
    .eq('id', user.id)
    .single()
  return data as PrihlasenyProfil | null
}

/**
 * Stráž pro stránky a server actions: nepřihlášeného pošle na /prihlaseni,
 * přihlášeného bez oprávnění na /prehled (přístupová matice, kap. 6 zadání).
 */
export async function vyzadujRoli(povolene: Role[]): Promise<PrihlasenyProfil> {
  const profil = await nactiProfil()
  if (!profil) redirect('/prihlaseni')
  if (!povolene.includes(profil.role)) redirect('/prehled')
  return profil
}
