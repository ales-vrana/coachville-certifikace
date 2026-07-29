import { generujPlan, pridejMesice } from './generator'
import type { Faze, TypPolozky } from './typy'

export interface MigracniPolozka {
  poradi: number
  typ: TypPolozky
  faze: Faze
  termin: Date
  stav: 'naplanovano' | 'splneno_historicky'
}

/**
 * R36: migrace staršího ACC studenta podle počtu hotových praktik (dlouhých):
 *   hotové 2 ze 3 → zbývá 1 dlouhá + 1 krátká
 *   hotová 1 ze 3 → zbývají 2 dlouhé + 3 krátké
 *   hotové 0 ze 3 → plný plán 3 dlouhé + 5 krátkých
 *
 * Hotové položky se označí splneno_historicky (od začátku plánu), zbývající
 * dostanou termíny od dneška s rozestupem 2 měsíce; Meira/Verča je doladí.
 */
export function pripravMigracniPlan(vstup: {
  hotoveDlouhe: 0 | 1 | 2
  dnes: Date
}): MigracniPolozka[] {
  // mapování R36 → kolik KRÁTKÝCH zbývá (dlouhé zbývají 3 − hotové)
  const zbyvaKratkych = { 0: 5, 1: 3, 2: 1 }[vstup.hotoveDlouhe]

  const plny = generujPlan({ program: 'acc', datumStartu: vstup.dnes })
  const dlouhe = plny.filter((p) => p.typ === 'dlouha')
  const kratke = plny.filter((p) => p.typ !== 'dlouha')

  const historickeDlouhe = new Set(dlouhe.slice(0, vstup.hotoveDlouhe).map((p) => p.poradi))
  const historickeKratke = new Set(
    kratke.slice(0, kratke.length - zbyvaKratkych).map((p) => p.poradi),
  )

  let zbyvajicichPred = 0
  return plny.map((p) => {
    const historicka = historickeDlouhe.has(p.poradi) || historickeKratke.has(p.poradi)
    if (historicka) {
      return { poradi: p.poradi, typ: p.typ, faze: p.faze, termin: p.termin, stav: 'splneno_historicky' }
    }
    zbyvajicichPred++
    return {
      poradi: p.poradi,
      typ: p.typ,
      faze: p.faze,
      termin: pridejMesice(vstup.dnes, 2 * zbyvajicichPred),
      stav: 'naplanovano',
    }
  })
}
