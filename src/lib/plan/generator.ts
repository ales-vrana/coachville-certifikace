import { ACC_FAZE, PCC_FAZE, SABLONY } from './sablony'
import type { PolozkaPlanu, VstupPlanu, VstupPlanuZDelek } from './typy'

const PRUMERNY_MESIC_DNI = 30.4375

/** Počet dnů v měsíci daného UTC data */
function dnuVMesici(rok: number, mesicIndex: number): number {
  return new Date(Date.UTC(rok, mesicIndex + 1, 0)).getUTCDate()
}

/**
 * Přičte k datu zlomkový počet měsíců: celé měsíce kalendářně (s oříznutím
 * dne na délku cílového měsíce, např. 31. 1. + 1 měsíc = 28. 2.), zlomek
 * jako dny. Počítá v UTC, aby výsledek neovlivnily přechody času.
 */
export function pridejMesice(datum: Date, mesicu: number): Date {
  const cele = Math.trunc(mesicu)
  const zlomek = mesicu - cele
  const rok = datum.getUTCFullYear()
  const mesicIndex = datum.getUTCMonth() + cele
  const den = Math.min(datum.getUTCDate(), dnuVMesici(rok, mesicIndex))
  const vysledek = new Date(Date.UTC(rok, mesicIndex, den))
  if (zlomek > 0) {
    vysledek.setUTCDate(vysledek.getUTCDate() + Math.round(zlomek * PRUMERNY_MESIC_DNI))
  }
  return vysledek
}

function naUtcPulnoc(datum: Date): Date {
  return new Date(Date.UTC(datum.getUTCFullYear(), datum.getUTCMonth(), datum.getUTCDate()))
}

/**
 * Vygeneruje položky plánu pro studenta (kap. 8 zadání).
 *
 * Bez cílového data se použije výchozí délka programu (R31: ACC 12,
 * upgrade 12, komplet 30 měsíců). Zadané cílové datum certifikace celý
 * rozvrh proporčně stáhne nebo natáhne a poslední položka padne přesně
 * na cílové datum.
 */
export function generujPlan(vstup: VstupPlanu): PolozkaPlanu[] {
  const sablona = SABLONY[vstup.program]
  const start = naUtcPulnoc(vstup.datumStartu)

  let delkaMesicu = sablona.vychoziDelkaMesicu
  if (vstup.ciloveDatumCertifikace) {
    const cil = naUtcPulnoc(vstup.ciloveDatumCertifikace)
    const dni = (cil.getTime() - start.getTime()) / 86_400_000
    if (dni <= 0) {
      throw new Error('Cílové datum certifikace musí být po datu startu.')
    }
    delkaMesicu = dni / PRUMERNY_MESIC_DNI
  }

  const scale = delkaMesicu / sablona.baseMesicu
  const posledniMesic = Math.max(...sablona.polozky.map((p) => p.mesic))

  return [...sablona.polozky]
    .sort((a, b) => a.mesic - b.mesic)
    .map((polozka, i) => ({
      poradi: i + 1,
      typ: polozka.typ,
      faze: polozka.faze,
      termin:
        vstup.ciloveDatumCertifikace && polozka.mesic === posledniMesic
          ? naUtcPulnoc(vstup.ciloveDatumCertifikace)
          : pridejMesice(start, polozka.mesic * scale),
    }))
}

/** Povolené rozsahy délek studia v měsících (use case: telefonát Veroniky). */
export const ROZSAHY_DELEK = {
  acc: { min: 9, max: 36 },
  pcc: { min: 18, max: 60 },
} as const

function overRozsah(hodnota: number | undefined, rozsah: { min: number; max: number }, popis: string): number {
  if (hodnota === undefined || !Number.isFinite(hodnota) || !Number.isInteger(hodnota)) {
    throw new Error(`Zadejte ${popis} v celých měsících.`)
  }
  if (hodnota < rozsah.min || hodnota > rozsah.max) {
    throw new Error(`${popis[0]!.toUpperCase()}${popis.slice(1)} musí být ${rozsah.min}–${rozsah.max} měsíců.`)
  }
  return hodnota
}

/**
 * Vygeneruje plán z domluvených délek v měsících od data startu:
 * - acc: délka ACC fáze 9–36 měsíců (mřížka 12 měsíců se proporčně natáhne),
 * - upgrade_pcc: celková délka PCC studia 18–60 měsíců,
 * - komplet: délka ACC fáze 9–36 + celková délka 18–60; PCC fáze se rozvrhne
 *   do zbytku mezi koncem ACC fáze a celkovou délkou.
 * Poslední položka padne přesně na konec domluvené délky.
 */
export function generujPlanZDelek(vstup: VstupPlanuZDelek): PolozkaPlanu[] {
  const start = naUtcPulnoc(vstup.datumStartu)

  let rozlozeni: { typ: PolozkaPlanu['typ']; faze: PolozkaPlanu['faze']; mesicPlanu: number }[]

  if (vstup.program === 'acc') {
    const delka = overRozsah(vstup.delkaAccMesicu, ROZSAHY_DELEK.acc, 'délka studia ACC')
    rozlozeni = ACC_FAZE.map((p) => ({ ...p, mesicPlanu: (p.mesic * delka) / 12 }))
  } else if (vstup.program === 'upgrade_pcc') {
    const delka = overRozsah(vstup.delkaCelkemMesicu, ROZSAHY_DELEK.pcc, 'délka studia PCC')
    rozlozeni = PCC_FAZE.map((p) => ({ ...p, mesicPlanu: (p.mesic * delka) / 12 }))
  } else {
    const delkaAcc = overRozsah(vstup.delkaAccMesicu, ROZSAHY_DELEK.acc, 'délka ACC fáze')
    const delkaCelkem = overRozsah(vstup.delkaCelkemMesicu, ROZSAHY_DELEK.pcc, 'celková délka studia')
    if (delkaCelkem < delkaAcc + 3) {
      throw new Error('Celková délka musí být aspoň o 3 měsíce delší než ACC fáze.')
    }
    const delkaPcc = delkaCelkem - delkaAcc
    rozlozeni = [
      ...ACC_FAZE.map((p) => ({ ...p, mesicPlanu: (p.mesic * delkaAcc) / 12 })),
      ...PCC_FAZE.map((p) => ({ ...p, mesicPlanu: delkaAcc + (p.mesic * delkaPcc) / 12 })),
    ]
  }

  return rozlozeni
    .sort((a, b) => a.mesicPlanu - b.mesicPlanu)
    .map((polozka, i) => ({
      poradi: i + 1,
      typ: polozka.typ,
      faze: polozka.faze,
      termin: pridejMesice(start, polozka.mesicPlanu),
    }))
}
