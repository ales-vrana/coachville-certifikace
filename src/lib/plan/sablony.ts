import type { Sablona, SablonovaPolozka } from './typy'

/**
 * Rozložení dle kap. 8 zadání:
 * - ACC fáze: krátké v měsících 2, 5, 7, 9, 11; dlouhé na konci měsíců 4, 8, 12.
 * - PCC fáze: krátká v měsíci 3, dlouhé na konci měsíců 4, 8, 12 fáze.
 *
 * VÝCHOZÍ VOLBA ČEKAJÍCÍ NA O1: které krátké jsou bez vyhodnocení, zadání
 * neurčuje. Dokud Aleš nerozhodne O1, jsou bez vyhodnocení POSLEDNÍ DVĚ
 * krátké ACC fáze (měsíce 9 a 11) — reporty tak studenti dostávají v první
 * části programu, kdy mají největší učební hodnotu. Typ je atribut položky,
 * změna rozhodnutí nevyžaduje přestavbu (kap. 3, O1).
 */

const ACC_FAZE: SablonovaPolozka[] = [
  { typ: 'kratka_s_reportem', faze: 'acc', mesic: 2 },
  { typ: 'dlouha', faze: 'acc', mesic: 4 },
  { typ: 'kratka_s_reportem', faze: 'acc', mesic: 5 },
  { typ: 'kratka_s_reportem', faze: 'acc', mesic: 7 },
  { typ: 'dlouha', faze: 'acc', mesic: 8 },
  { typ: 'kratka_bez_vyhodnoceni', faze: 'acc', mesic: 9 },
  { typ: 'kratka_bez_vyhodnoceni', faze: 'acc', mesic: 11 },
  { typ: 'dlouha', faze: 'acc', mesic: 12 },
]

const PCC_FAZE: SablonovaPolozka[] = [
  { typ: 'kratka_s_reportem', faze: 'pcc', mesic: 3 },
  { typ: 'dlouha', faze: 'pcc', mesic: 4 },
  { typ: 'dlouha', faze: 'pcc', mesic: 8 },
  { typ: 'dlouha', faze: 'pcc', mesic: 12 },
]

function posun(polozky: SablonovaPolozka[], oMesicu: number): SablonovaPolozka[] {
  return polozky.map((p) => ({ ...p, mesic: p.mesic + oMesicu }))
}

export const SABLONY: Record<Sablona['program'], Sablona> = {
  acc: {
    program: 'acc',
    verze: 1,
    baseMesicu: 12,
    vychoziDelkaMesicu: 12,
    polozky: ACC_FAZE,
  },
  upgrade_pcc: {
    program: 'upgrade_pcc',
    verze: 1,
    baseMesicu: 12,
    vychoziDelkaMesicu: 12,
    polozky: PCC_FAZE,
  },
  // Kompletní program = ACC fáze + navazující PCC fáze (interpretace O1,
  // součty odpovídají zadání: 6 dlouhých, 4 krátké s reportem, 2 bez).
  // Mřížka 24 měsíců natažená na výchozích 30 (R31) ⇒ ACC kritéria
  // splněná v měsíci 15, tedy uvnitř rámce „12 až 15 měsíců" z kap. 3.
  komplet: {
    program: 'komplet',
    verze: 1,
    baseMesicu: 24,
    vychoziDelkaMesicu: 30,
    polozky: [...ACC_FAZE, ...posun(PCC_FAZE, 12)],
  },
}
