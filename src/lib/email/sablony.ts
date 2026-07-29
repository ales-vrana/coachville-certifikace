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

export function uploadPotvrzeniEmail(vstup: { jmeno: string; polozka: string }): string {
  return obal(`
  <h1 style="font-size: 20px; margin: 0 0 16px;">Nahrávka přijata ✓</h1>
  <p>Dobrý den, ${escapeHtml(vstup.jmeno)}, vaše nahrávka k položce <strong>${escapeHtml(vstup.polozka)}</strong> je v pořádku odevzdaná a systém ji zpracovává. Nemusíte dělat nic dalšího — stav uvidíte na svém přehledu.</p>`)
}

export function prirazeniMentoroviEmail(vstup: {
  mentorJmeno: string
  studentJmeno: string
  odkazUrl: string
}): string {
  return obal(`
  <h1 style="font-size: 20px; margin: 0 0 16px;">Nová nahrávka k mentorské schůzce</h1>
  <p>Dobrý den, ${escapeHtml(vstup.mentorJmeno)}, byla vám přiřazena dlouhá nahrávka studenta <strong>${escapeHtml(vstup.studentJmeno)}</strong>. Najdete u ní audio, transkript i vyhodnocení, které můžete před odesláním upravit.</p>
  <p>Schůzka se studentem má proběhnout <strong>do 30 dnů</strong>. Termín si domluvte přes Calendly, nebo ho zapíše Verča.</p>
  ${tlacitko(vstup.odkazUrl, 'Otevřít nahrávku')}`)
}

export function kratkyReportEmail(vstup: {
  jmeno: string
  reportText: string
  odkazUrl: string
}): string {
  return obal(`
  <h1 style="font-size: 20px; margin: 0 0 16px;">Zpětná vazba k vaší nahrávce</h1>
  <p>Dobrý den, ${escapeHtml(vstup.jmeno)}, k vaší krátké nahrávce je připravena zpětná vazba:</p>
  <div style="white-space: pre-wrap; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; font-size: 14px;">${escapeHtml(vstup.reportText)}</div>
  <p style="margin-top: 16px;">Zpětnou vazbu najdete i ve svém profilu:</p>
  ${tlacitko(vstup.odkazUrl, 'Otevřít v systému')}`)
}

export function vyhodnoceniOdemcenoEmail(vstup: { jmeno: string; odkazUrl: string }): string {
  return obal(`
  <h1 style="font-size: 20px; margin: 0 0 16px;">Vyhodnocení je k dispozici</h1>
  <p>Dobrý den, ${escapeHtml(vstup.jmeno)}, po schůzce s mentorem je vaše oficiální vyhodnocení odemčené — najdete ho u nahrávky ve svém profilu.</p>
  ${tlacitko(vstup.odkazUrl, 'Zobrazit vyhodnocení')}`)
}

export function pripominkaEmail(vstup: {
  jmeno: string
  polozka: string
  termin: string
  kdy: string
  odkazUrl: string
}): string {
  return obal(`
  <h1 style="font-size: 20px; margin: 0 0 16px;">Připomínka: ${escapeHtml(vstup.kdy)}</h1>
  <p>Dobrý den, ${escapeHtml(vstup.jmeno)}, položka vašeho certifikačního plánu <strong>${escapeHtml(vstup.polozka)}</strong> má termín <strong>${escapeHtml(vstup.termin)}</strong>.</p>
  <p>Nahrávku odevzdáte během pár minut z počítače i mobilu:</p>
  ${tlacitko(vstup.odkazUrl, 'Nahrát nahrávku')}
  <p style="font-size: 13px; color: #71717a;">Pokud termín nestíháte, ozvěte se Verče — společně najdete řešení. Po 14 dnech po termínu se podle podmínek programu účtuje poplatek 500 Kč za nový termín a zpracování.</p>`)
}

export function eskalaceEmail(vstup: {
  komu: string
  studentJmeno: string
  polozka: string
  termin: string
  dniPoTerminu: number
  odkazUrl: string
}): string {
  return obal(`
  <h1 style="font-size: 20px; margin: 0 0 16px;">Student neplní: ${escapeHtml(vstup.studentJmeno)}</h1>
  <p>Dobrý den, ${escapeHtml(vstup.komu)}, položka <strong>${escapeHtml(vstup.polozka)}</strong> studenta <strong>${escapeHtml(vstup.studentJmeno)}</strong> je <strong>${vstup.dniPoTerminu} dní po termínu</strong> (${escapeHtml(vstup.termin)}).</p>
  ${vstup.dniPoTerminu >= 14 ? '<p><strong>Položka přešla do režimu poplatku 500 Kč</strong> — studentovi odešel platební odkaz a po označení úhrady dostane nový termín.</p>' : '<p>Doporučený krok: převzít kontakt se studentem.</p>'}
  ${tlacitko(vstup.odkazUrl, 'Otevřít detail studenta')}`)
}

export function poplatekEmail(vstup: {
  jmeno: string
  polozka: string
  termin: string
  stripeUrl: string | null
  odkazUrl: string
}): string {
  return obal(`
  <h1 style="font-size: 20px; margin: 0 0 16px;">Nový termín vyhodnocení — poplatek 500 Kč</h1>
  <p>Dobrý den, ${escapeHtml(vstup.jmeno)}, položka <strong>${escapeHtml(vstup.polozka)}</strong> s termínem ${escapeHtml(vstup.termin)} je více než 14 dní po termínu. Podle podmínek programu je pro stanovení dodatečného termínu a zpracování potřeba uhradit poplatek <strong>500 Kč</strong>.</p>
  ${vstup.stripeUrl ? tlacitko(vstup.stripeUrl, 'Zaplatit 500 Kč') : '<p><strong>Platební pokyny vám pošle koordinátorka Meira.</strong></p>'}
  <p style="font-size: 13px; color: #71717a;">Po připsání platby vám koordinátorka potvrdí nový termín a pokračujete dál. Pokud se něco děje a potřebujete to probrat, odpovězte na tento e-mail.</p>
  ${tlacitko(vstup.odkazUrl, 'Otevřít můj přehled')}`)
}

export function vraceniEmail(vstup: {
  jmeno: string
  polozka: string
  duvod: string
  prvniOprava: boolean
  odkazUrl: string
}): string {
  return obal(`
  <h1 style="font-size: 20px; margin: 0 0 16px;">Nahrávku je potřeba nahrát znovu</h1>
  <p>Dobrý den, ${escapeHtml(vstup.jmeno)}, vaši nahrávku k položce <strong>${escapeHtml(vstup.polozka)}</strong> se nepodařilo technicky zpracovat (${escapeHtml(vstup.duvod)}). Nahrávka se nepočítá jako odevzdaná.</p>
  <p>${vstup.prvniOprava ? 'První opravná nahrávka je <strong>zdarma</strong> — stačí ji nahrát znovu.' : 'Podle podmínek programu je druhá a další opravná nahrávka za <strong>1 000 Kč</strong> (fakturu pošle koordinátorka). Nahrávku prosím nahrajte znovu.'}</p>
  ${tlacitko(vstup.odkazUrl, 'Nahrát znovu')}
  <p style="font-size: 13px; color: #71717a;">Tip: před odevzdáním si kousek nahrávky přehrajte a zkontrolujte, že je slyšet zvuk.</p>`)
}

export function hlidaniSchuzkyVerceEmail(vstup: {
  komu: string
  studentJmeno: string
  stavText: string
  odkazUrl: string
}): string {
  return obal(`
  <h1 style="font-size: 20px; margin: 0 0 16px;">Dlouhá nahrávka čeká: ${escapeHtml(vstup.studentJmeno)}</h1>
  <p>Dobrý den, ${escapeHtml(vstup.komu)}, dlouhá nahrávka studenta <strong>${escapeHtml(vstup.studentJmeno)}</strong> je vyhodnocená a ${escapeHtml(vstup.stavText)}. Schůzka má proběhnout do 30 dnů od vyhodnocení.</p>
  ${tlacitko(vstup.odkazUrl, 'Otevřít frontu')}`)
}
