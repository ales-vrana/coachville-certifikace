'use server'

import { revalidatePath } from 'next/cache'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import type { Faze, TypPolozky } from '@/lib/plan/typy'
import { createAdminClient } from '@/lib/supabase/admin'

export interface VysledekAkce {
  ok: boolean
  chyba?: string
}

/** Plány smí editovat jen Verča, Meira a Aleš (R21). */
const EDITORI_PLANU = ['verca', 'meira', 'admin'] as const

async function nactiPolozku(planItemId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('plan_items')
    .select('id, student_id, stav, termin, puvodni_termin')
    .eq('id', planItemId)
    .single()
  return data
}

function obnovStranky(studentId: string) {
  revalidatePath(`/studenti/${studentId}`)
  revalidatePath('/studenti')
}

export async function zmenTermin(planItemId: string, novyTermin: string): Promise<VysledekAkce> {
  await vyzadujRoli([...EDITORI_PLANU])
  if (!/^\d{4}-\d{2}-\d{2}$/.test(novyTermin)) {
    return { ok: false, chyba: 'Neplatné datum.' }
  }
  const polozka = await nactiPolozku(planItemId)
  if (!polozka) return { ok: false, chyba: 'Položka nenalezena.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('plan_items')
    .update({
      termin: novyTermin,
      // původní termín se zachová jen při první změně (audit)
      puvodni_termin: polozka.puvodni_termin ?? polozka.termin,
      // posun termínu vrací případné „po termínu" zpět do plánu
      stav: polozka.stav === 'po_terminu' ? 'naplanovano' : polozka.stav,
    })
    .eq('id', planItemId)
  if (error) return { ok: false, chyba: error.message }

  obnovStranky(polozka.student_id)
  return { ok: true }
}

/** F1b migrace: položka byla splněna ještě před zavedením systému. */
export async function oznacSplnenoHistoricky(planItemId: string): Promise<VysledekAkce> {
  await vyzadujRoli([...EDITORI_PLANU])
  const polozka = await nactiPolozku(planItemId)
  if (!polozka) return { ok: false, chyba: 'Položka nenalezena.' }
  if (!['naplanovano', 'po_terminu', 'zruseno'].includes(polozka.stav)) {
    return { ok: false, chyba: 'Tuto položku už nelze označit jako historicky splněnou.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('plan_items')
    .update({ stav: 'splneno_historicky', splneno_at: new Date().toISOString() })
    .eq('id', planItemId)
  if (error) return { ok: false, chyba: error.message }

  obnovStranky(polozka.student_id)
  return { ok: true }
}

export async function zrusPolozku(planItemId: string): Promise<VysledekAkce> {
  await vyzadujRoli([...EDITORI_PLANU])
  const polozka = await nactiPolozku(planItemId)
  if (!polozka) return { ok: false, chyba: 'Položka nenalezena.' }
  if (!['naplanovano', 'po_terminu', 'splneno_historicky'].includes(polozka.stav)) {
    return { ok: false, chyba: 'Položku s nahrávkou nelze zrušit.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('plan_items')
    .update({ stav: 'zruseno' })
    .eq('id', planItemId)
  if (error) return { ok: false, chyba: error.message }

  obnovStranky(polozka.student_id)
  return { ok: true }
}

export async function obnovPolozku(planItemId: string): Promise<VysledekAkce> {
  await vyzadujRoli([...EDITORI_PLANU])
  const polozka = await nactiPolozku(planItemId)
  if (!polozka) return { ok: false, chyba: 'Položka nenalezena.' }
  if (polozka.stav !== 'zruseno') {
    return { ok: false, chyba: 'Obnovit lze jen zrušenou položku.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('plan_items')
    .update({ stav: 'naplanovano' })
    .eq('id', planItemId)
  if (error) return { ok: false, chyba: error.message }

  obnovStranky(polozka.student_id)
  return { ok: true }
}

export async function pridejPolozku(vstup: {
  studentId: string
  typ: TypPolozky
  faze: Faze
  termin: string
}): Promise<VysledekAkce> {
  await vyzadujRoli([...EDITORI_PLANU])
  if (!['dlouha', 'kratka_s_reportem', 'kratka_bez_vyhodnoceni'].includes(vstup.typ)) {
    return { ok: false, chyba: 'Neplatný typ položky.' }
  }
  if (!['acc', 'pcc'].includes(vstup.faze)) {
    return { ok: false, chyba: 'Neplatná fáze.' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vstup.termin)) {
    return { ok: false, chyba: 'Neplatné datum.' }
  }

  const admin = createAdminClient()
  const { data: posledni } = await admin
    .from('plan_items')
    .select('poradi')
    .eq('student_id', vstup.studentId)
    .order('poradi', { ascending: false })
    .limit(1)
    .single()

  const { error } = await admin.from('plan_items').insert({
    student_id: vstup.studentId,
    poradi: (posledni?.poradi ?? 0) + 1,
    typ: vstup.typ,
    faze: vstup.faze,
    termin: vstup.termin,
  })
  if (error) return { ok: false, chyba: error.message }

  obnovStranky(vstup.studentId)
  return { ok: true }
}
