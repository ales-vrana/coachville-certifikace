import { SABLONY } from './sablony'
import type { PolozkaPlanu, VstupPlanu } from './typy'

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
