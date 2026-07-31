import { describe, expect, it } from 'vitest'
import { generujPlan, generujPlanZDelek, pridejMesice } from './generator'
import type { PolozkaPlanu, TypPolozky } from './typy'

const START = new Date(Date.UTC(2026, 8, 1)) // 1. 9. 2026

function spocitej(plan: PolozkaPlanu[]): Record<TypPolozky, number> {
  const pocty: Record<TypPolozky, number> = {
    dlouha: 0,
    kratka_s_reportem: 0,
    kratka_bez_vyhodnoceni: 0,
  }
  for (const p of plan) pocty[p.typ]++
  return pocty
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

describe('počty položek odpovídají kap. 3 zadání', () => {
  it('ACC samostatně: 3 dlouhé + 5 krátkých (3 s reportem, 2 bez)', () => {
    const plan = generujPlan({ program: 'acc', datumStartu: START })
    expect(plan).toHaveLength(8)
    expect(spocitej(plan)).toEqual({
      dlouha: 3,
      kratka_s_reportem: 3,
      kratka_bez_vyhodnoceni: 2,
    })
  })

  it('upgrade ACC na PCC: 3 dlouhé + 1 krátká s reportem', () => {
    const plan = generujPlan({ program: 'upgrade_pcc', datumStartu: START })
    expect(plan).toHaveLength(4)
    expect(spocitej(plan)).toEqual({
      dlouha: 3,
      kratka_s_reportem: 1,
      kratka_bez_vyhodnoceni: 0,
    })
  })

  it('kompletní: 6 dlouhých + 6 krátkých (4 s reportem, 2 bez), fáze ACC pak PCC', () => {
    const plan = generujPlan({ program: 'komplet', datumStartu: START })
    expect(plan).toHaveLength(12)
    expect(spocitej(plan)).toEqual({
      dlouha: 6,
      kratka_s_reportem: 4,
      kratka_bez_vyhodnoceni: 2,
    })
    const posledniAcc = plan.filter((p) => p.faze === 'acc').at(-1)!
    const prvniPcc = plan.filter((p) => p.faze === 'pcc')[0]!
    expect(posledniAcc.termin.getTime()).toBeLessThan(prvniPcc.termin.getTime())
  })
})

describe('výchozí rozložení termínů (kap. 8, R31)', () => {
  it('ACC 12 měsíců: krátké v měsících 2, 5, 7, 9, 11 a dlouhé 4, 8, 12', () => {
    const plan = generujPlan({ program: 'acc', datumStartu: START })
    const dlouhe = plan.filter((p) => p.typ === 'dlouha').map((p) => iso(p.termin))
    expect(dlouhe).toEqual(['2027-01-01', '2027-05-01', '2027-09-01'])
    const kratke = plan.filter((p) => p.typ !== 'dlouha').map((p) => iso(p.termin))
    expect(kratke).toEqual(['2026-11-01', '2027-02-01', '2027-04-01', '2027-06-01', '2027-08-01'])
  })

  it('bez vyhodnocení jsou poslední dvě krátké ACC (výchozí volba do rozhodnutí O1)', () => {
    const plan = generujPlan({ program: 'acc', datumStartu: START })
    const kratke = plan.filter((p) => p.typ !== 'dlouha')
    expect(kratke.slice(0, 3).every((p) => p.typ === 'kratka_s_reportem')).toBe(true)
    expect(kratke.slice(3).every((p) => p.typ === 'kratka_bez_vyhodnoceni')).toBe(true)
  })

  it('kompletní 30 měsíců: mřížka 24 natažená 1,25× — ACC fáze končí v měsíci 15, program v měsíci 30', () => {
    const plan = generujPlan({ program: 'komplet', datumStartu: START })
    const posledniAccDlouha = plan.filter((p) => p.faze === 'acc' && p.typ === 'dlouha').at(-1)!
    expect(iso(posledniAccDlouha.termin)).toBe('2027-12-01') // start + 15 měsíců
    expect(iso(plan.at(-1)!.termin)).toBe('2029-03-01') // start + 30 měsíců
  })

  it('upgrade: poslední dlouhá ve 12. měsíci', () => {
    const plan = generujPlan({ program: 'upgrade_pcc', datumStartu: START })
    expect(iso(plan.at(-1)!.termin)).toBe('2027-09-01')
  })
})

describe('cílové datum certifikace (kap. 3)', () => {
  it('rozvrh se proporčně stáhne a poslední položka padne přesně na cílové datum', () => {
    const cil = new Date(Date.UTC(2027, 2, 1)) // 1. 3. 2027 — student spěchá, 6 měsíců
    const plan = generujPlan({ program: 'acc', datumStartu: START, ciloveDatumCertifikace: cil })
    expect(plan).toHaveLength(8)
    expect(iso(plan.at(-1)!.termin)).toBe('2027-03-01')
    for (const p of plan) {
      expect(p.termin.getTime()).toBeGreaterThan(START.getTime())
      expect(p.termin.getTime()).toBeLessThanOrEqual(cil.getTime())
    }
  })

  it('rozvrh jde i natáhnout (ACC na 24 měsíců)', () => {
    const cil = new Date(Date.UTC(2028, 8, 1))
    const plan = generujPlan({ program: 'acc', datumStartu: START, ciloveDatumCertifikace: cil })
    expect(iso(plan.at(-1)!.termin)).toBe('2028-09-01')
    // první krátká (mřížka měsíc 2 z 12) leží zhruba ve 4. měsíci;
    // přepočet je aproximace na dny, tolerance ±5 dní
    const ctvrtyMesic = new Date(Date.UTC(2027, 0, 1)).getTime()
    expect(Math.abs(plan[0]!.termin.getTime() - ctvrtyMesic)).toBeLessThanOrEqual(5 * 86_400_000)
  })

  it('cílové datum před startem vyhodí chybu', () => {
    expect(() =>
      generujPlan({
        program: 'acc',
        datumStartu: START,
        ciloveDatumCertifikace: new Date(Date.UTC(2026, 7, 1)),
      }),
    ).toThrow('Cílové datum')
  })
})

describe('vlastnosti plánu', () => {
  it('termíny jsou ostře rostoucí a pořadí je 1..n', () => {
    for (const program of ['acc', 'upgrade_pcc', 'komplet'] as const) {
      const plan = generujPlan({ program, datumStartu: START })
      plan.forEach((p, i) => {
        expect(p.poradi).toBe(i + 1)
        if (i > 0) expect(p.termin.getTime()).toBeGreaterThan(plan[i - 1]!.termin.getTime())
      })
    }
  })
})

describe('generujPlanZDelek (use case: délky domluvené telefonátem)', () => {
  it('ACC 12 měsíců dává stejné termíny jako výchozí plán', () => {
    const zDelky = generujPlanZDelek({ program: 'acc', datumStartu: START, delkaAccMesicu: 12 })
    const vychozi = generujPlan({ program: 'acc', datumStartu: START })
    expect(zDelky.map((p) => iso(p.termin))).toEqual(vychozi.map((p) => iso(p.termin)))
  })

  it('ACC 9 měsíců: vše stlačené, poslední dlouhá přesně v 9. měsíci', () => {
    const plan = generujPlanZDelek({ program: 'acc', datumStartu: START, delkaAccMesicu: 9 })
    expect(plan).toHaveLength(8)
    expect(iso(plan.at(-1)!.termin)).toBe('2027-06-01')
    expect(spocitej(plan)).toEqual({ dlouha: 3, kratka_s_reportem: 3, kratka_bez_vyhodnoceni: 2 })
  })

  it('ACC 36 měsíců: poslední dlouhá přesně ve 36. měsíci', () => {
    const plan = generujPlanZDelek({ program: 'acc', datumStartu: START, delkaAccMesicu: 36 })
    expect(iso(plan.at(-1)!.termin)).toBe('2029-09-01')
  })

  it('upgrade 18 měsíců: poslední dlouhá v 18. měsíci', () => {
    const plan = generujPlanZDelek({
      program: 'upgrade_pcc',
      datumStartu: START,
      delkaCelkemMesicu: 18,
    })
    expect(plan).toHaveLength(4)
    expect(iso(plan.at(-1)!.termin)).toBe('2028-03-01')
  })

  it('komplet ACC 12 + celkem 24: ACC fáze končí ve 12., program ve 24. měsíci', () => {
    const plan = generujPlanZDelek({
      program: 'komplet',
      datumStartu: START,
      delkaAccMesicu: 12,
      delkaCelkemMesicu: 24,
    })
    expect(plan).toHaveLength(12)
    expect(spocitej(plan)).toEqual({ dlouha: 6, kratka_s_reportem: 4, kratka_bez_vyhodnoceni: 2 })
    const posledniAcc = plan.filter((p) => p.faze === 'acc').at(-1)!
    expect(iso(posledniAcc.termin)).toBe('2027-09-01')
    expect(iso(plan.at(-1)!.termin)).toBe('2028-09-01')
    // PCC fáze začíná až po konci ACC fáze
    const prvniPcc = plan.filter((p) => p.faze === 'pcc')[0]!
    expect(prvniPcc.termin.getTime()).toBeGreaterThan(posledniAcc.termin.getTime())
    // pořadí je souvislé a termíny rostou
    plan.forEach((p, i) => {
      expect(p.poradi).toBe(i + 1)
      if (i > 0) expect(p.termin.getTime()).toBeGreaterThanOrEqual(plan[i - 1]!.termin.getTime())
    })
  })

  it('komplet ACC 9 + celkem 18: PCC fáze se vejde do zbylých 9 měsíců', () => {
    const plan = generujPlanZDelek({
      program: 'komplet',
      datumStartu: START,
      delkaAccMesicu: 9,
      delkaCelkemMesicu: 18,
    })
    expect(iso(plan.filter((p) => p.faze === 'acc').at(-1)!.termin)).toBe('2027-06-01')
    expect(iso(plan.at(-1)!.termin)).toBe('2028-03-01')
  })

  it('hlídá rozsahy: ACC 9–36, PCC 18–60, celé měsíce', () => {
    expect(() =>
      generujPlanZDelek({ program: 'acc', datumStartu: START, delkaAccMesicu: 8 }),
    ).toThrow('9–36')
    expect(() =>
      generujPlanZDelek({ program: 'acc', datumStartu: START, delkaAccMesicu: 37 }),
    ).toThrow('9–36')
    expect(() =>
      generujPlanZDelek({ program: 'upgrade_pcc', datumStartu: START, delkaCelkemMesicu: 17 }),
    ).toThrow('18–60')
    expect(() =>
      generujPlanZDelek({ program: 'upgrade_pcc', datumStartu: START, delkaCelkemMesicu: 61 }),
    ).toThrow('18–60')
    expect(() =>
      generujPlanZDelek({ program: 'acc', datumStartu: START, delkaAccMesicu: 10.5 }),
    ).toThrow('celých měsících')
    expect(() => generujPlanZDelek({ program: 'acc', datumStartu: START })).toThrow(
      'celých měsících',
    )
  })

  it('komplet: celková délka musí být aspoň o 3 měsíce delší než ACC fáze', () => {
    expect(() =>
      generujPlanZDelek({
        program: 'komplet',
        datumStartu: START,
        delkaAccMesicu: 20,
        delkaCelkemMesicu: 21,
      }),
    ).toThrow('aspoň o 3 měsíce')
  })
})

describe('pridejMesice', () => {
  it('ořízne den na délku cílového měsíce (31. 1. + 1 měsíc = 28. 2.)', () => {
    expect(iso(pridejMesice(new Date(Date.UTC(2026, 0, 31)), 1))).toBe('2026-02-28')
  })

  it('zlomek měsíce převádí na dny', () => {
    expect(iso(pridejMesice(new Date(Date.UTC(2026, 8, 1)), 2.5))).toBe('2026-11-16')
  })
})
