import 'server-only'
import { appUrl, posliEmail } from '@/lib/email/odesilatel'
import {
  eskalaceEmail,
  hlidaniSchuzkyVerceEmail,
  poplatekEmail,
  pripominkaEmail,
} from '@/lib/email/sablony'
import { TYP_POLOZKY_POPISKY, formatujDatum } from '@/lib/popisky'
import { createAdminClient } from '@/lib/supabase/admin'

/** Notifikační kaskáda R20: offset ve dnech vůči termínu → typ notifikace. */
const KASKADA_STUDENT: Array<{ offset: number; typ: string; kdy: string }> = [
  { offset: -21, typ: 'pripominka_21_pred', kdy: 'termín za 3 týdny' },
  { offset: -14, typ: 'pripominka_14_pred', kdy: 'termín za 2 týdny' },
  { offset: -7, typ: 'pripominka_7_pred', kdy: 'termín za týden' },
  { offset: -3, typ: 'pripominka_3_pred', kdy: 'termín za 3 dny' },
  { offset: 0, typ: 'pripominka_den_d', kdy: 'dnes je den D' },
  { offset: 3, typ: 'pripominka_3_po', kdy: 'termín byl před 3 dny — dodejte nahrávku' },
]

export interface VysledekKontroly {
  odeslanychNotifikaci: number
  poplatkuZalozeno: number
  chyby: string[]
}

interface Prijemce {
  jmeno: string
  email: string
}

/**
 * Denní kontrola (spouští Vercel Cron přes /api/zpracuj):
 * kaskáda připomínek R20, přechod po termínu, režim poplatku 500 Kč po 14
 * dnech (F6, R19) a hlídání schůzek k dlouhým nahrávkám (R34).
 */
export async function spustDenniKontrolu(): Promise<VysledekKontroly> {
  const admin = createAdminClient()
  const vysledek: VysledekKontroly = { odeslanychNotifikaci: 0, poplatkuZalozeno: 0, chyby: [] }
  const dnes = new Date()
  const dnesIso = dnes.toISOString().slice(0, 10)

  // příjemci provozních notifikací
  const { data: staff } = await admin
    .from('profiles')
    .select('jmeno, email, role')
    .in('role', ['verca', 'admin'])
  const verci: Prijemce[] = (staff ?? []).filter((s) => s.role === 'verca')
  const admini: Prijemce[] = (staff ?? []).filter((s) => s.role === 'admin')
  // dokud Verča nemá účet, dostávají provozní upozornění admini (fallback)
  const provozni = verci.length ? verci : admini

  const uzOdeslano = async (typ: string, planItemId: string, email: string) => {
    const { data } = await admin
      .from('notifications')
      .select('id')
      .eq('typ', typ)
      .eq('plan_item_id', planItemId)
      .eq('prijemce_email', email)
      .limit(1)
    return !!data?.length
  }

  const posliAZaloguj = async (vstup: {
    typ: string
    komu: Prijemce
    predmet: string
    html: string
    planItemId?: string
    recordingId?: string
  }) => {
    const odeslano = await posliEmail({
      komu: vstup.komu.email,
      predmet: vstup.predmet,
      html: vstup.html,
    })
    await admin.from('notifications').insert({
      prijemce_email: vstup.komu.email,
      typ: vstup.typ,
      predmet: vstup.predmet,
      plan_item_id: vstup.planItemId ?? null,
      recording_id: vstup.recordingId ?? null,
      odeslano_at: new Date().toISOString(),
      doruceno: odeslano.ok,
      chyba: odeslano.ok ? null : odeslano.chyba,
    })
    if (odeslano.ok) vysledek.odeslanychNotifikaci++
    else vysledek.chyby.push(`${vstup.typ} → ${vstup.komu.email}: ${odeslano.chyba}`)
  }

  // ---------- 1) kaskáda k termínům položek (R20) ----------
  const { data: polozky } = await admin
    .from('plan_items')
    .select('id, poradi, typ, termin, stav, student_id')
    .in('stav', ['naplanovano', 'po_terminu'])
  const studentIds = [...new Set((polozky ?? []).map((p) => p.student_id))]
  const { data: studenti } = studentIds.length
    ? await admin.from('students').select('id, profile_id, profiles(jmeno, email)').in('id', studentIds)
    : { data: [] }
  const studentMap = new Map((studenti ?? []).map((s) => [s.id, s]))

  for (const polozka of polozky ?? []) {
    const student = studentMap.get(polozka.student_id)
    if (!student?.profiles) continue
    const prijemce: Prijemce = student.profiles
    const popisPolozky = `${polozka.poradi}. ${TYP_POLOZKY_POPISKY[polozka.typ]}`
    const dniDoTerminu = Math.round(
      (Date.parse(polozka.termin) - Date.parse(dnesIso)) / 86_400_000,
    )
    const dniPoTerminu = -dniDoTerminu

    // přechod naplanovano → po_terminu
    if (polozka.stav === 'naplanovano' && dniPoTerminu > 0) {
      await admin.from('plan_items').update({ stav: 'po_terminu' }).eq('id', polozka.id)
      polozka.stav = 'po_terminu'
    }

    // připomínky studentovi (offsety −21 … +3, R20); posílá se v den offsetu,
    // dedup přes notifications, takže opožděný cron nezpůsobí duplicitu
    const aktualni = KASKADA_STUDENT.find((k) => k.offset === -dniDoTerminu)
    if (aktualni && !(await uzOdeslano(aktualni.typ, polozka.id, prijemce.email))) {
      await posliAZaloguj({
        typ: aktualni.typ,
        komu: prijemce,
        predmet: `Připomínka: ${popisPolozky} — ${aktualni.kdy}`,
        html: pripominkaEmail({
          jmeno: prijemce.jmeno,
          polozka: popisPolozky,
          termin: formatujDatum(polozka.termin),
          kdy: aktualni.kdy,
          odkazUrl: `${appUrl()}/prehled`,
        }),
        planItemId: polozka.id,
      })
    }

    // Verče 4 dny po termínu
    if (dniPoTerminu >= 4) {
      for (const p of provozni) {
        if (!(await uzOdeslano('eskalace_4_po', polozka.id, p.email))) {
          await posliAZaloguj({
            typ: 'eskalace_4_po',
            komu: p,
            predmet: `Student neplní: ${prijemce.jmeno} (${dniPoTerminu} dní po termínu)`,
            html: eskalaceEmail({
              komu: p.jmeno,
              studentJmeno: prijemce.jmeno,
              polozka: popisPolozky,
              termin: formatujDatum(polozka.termin),
              dniPoTerminu,
              odkazUrl: `${appUrl()}/studenti/${polozka.student_id}`,
            }),
            planItemId: polozka.id,
          })
        }
      }
    }

    // 14 dní po termínu: eskalace Verče + Alešovi a režim poplatku (F6, R19)
    if (dniPoTerminu >= 14 && polozka.stav === 'po_terminu') {
      await admin.from('plan_items').update({ stav: 'ceka_na_poplatek' }).eq('id', polozka.id)

      const { data: nastaveni } = await admin
        .from('settings')
        .select('value')
        .eq('key', 'stripe_link_500')
        .single()
      const stripeUrl =
        typeof nastaveni?.value === 'string' && nastaveni.value.startsWith('http')
          ? nastaveni.value
          : null

      await admin.from('payments').insert({
        student_id: polozka.student_id,
        plan_item_id: polozka.id,
        typ: 'dodatecny_termin_500',
        castka_kc: 500,
        stripe_link_odeslan_at: stripeUrl ? new Date().toISOString() : null,
      })
      vysledek.poplatkuZalozeno++

      if (!(await uzOdeslano('poplatek_500', polozka.id, prijemce.email))) {
        await posliAZaloguj({
          typ: 'poplatek_500',
          komu: prijemce,
          predmet: 'Nový termín vyhodnocení — poplatek 500 Kč',
          html: poplatekEmail({
            jmeno: prijemce.jmeno,
            polozka: popisPolozky,
            termin: formatujDatum(polozka.termin),
            stripeUrl,
            odkazUrl: `${appUrl()}/prehled`,
          }),
          planItemId: polozka.id,
        })
      }
      for (const p of [...provozni, ...admini.filter((a) => !provozni.includes(a))]) {
        if (!(await uzOdeslano('eskalace_14_po', polozka.id, p.email))) {
          await posliAZaloguj({
            typ: 'eskalace_14_po',
            komu: p,
            predmet: `Eskalace: ${prijemce.jmeno} 14+ dní po termínu — režim poplatku`,
            html: eskalaceEmail({
              komu: p.jmeno,
              studentJmeno: prijemce.jmeno,
              polozka: popisPolozky,
              termin: formatujDatum(polozka.termin),
              dniPoTerminu,
              odkazUrl: `${appUrl()}/studenti/${polozka.student_id}`,
            }),
            planItemId: polozka.id,
          })
        }
      }
    }
  }

  // ---------- 2) hlídání schůzek k dlouhým nahrávkám (R34) ----------
  const { data: cekajici } = await admin
    .from('recordings')
    .select('id, student_id, stav')
    .in('stav', ['ceka_na_mentora'])
  for (const nahravka of cekajici ?? []) {
    const { data: student } = await admin
      .from('students')
      .select('profiles(jmeno)')
      .eq('id', nahravka.student_id)
      .single()
    const jmenoStudenta = student?.profiles?.jmeno ?? 'student'
    const { data: schuzky } = await admin
      .from('meetings')
      .select('id, stav')
      .eq('recording_id', nahravka.id)
      .neq('stav', 'zrusena')
      .limit(1)
    const stavText = schuzky?.length
      ? 'mentor je přiřazen, ale schůzka nemá termín'
      : 'čeká na přiřazení mentora'

    for (const p of provozni) {
      // připomínka každých 7 dní: pošli, pokud poslední upozornění je starší 7 dní
      const { data: posledni } = await admin
        .from('notifications')
        .select('odeslano_at')
        .eq('typ', 'hlidani_schuzky')
        .eq('recording_id', nahravka.id)
        .eq('prijemce_email', p.email)
        .order('odeslano_at', { ascending: false })
        .limit(1)
      const posledniCas = posledni?.[0]?.odeslano_at ? Date.parse(posledni[0].odeslano_at) : 0
      if (Date.now() - posledniCas < 7 * 86_400_000) continue

      await posliAZaloguj({
        typ: 'hlidani_schuzky',
        komu: p,
        predmet: `Dlouhá nahrávka čeká: ${jmenoStudenta}`,
        html: hlidaniSchuzkyVerceEmail({
          komu: p.jmeno,
          studentJmeno: jmenoStudenta,
          stavText,
          odkazUrl: `${appUrl()}/fronta`,
        }),
        recordingId: nahravka.id,
      })
    }
  }

  return vysledek
}
