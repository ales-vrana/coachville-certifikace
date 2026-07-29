import { describe, expect, it } from 'vitest'
import { pripravMigracniPlan } from './migrace'

const DNES = new Date(Date.UTC(2026, 7, 1)) // 1. 8. 2026

describe('migrace starších studentů (R36)', () => {
  it('hotové 2 ze 3 → zbývá 1 dlouhá + 1 krátká', () => {
    const plan = pripravMigracniPlan({ hotoveDlouhe: 2, dnes: DNES })
    const zbyva = plan.filter((p) => p.stav === 'naplanovano')
    expect(zbyva.filter((p) => p.typ === 'dlouha')).toHaveLength(1)
    expect(zbyva.filter((p) => p.typ !== 'dlouha')).toHaveLength(1)
  })

  it('hotová 1 ze 3 → zbývají 2 dlouhé + 3 krátké', () => {
    const plan = pripravMigracniPlan({ hotoveDlouhe: 1, dnes: DNES })
    const zbyva = plan.filter((p) => p.stav === 'naplanovano')
    expect(zbyva.filter((p) => p.typ === 'dlouha')).toHaveLength(2)
    expect(zbyva.filter((p) => p.typ !== 'dlouha')).toHaveLength(3)
  })

  it('hotové 0 ze 3 → plný plán 3 dlouhé + 5 krátkých', () => {
    const plan = pripravMigracniPlan({ hotoveDlouhe: 0, dnes: DNES })
    const zbyva = plan.filter((p) => p.stav === 'naplanovano')
    expect(zbyva).toHaveLength(8)
    expect(plan.filter((p) => p.stav === 'splneno_historicky')).toHaveLength(0)
  })

  it('plán má vždy 8 položek a historické jsou ty nejstarší', () => {
    const plan = pripravMigracniPlan({ hotoveDlouhe: 2, dnes: DNES })
    expect(plan).toHaveLength(8)
    const posledniHistoricka = Math.max(
      ...plan.filter((p) => p.stav === 'splneno_historicky').map((p) => p.poradi),
    )
    const prvniZbyvajici = Math.min(
      ...plan.filter((p) => p.stav === 'naplanovano').map((p) => p.poradi),
    )
    expect(posledniHistoricka).toBeLessThan(prvniZbyvajici + 2) // historické jsou v úvodu plánu
  })

  it('zbývající termíny začínají v budoucnu s rozestupem 2 měsíce', () => {
    const plan = pripravMigracniPlan({ hotoveDlouhe: 1, dnes: DNES })
    const zbyva = plan.filter((p) => p.stav === 'naplanovano')
    expect(zbyva[0]!.termin.toISOString().slice(0, 10)).toBe('2026-10-01')
    expect(zbyva[1]!.termin.toISOString().slice(0, 10)).toBe('2026-12-01')
    for (const p of zbyva) {
      expect(p.termin.getTime()).toBeGreaterThan(DNES.getTime())
    }
  })
})
