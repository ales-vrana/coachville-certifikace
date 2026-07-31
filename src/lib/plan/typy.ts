export type Program = 'acc' | 'upgrade_pcc' | 'komplet'

export type TypPolozky = 'dlouha' | 'kratka_s_reportem' | 'kratka_bez_vyhodnoceni'

export type Faze = 'acc' | 'pcc'

export interface SablonovaPolozka {
  typ: TypPolozky
  faze: Faze
  /** Pozice na mřížce šablony v měsících od startu (kap. 8 zadání) */
  mesic: number
}

export interface Sablona {
  program: Program
  verze: number
  /** Délka layoutové mřížky v měsících */
  baseMesicu: number
  /** Výchozí délka plánu v měsících (R31) */
  vychoziDelkaMesicu: number
  polozky: SablonovaPolozka[]
}

export interface PolozkaPlanu {
  poradi: number
  typ: TypPolozky
  faze: Faze
  termin: Date
}

export interface VstupPlanu {
  program: Program
  datumStartu: Date
  /** Volitelné cílové datum certifikace: celý rozvrh se proporčně přepočítá (kap. 3) */
  ciloveDatumCertifikace?: Date
}

export interface VstupPlanuZDelek {
  program: Program
  datumStartu: Date
  /** Délka ACC fáze v měsících (programy acc a komplet), rozsah 9–36 */
  delkaAccMesicu?: number
  /** Celková délka studia v měsících (programy upgrade_pcc a komplet), rozsah 18–60 */
  delkaCelkemMesicu?: number
}
