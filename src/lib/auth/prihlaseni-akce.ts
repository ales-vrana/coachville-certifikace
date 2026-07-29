'use server'

import { createClient } from '@supabase/supabase-js'

export interface VysledekOdeslani {
  ok: boolean
  chyba?: string
}

/**
 * Veřejná akce přihlašovací stránky: pošle magic link. Záměrně bez PKCE
 * (implicit flow) — token v e-mailu jde tokem token_hash → /auth/confirm
 * a funguje i na jiném zařízení, než kde byl vyžádán. Session v prohlížeči
 * zakládá až /auth/confirm přes cookies, klient tu nic držet nemusí.
 */
export async function posliMagicLink(email: string): Promise<VysledekOdeslani> {
  const cistyEmail = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cistyEmail)) {
    return { ok: false, chyba: 'E-mail nevypadá platně.' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false } },
  )

  const { error } = await supabase.auth.signInWithOtp({
    email: cistyEmail,
    // účty zakládá jen koordinátorka — neznámý e-mail se nesmí registrovat (R5, R22)
    options: { shouldCreateUser: false },
  })

  if (error) {
    if (error.code === 'otp_disabled' || /signups not allowed/i.test(error.message)) {
      return {
        ok: false,
        chyba: 'Tento e-mail v systému nemáme. Zkontrolujte překlepy, případně napište Verče.',
      }
    }
    if (error.status === 429) {
      return { ok: false, chyba: 'Příliš mnoho pokusů za sebou. Počkejte chvíli a zkuste to znovu.' }
    }
    return { ok: false, chyba: 'Odkaz se nepodařilo odeslat. Zkuste to prosím za chvíli znovu.' }
  }
  return { ok: true }
}
