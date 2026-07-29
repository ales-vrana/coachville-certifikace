import type { Faze, Program, TypPolozky } from './plan/typy'

export const PROGRAM_POPISKY: Record<Program, string> = {
  acc: 'ACC samostatně',
  upgrade_pcc: 'Upgrade ACC na PCC',
  komplet: 'Kompletní ACC+PCC',
}

export const TYP_POLOZKY_POPISKY: Record<TypPolozky, string> = {
  dlouha: 'Dlouhá nahrávka',
  kratka_s_reportem: 'Krátká s reportem',
  kratka_bez_vyhodnoceni: 'Krátká bez vyhodnocení',
}

export const FAZE_POPISKY: Record<Faze, string> = {
  acc: 'ACC',
  pcc: 'PCC',
}

export const STAV_POLOZKY_POPISKY: Record<string, string> = {
  naplanovano: 'Naplánováno',
  po_terminu: 'Po termínu',
  ceka_na_poplatek: 'Čeká na poplatek',
  nahrano: 'Nahráno',
  splneno: 'Splněno',
  splneno_historicky: 'Splněno (před migrací)',
  zruseno: 'Zrušeno',
}

export const STAV_STUDENTA_POPISKY: Record<string, string> = {
  aktivni: 'Aktivní',
  pozastaven: 'Pozastaven',
  certifikovan: 'Certifikován',
  ukoncen: 'Ukončen',
}

export const ROLE_POPISKY: Record<string, string> = {
  student: 'Student',
  mentor: 'Mentor',
  verca: 'Provoz',
  meira: 'Koordinátorka',
  admin: 'Administrátor',
}

const FORMAT_DATA = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Zformátuje datum (Date nebo ISO řetězec „YYYY-MM-DD") po česku. */
export function formatujDatum(datum: Date | string): string {
  const d = typeof datum === 'string' ? new Date(datum) : datum
  return FORMAT_DATA.format(d)
}
