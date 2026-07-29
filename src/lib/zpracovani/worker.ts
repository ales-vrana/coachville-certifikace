import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/database.types'
import { formatujTranskript, oznacRole, prepisNahravku } from './transkripce'
import { vygenerujReport } from './vyhodnoceni'

const BUCKET = 'nahravky'

export interface VysledekUlohy {
  zpracovano: boolean
  jobId?: string
  typ?: string
  vysledek?: string
  chyba?: string
}

async function zapisUdalost(
  recordingId: string,
  typ: string,
  detail: { [key: string]: Json | undefined } = {},
) {
  const admin = createAdminClient()
  await admin.from('recording_events').insert({ recording_id: recordingId, typ, detail })
}

/**
 * Vezme nejstarší čekající úlohu z fronty a zpracuje ji (kap. 11: tabulka
 * úloh + plánované funkce). Vrací zpracovano=false, když fronta je prázdná.
 */
export async function zpracujDalsiUlohu(): Promise<VysledekUlohy> {
  const admin = createAdminClient()

  const { data: kandidat } = await admin
    .from('job_queue')
    .select('id, typ, payload, pokusy, max_pokusu')
    .eq('stav', 'ceka')
    .lte('run_after', new Date().toISOString())
    .order('created_at')
    .limit(1)
    .single()
  if (!kandidat) return { zpracovano: false }

  // převzetí úlohy — podmínka stav=ceka brání dvojímu zpracování
  const { data: prevzato } = await admin
    .from('job_queue')
    .update({ stav: 'bezi', locked_at: new Date().toISOString() })
    .eq('id', kandidat.id)
    .eq('stav', 'ceka')
    .select('id')
  if (!prevzato?.length) return { zpracovano: false }

  try {
    const vysledek = await vykonejUlohu(kandidat.typ, kandidat.payload as { recording_id?: string })
    await admin.from('job_queue').update({ stav: 'hotovo', chyba: null }).eq('id', kandidat.id)
    return { zpracovano: true, jobId: kandidat.id, typ: kandidat.typ, vysledek }
  } catch (e) {
    const zprava = e instanceof Error ? e.message : String(e)
    const pokusy = kandidat.pokusy + 1
    const vycerpano = pokusy >= kandidat.max_pokusu
    await admin
      .from('job_queue')
      .update({
        stav: vycerpano ? 'chyba' : 'ceka',
        pokusy,
        chyba: zprava,
        locked_at: null,
        // exponenciální odklad dalšího pokusu: 2, 4, 8 minut
        run_after: new Date(Date.now() + 2 ** pokusy * 60_000).toISOString(),
      })
      .eq('id', kandidat.id)
    return { zpracovano: true, jobId: kandidat.id, typ: kandidat.typ, chyba: zprava }
  }
}

async function vykonejUlohu(
  typ: string,
  payload: { recording_id?: string },
): Promise<string> {
  const recordingId = payload.recording_id
  if (!recordingId) throw new Error('Úloha nemá recording_id')

  const admin = createAdminClient()
  const { data: nahravka } = await admin
    .from('recordings')
    .select('id, stav, puvodni_soubor_path, puvodni_nazev, plan_item_id')
    .eq('id', recordingId)
    .single()
  if (!nahravka) throw new Error(`Nahrávka ${recordingId} nenalezena`)

  const { data: polozka } = await admin
    .from('plan_items')
    .select('id, typ')
    .eq('id', nahravka.plan_item_id)
    .single()
  if (!polozka) throw new Error('Položka plánu nenalezena')

  switch (typ) {
    // MVP: MP3 konverze se zatím přeskakuje — transkripce čte originální
    // formát přímo; jednotný MP3 archiv je v TODO (fáze 2).
    case 'konverze_mp3': {
      if (polozka.typ === 'kratka_bez_vyhodnoceni') {
        // krátká bez vyhodnocení: jen uložení a započtení (F3, kap. 3)
        await admin.from('recordings').update({ stav: 'zapocteno' }).eq('id', nahravka.id)
        await admin.from('plan_items').update({ stav: 'splneno', splneno_at: new Date().toISOString() }).eq('id', polozka.id)
        await zapisUdalost(nahravka.id, 'zapocteno_bez_vyhodnoceni')
        return 'započteno bez vyhodnocení'
      }
      await admin.from('recordings').update({ stav: 'zpracovava_se' }).eq('id', nahravka.id)
      await admin.from('job_queue').insert({ typ: 'transkripce', payload: { recording_id: nahravka.id } })
      await zapisUdalost(nahravka.id, 'konverze_preskocena', { pozn: 'transkripce čte originál; MP3 archiv ve fázi 2' })
      return 'předáno na transkripci'
    }

    case 'transkripce': {
      if (!nahravka.puvodni_soubor_path) throw new Error('Nahrávka nemá soubor')
      const { data: soubor, error: chybaStazeni } = await admin.storage
        .from(BUCKET)
        .download(nahravka.puvodni_soubor_path)
      if (chybaStazeni || !soubor) {
        throw new Error(`Soubor se nepodařilo stáhnout: ${chybaStazeni?.message ?? ''}`)
      }

      const audio = await soubor.arrayBuffer()
      const { useky } = await prepisNahravku(audio, nahravka.puvodni_nazev ?? 'nahravka')
      const { useky: oznacene, zduvodneni } = oznacRole(useky)

      await admin.from('transcripts').upsert(
        {
          recording_id: nahravka.id,
          text: formatujTranskript(oznacene),
          segmenty: { useky: oznacene, urceni_roli: zduvodneni },
          sluzba: 'elevenlabs_scribe_v1',
        },
        { onConflict: 'recording_id' },
      )
      await zapisUdalost(nahravka.id, 'transkripce_ok', {
        useku: oznacene.length,
        urceni_roli: zduvodneni,
      })

      // dlouhá i krátká s reportem pokračují na AI vyhodnocení (F3)
      await admin.from('job_queue').insert({ typ: 'vyhodnoceni', payload: { recording_id: nahravka.id } })
      return `transkript uložen (${oznacene.length} úseků)`
    }

    case 'vyhodnoceni': {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('Čeká na Claude API klíč (ANTHROPIC_API_KEY není nastaven)')
      }
      if (polozka.typ === 'kratka_bez_vyhodnoceni') {
        return 'krátká bez vyhodnocení — nic negeneruji'
      }

      const { data: transkript } = await admin
        .from('transcripts')
        .select('text')
        .eq('recording_id', nahravka.id)
        .single()
      if (!transkript) throw new Error('Transkript ještě neexistuje')

      const vysledek = await vygenerujReport({
        typPolozky: polozka.typ,
        transkript: transkript.text,
      })

      await admin.from('reports').upsert(
        {
          recording_id: nahravka.id,
          prompt_typ: vysledek.promptTyp,
          prompt_verze: vysledek.promptVerze,
          obsah_ai: vysledek.obsah,
          obsah: vysledek.obsah,
          stav: 'koncept',
        },
        { onConflict: 'recording_id' },
      )

      // dlouhá čeká na přiřazení mentora (F4), krátká na schválení Verčou (F5)
      const novyStav = polozka.typ === 'dlouha' ? 'ceka_na_mentora' : 'ceka_na_schvaleni'
      await admin.from('recordings').update({ stav: novyStav }).eq('id', nahravka.id)
      await zapisUdalost(nahravka.id, 'vyhodnoceni_ok', {
        prompt_typ: vysledek.promptTyp,
        prompt_verze: vysledek.promptVerze,
        model: vysledek.model,
      })
      return `report vygenerován (${vysledek.promptTyp} v${vysledek.promptVerze})`
    }

    default:
      throw new Error(`Neznámý typ úlohy: ${typ}`)
  }
}
