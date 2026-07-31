'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { appUrl, posliEmail } from '@/lib/email/odesilatel'
import { navrhPlanuEmail, zavaznyPlanEmail, type TerminSeznamu } from '@/lib/email/sablony'
import { generujPlanZDelek } from '@/lib/plan/generator'
import type { Faze, TypPolozky } from '@/lib/plan/typy'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Use case „telefonát Veroniky": student se zakládá bez plánu, Veronika po
 * domluvě zadá délky v měsících, systém rozvrhne termíny a pošle studentovi
 * návrh e-mailem. Student ho potvrdí jednorázovým odkazem (nebo v aplikaci)
 * — tím je plán závazný. Do potvrzení nelze nahrávat a neběží kaskáda.
 */

/** Návrh plánu posílá Veronika (a Aleš jako admin). */
const NAVRHOVATELE = ['verca', 'admin'] as const

const PREDMET_NAVRH = 'Návrh plánu termínů pro dodání nahrávek pro ICF certifikaci'
const PREDMET_ZAVAZNY = 'CoachVille - Tvůj závazný plán termínů pro poskytnutí nahrávek'

export interface VysledekNavrhu {
  ok: boolean
  chyba?: string
  varovani?: string
}

function obnovStranky(studentId: string) {
  revalidatePath(`/studenti/${studentId}`)
  revalidatePath('/studenti')
  revalidatePath('/prehled')
}

async function nactiTerminy(studentId: string): Promise<TerminSeznamu[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('plan_items')
    .select('poradi, typ, faze, termin')
    .eq('student_id', studentId)
    .neq('stav', 'zruseno')
    .order('poradi')
  return (data ?? []).map((p) => ({
    poradi: p.poradi,
    typ: p.typ as TypPolozky,
    faze: p.faze as Faze | null,
    termin: p.termin,
  }))
}

/** Vygeneruje plán z délek, uloží ho jako návrh a pošle studentovi e-mail s potvrzením. */
export async function navrhniPlan(vstup: {
  studentId: string
  delkaAccMesicu?: number
  delkaCelkemMesicu?: number
}): Promise<VysledekNavrhu> {
  await vyzadujRoli([...NAVRHOVATELE])
  const admin = createAdminClient()

  const { data: student } = await admin
    .from('students')
    .select('id, program, datum_startu, stav, profiles(jmeno, email)')
    .eq('id', vstup.studentId)
    .single()
  if (!student?.profiles) return { ok: false, chyba: 'Student nenalezen.' }
  if (student.stav !== 'aktivni') {
    return { ok: false, chyba: 'Návrh plánu lze poslat jen aktivnímu studentovi.' }
  }

  // Návrh (i nový návrh) je možný jen dokud student nic neodevzdal — potom
  // se termíny upravují jednotlivě v editaci plánu (R21).
  const { data: stavajici } = await admin
    .from('plan_items')
    .select('id, stav')
    .eq('student_id', vstup.studentId)
  const planBezi = (stavajici ?? []).some(
    (p) => !['naplanovano', 'po_terminu', 'zruseno'].includes(p.stav),
  )
  const { count: pocetNahravek } = await admin
    .from('recordings')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', vstup.studentId)
  if (planBezi || (pocetNahravek ?? 0) > 0) {
    return {
      ok: false,
      chyba: 'Student už odevzdává nahrávky — nový návrh nelze poslat, upravte termíny v editaci plánu.',
    }
  }

  let plan
  try {
    plan = generujPlanZDelek({
      program: student.program,
      datumStartu: new Date(student.datum_startu),
      delkaAccMesicu: vstup.delkaAccMesicu,
      delkaCelkemMesicu: vstup.delkaCelkemMesicu,
    })
  } catch (e) {
    return { ok: false, chyba: e instanceof Error ? e.message : 'Plán se nepodařilo vygenerovat.' }
  }

  // starý návrh (nepotvrzený plán) se celý nahradí
  const { error: chybaMazani } = await admin
    .from('plan_items')
    .delete()
    .eq('student_id', vstup.studentId)
  if (chybaMazani) {
    return { ok: false, chyba: `Starý návrh se nepodařilo odstranit: ${chybaMazani.message}` }
  }
  const { error: chybaVlozeni } = await admin.from('plan_items').insert(
    plan.map((p) => ({
      student_id: vstup.studentId,
      poradi: p.poradi,
      typ: p.typ,
      faze: p.faze,
      termin: p.termin.toISOString().slice(0, 10),
    })),
  )
  if (chybaVlozeni) {
    return {
      ok: false,
      chyba: `Návrh se nepodařilo uložit (${chybaVlozeni.message}) — zkuste to prosím znovu.`,
    }
  }

  // nový token zneplatní případný starý potvrzovací odkaz
  const token = randomBytes(24).toString('base64url')
  const posledniTermin = plan.at(-1)!.termin.toISOString().slice(0, 10)
  const { error: chybaStudenta } = await admin
    .from('students')
    .update({
      delka_acc_mesicu: vstup.delkaAccMesicu ?? null,
      delka_celkem_mesicu: vstup.delkaCelkemMesicu ?? vstup.delkaAccMesicu ?? null,
      cilove_datum_certifikace: posledniTermin,
      plan_navrh_odeslan_at: new Date().toISOString(),
      plan_potvrzen_at: null,
      plan_potvrzeni_token: token,
    })
    .eq('id', vstup.studentId)
  if (chybaStudenta) {
    return { ok: false, chyba: `Návrh se nepodařilo uložit: ${chybaStudenta.message}` }
  }

  const odeslano = await posliEmail({
    komu: student.profiles.email,
    predmet: PREDMET_NAVRH,
    html: navrhPlanuEmail({
      terminy: plan.map((p) => ({ poradi: p.poradi, typ: p.typ, faze: p.faze, termin: p.termin })),
      potvrzeniUrl: `${appUrl()}/plan/potvrzeni?token=${token}`,
    }),
  })

  obnovStranky(vstup.studentId)
  if (!odeslano.ok) {
    return {
      ok: true,
      varovani: `Návrh je uložen, ale e-mail se nepodařilo odeslat (${odeslano.chyba}). Pošlete návrh znovu.`,
    }
  }
  return { ok: true }
}

interface StudentKPotvrzeni {
  id: string
  jmeno: string
  email: string
}

/** Společné dokončení potvrzení: označí plán za závazný a pošle potvrzovací e-mail. */
async function dokonciPotvrzeni(student: StudentKPotvrzeni): Promise<VysledekNavrhu> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('students')
    .update({ plan_potvrzen_at: new Date().toISOString(), plan_potvrzeni_token: null })
    .eq('id', student.id)
  if (error) return { ok: false, chyba: `Potvrzení se nepodařilo uložit: ${error.message}` }

  const terminy = await nactiTerminy(student.id)
  const odeslano = await posliEmail({
    komu: student.email,
    predmet: PREDMET_ZAVAZNY,
    html: zavaznyPlanEmail({ terminy, prehledUrl: `${appUrl()}/prehled` }),
  })

  obnovStranky(student.id)
  if (!odeslano.ok) {
    return {
      ok: true,
      varovani: 'Plán je potvrzen, ale potvrzovací e-mail se nepodařilo doručit.',
    }
  }
  return { ok: true }
}

export interface NahledNavrhu {
  ok: boolean
  chyba?: string
  jmeno?: string
  terminy?: TerminSeznamu[]
}

const CHYBA_NEPLATNY_ODKAZ =
  'Tento odkaz už neplatí — plán je buď potvrzený, nebo ti mezitím přišel nový návrh. Otevři prosím nejnovější e-mail s návrhem plánu.'

function platnyTvarTokenu(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(token)
}

async function najdiStudentaPodleTokenu(token: string) {
  if (!platnyTvarTokenu(token)) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('students')
    .select('id, plan_potvrzen_at, profiles(jmeno, email)')
    .eq('plan_potvrzeni_token', token)
    .maybeSingle()
  if (!data?.profiles || data.plan_potvrzen_at) return null
  return { id: data.id, jmeno: data.profiles.jmeno, email: data.profiles.email }
}

/**
 * Náhled návrhu pro veřejnou potvrzovací stránku. Bez přihlášení — přístup
 * chrání jednorázový token z e-mailu; vrací jen jméno a termíny.
 */
export async function nactiNavrhPodleTokenu(token: string): Promise<NahledNavrhu> {
  const student = await najdiStudentaPodleTokenu(token)
  if (!student) return { ok: false, chyba: CHYBA_NEPLATNY_ODKAZ }
  return { ok: true, jmeno: student.jmeno, terminy: await nactiTerminy(student.id) }
}

/** Potvrzení plánu tlačítkem z e-mailu (bez přihlášení, jednorázový token). */
export async function potvrdPlanTokenem(token: string): Promise<VysledekNavrhu> {
  const student = await najdiStudentaPodleTokenu(token)
  if (!student) return { ok: false, chyba: CHYBA_NEPLATNY_ODKAZ }
  const vysledek = await dokonciPotvrzeni(student)
  if (!vysledek.ok) return vysledek
  // revalidace by stránku s už spotřebovaným tokenem překreslila na „odkaz
  // neplatí" — proto po úspěchu přesměrujeme na stránku s potvrzením
  redirect('/plan/potvrzeni/hotovo')
}

/** Potvrzení návrhu přihlášeným studentem přímo v aplikaci. */
export async function potvrdMujPlan(): Promise<VysledekNavrhu> {
  const profil = await vyzadujRoli(['student'])
  const admin = createAdminClient()

  const { data: student } = await admin
    .from('students')
    .select('id, plan_potvrzen_at, plan_navrh_odeslan_at')
    .eq('profile_id', profil.id)
    .single()
  if (!student) return { ok: false, chyba: 'Student nenalezen.' }
  if (student.plan_potvrzen_at) return { ok: true }
  if (!student.plan_navrh_odeslan_at) {
    return { ok: false, chyba: 'Žádný návrh plánu zatím nebyl odeslán.' }
  }
  return dokonciPotvrzeni({ id: student.id, jmeno: profil.jmeno, email: profil.email })
}
