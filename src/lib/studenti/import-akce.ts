'use server'

import { revalidatePath } from 'next/cache'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { appUrl, posliEmail } from '@/lib/email/odesilatel'
import { uvitaciEmail } from '@/lib/email/sablony'
import { pripravMigracniPlan } from '@/lib/plan/migrace'
import { createAdminClient } from '@/lib/supabase/admin'

export interface RadekVysledku {
  radek: number
  email: string
  stav: 'zalozeno' | 'chyba'
  detail: string
}

export interface VysledekImportu {
  ok: boolean
  chyba?: string
  vysledky?: RadekVysledku[]
}

/**
 * R36: hromadný import starších ACC studentů. Formát řádku (CSV, oddělovač
 * čárka nebo středník):  Jméno Příjmení, email, hotové dlouhé (0–2)[, skupina]
 */
export async function importujStudenty(
  _predchozi: VysledekImportu | null,
  formData: FormData,
): Promise<VysledekImportu> {
  await vyzadujRoli(['meira', 'admin'])
  const admin = createAdminClient()

  const vstup = String(formData.get('data') ?? '').trim()
  const poslatEmaily = formData.get('poslat_emaily') === 'on'
  if (!vstup) return { ok: false, chyba: 'Vložte data k importu.' }

  const radky = vstup
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean)
  if (radky.length > 100) {
    return { ok: false, chyba: 'Najednou lze importovat nejvýše 100 studentů.' }
  }

  const vysledky: RadekVysledku[] = []
  const dnesIso = new Date().toISOString().slice(0, 10)

  for (let i = 0; i < radky.length; i++) {
    const cislo = i + 1
    const casti = radky[i]!.split(/[;,]/).map((c) => c.trim())
    const [jmeno, email, hotoveText, skupina] = [casti[0], casti[1]?.toLowerCase(), casti[2], casti[3]]

    if (!jmeno || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      vysledky.push({ radek: cislo, email: email ?? '?', stav: 'chyba', detail: 'Neplatné jméno nebo e-mail.' })
      continue
    }
    const hotove = Number(hotoveText ?? '0')
    if (![0, 1, 2].includes(hotove)) {
      vysledky.push({ radek: cislo, email, stav: 'chyba', detail: 'Hotové dlouhé musí být 0, 1, nebo 2.' })
      continue
    }

    // 1) auth účet + profil + student (stejné kroky jako ruční založení)
    const { data: novy, error: chybaAuth } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (chybaAuth || !novy?.user) {
      vysledky.push({
        radek: cislo,
        email,
        stav: 'chyba',
        detail: chybaAuth?.code === 'email_exists' ? 'E-mail už v systému existuje.' : (chybaAuth?.message ?? 'Účet selhal.'),
      })
      continue
    }
    const userId = novy.user.id
    const uklid = async () => {
      await admin.from('students').delete().eq('profile_id', userId)
      await admin.from('profiles').delete().eq('id', userId)
      await admin.auth.admin.deleteUser(userId).catch(() => {})
    }

    const { error: chybaProfilu } = await admin
      .from('profiles')
      .insert({ id: userId, jmeno, email, role: 'student' })
    if (chybaProfilu) {
      await uklid()
      vysledky.push({ radek: cislo, email, stav: 'chyba', detail: chybaProfilu.message })
      continue
    }

    const { data: student, error: chybaStudenta } = await admin
      .from('students')
      .insert({
        profile_id: userId,
        program: 'acc',
        datum_startu: dnesIso,
        skupina: skupina || 'migrace',
        poznamky: `Migrace: ${hotove} hotové dlouhé praktiky před zavedením systému.`,
      })
      .select('id')
      .single()
    if (chybaStudenta || !student) {
      await uklid()
      vysledky.push({ radek: cislo, email, stav: 'chyba', detail: chybaStudenta?.message ?? 'Student selhal.' })
      continue
    }

    // 2) migrační plán dle R36
    const plan = pripravMigracniPlan({ hotoveDlouhe: hotove as 0 | 1 | 2, dnes: new Date() })
    const { error: chybaPlanu } = await admin.from('plan_items').insert(
      plan.map((p) => ({
        student_id: student.id,
        poradi: p.poradi,
        typ: p.typ,
        faze: p.faze,
        termin: p.termin.toISOString().slice(0, 10),
        stav: p.stav,
        splneno_at: p.stav === 'splneno_historicky' ? new Date().toISOString() : null,
      })),
    )
    if (chybaPlanu) {
      await uklid()
      vysledky.push({ radek: cislo, email, stav: 'chyba', detail: chybaPlanu.message })
      continue
    }

    // 3) uvítací e-mail s magic linkem (volitelně)
    let detail = `Plán: ${plan.filter((p) => p.stav === 'naplanovano').length} zbývajících položek.`
    if (poslatEmaily) {
      const zbyva = plan.filter((p) => p.stav === 'naplanovano')
      const { data: odkaz } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      if (odkaz?.properties) {
        const odeslano = await posliEmail({
          komu: email,
          predmet: 'Vítejte v systému certifikace CoachVille',
          html: uvitaciEmail({
            jmeno,
            odkazUrl: `${appUrl()}/auth/confirm?token_hash=${odkaz.properties.hashed_token}&type=magiclink`,
            prihlaseniUrl: `${appUrl()}/prihlaseni`,
            pocetPolozek: zbyva.length,
            prvniTermin: zbyva[0]?.termin ?? new Date(),
          }),
        })
        detail += odeslano.ok ? ' E-mail odeslán.' : ` E-mail selhal (${odeslano.chyba}).`
      } else {
        detail += ' Přihlašovací odkaz se nepodařilo vygenerovat.'
      }
    }

    vysledky.push({ radek: cislo, email, stav: 'zalozeno', detail })
  }

  revalidatePath('/studenti')
  return { ok: true, vysledky }
}
