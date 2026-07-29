import 'server-only'
import { Resend } from 'resend'

// Odesílatel dle R24; odpovědi směřují na koordinátorku (kap. 11 zadání)
const ODESILATEL = 'CoachVille certifikace <notifikace@coachville.eu>'
const REPLY_TO = 'delivery@coachville.eu'

/** Základ URL pro odkazy v e-mailech (v produkci doména, lokálně localhost). */
export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://certifikace.coachville.eu'
}

export async function posliEmail(vstup: {
  komu: string
  predmet: string
  html: string
}): Promise<{ ok: boolean; chyba?: string }> {
  const klic = process.env.RESEND_API_KEY
  if (!klic || !klic.startsWith('re_')) {
    return { ok: false, chyba: 'RESEND_API_KEY není nastaven' }
  }
  const resend = new Resend(klic)
  const { error } = await resend.emails.send({
    from: ODESILATEL,
    replyTo: REPLY_TO,
    to: vstup.komu,
    subject: vstup.predmet,
    html: vstup.html,
  })
  return error ? { ok: false, chyba: error.message } : { ok: true }
}
