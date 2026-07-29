import { formatujDatum } from '@/lib/popisky'

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function obal(obsah: string): string {
  return `<div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #18181b; line-height: 1.6;">
  <p style="font-size: 13px; color: #71717a; margin: 0 0 24px;">CoachVille certifikace</p>
  ${obsah}
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0 16px;">
  <p style="font-size: 12px; color: #a1a1aa;">Tento e-mail poslal systém certifikace CoachVille. Pokud si nevíte rady, odpovězte na něj — ozve se vám Verča.</p>
</div>`
}

function tlacitko(url: string, text: string): string {
  return `<p style="margin: 24px 0;"><a href="${url}" style="display: inline-block; background: #18181b; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">${text}</a></p>`
}

export function uvitaciEmail(vstup: {
  jmeno: string
  odkazUrl: string
  prihlaseniUrl: string
  pocetPolozek: number
  prvniTermin: Date
}): string {
  return obal(`
  <h1 style="font-size: 20px; margin: 0 0 16px;">Vítejte, ${escapeHtml(vstup.jmeno)}!</h1>
  <p>Byl vám založen účet v systému, přes který budete odevzdávat koučovací nahrávky ke své certifikaci.</p>
  <p>Váš individuální plán je připravený: čeká vás <strong>${vstup.pocetPolozek} nahrávek</strong> a první termín je <strong>${formatujDatum(vstup.prvniTermin)}</strong>. Všechny termíny uvidíte po přihlášení — systém vám je bude včas připomínat.</p>
  ${tlacitko(vstup.odkazUrl, 'Přihlásit se do systému')}
  <p style="font-size: 13px; color: #71717a;">Odkaz platí přibližně hodinu a je jednorázový. Pokud vyprší, nechte si na <a href="${vstup.prihlaseniUrl}">přihlašovací stránce</a> poslat nový — stačí zadat tento e-mail. Hesla nepoužíváme.</p>
  <p style="font-size: 13px; color: #71717a;">Jak to funguje: nahrávky pořizujete se souhlasem klienta namluveným na začátku nahrávky (klient neuvádí příjmení). Nahrávat můžete z počítače i mobilu, v jakémkoli formátu.</p>`)
}

export function prihlasovaciEmail(vstup: { jmeno: string; odkazUrl: string; prihlaseniUrl: string }): string {
  return obal(`
  <h1 style="font-size: 20px; margin: 0 0 16px;">Váš přihlašovací odkaz</h1>
  <p>Dobrý den, ${escapeHtml(vstup.jmeno)}, tady je nový jednorázový odkaz do systému certifikace:</p>
  ${tlacitko(vstup.odkazUrl, 'Přihlásit se do systému')}
  <p style="font-size: 13px; color: #71717a;">Odkaz platí přibližně hodinu. Pokud vyprší, nechte si na <a href="${vstup.prihlaseniUrl}">přihlašovací stránce</a> poslat nový.</p>`)
}
