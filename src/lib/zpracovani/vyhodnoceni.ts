import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const MODEL = 'claude-opus-5'

export interface VysledekVyhodnoceni {
  obsah: string
  promptTyp: 'dlouha' | 'kratka'
  promptVerze: number
  model: string
}

/**
 * Vygeneruje report z transkriptu podle aktivního Master Promptu (kap. 9):
 * do kontextu se vkládá prompt daného typu + knihovna ICF standardů.
 */
export async function vygenerujReport(vstup: {
  typPolozky: 'dlouha' | 'kratka_s_reportem'
  transkript: string
}): Promise<VysledekVyhodnoceni> {
  const admin = createAdminClient()
  const promptTyp = vstup.typPolozky === 'dlouha' ? 'dlouha' : 'kratka'

  const { data: prompt } = await admin
    .from('master_prompts')
    .select('verze, obsah')
    .eq('typ', promptTyp)
    .eq('aktivni', true)
    .order('verze', { ascending: false })
    .limit(1)
    .single()
  if (!prompt) {
    throw new Error(`Chybí aktivní Master Prompt typu ${promptTyp} (admin sekce)`)
  }

  const { data: standardy } = await admin
    .from('standards')
    .select('nazev, obsah')
    .eq('aktivni', true)
    .order('poradi')

  let system = prompt.obsah
  if (standardy?.length) {
    system +=
      '\n\n# Knihovna standardů ICF (závazné podklady pro hodnocení)\n\n' +
      standardy.map((s) => `## ${s.nazev}\n${s.obsah}`).join('\n\n')
  }

  const anthropic = new Anthropic()
  // PCC prompt žádá vyčerpávající kontrolu všech markerů — výstup bývá dlouhý,
  // proto streamování (nad ~16k tokenů hrozí HTTP timeout SDK) a vysoký limit.
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system,
    messages: [
      {
        role: 'user',
        content: `Zde je transkript koučovacího setkání s rozlišením mluvčích a časovými značkami:\n\n${vstup.transkript}`,
      },
    ],
  })
  const odpoved = await stream.finalMessage()

  if (odpoved.stop_reason === 'refusal') {
    throw new Error('Model vyhodnocení odmítl (safety) — předejte nahrávku mentorovi ručně')
  }
  if (odpoved.stop_reason === 'max_tokens') {
    throw new Error('Vyhodnocení překročilo limit délky — zkraťte prompt nebo transkript')
  }

  const text = odpoved.content
    .filter((blok): blok is Anthropic.TextBlock => blok.type === 'text')
    .map((blok) => blok.text)
    .join('\n')
  if (!text.trim()) throw new Error('Model vrátil prázdné vyhodnocení')

  return { obsah: text, promptTyp, promptVerze: prompt.verze, model: MODEL }
}
