/**
 * Test transkripce s rozlišením mluvčích (R37): pošle audio soubor na
 * Deepgram a ElevenLabs (podle toho, které klíče jsou v .env.local)
 * a uloží přepisy členěné po mluvčích vedle vstupního souboru.
 *
 * Spuštění:
 *   node --env-file=.env.local scripts/test-transkripce.ts <soubor.wav> [výstupní složka]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

const soubor = process.argv[2]
const vystupniSlozka = process.argv[3]
if (!soubor) {
  console.error('Použití: node --env-file=.env.local scripts/test-transkripce.ts <soubor.wav> [výstupní složka]')
  process.exit(1)
}

const audio = readFileSync(soubor)
const zaklad = basename(soubor).replace(/\.[^.]+$/, '')
const slozka = vystupniSlozka ?? dirname(soubor)

interface Usek {
  mluvci: string
  od: number
  text: string
}

function formatujCas(sekundy: number): string {
  const m = Math.floor(sekundy / 60)
  const s = Math.floor(sekundy % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function zapis(sluzba: string, useky: Usek[]) {
  const text = useky
    .map((u) => `[${formatujCas(u.od)}] Mluvčí ${u.mluvci}:\n${u.text.trim()}`)
    .join('\n\n')
  const cesta = join(slozka, `${zaklad}-${sluzba}.txt`)
  writeFileSync(cesta, text + '\n')
  const mluvci = new Set(useky.map((u) => u.mluvci))
  console.log(`✓ ${sluzba}: ${useky.length} úseků, ${mluvci.size} mluvčí → ${cesta}`)
}

async function deepgram(klic: string) {
  async function zavolat(model: string) {
    const params = new URLSearchParams({
      model,
      language: 'cs',
      diarize: 'true',
      smart_format: 'true',
      utterances: 'true',
    })
    return fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: 'POST',
      headers: { Authorization: `Token ${klic}`, 'Content-Type': 'audio/wav' },
      body: audio,
    })
  }

  let model = 'nova-3'
  let odpoved = await zavolat(model)
  if (!odpoved.ok) {
    model = 'nova-2'
    odpoved = await zavolat(model)
  }
  if (!odpoved.ok) {
    console.error(`✗ deepgram: HTTP ${odpoved.status} — ${(await odpoved.text()).slice(0, 300)}`)
    return
  }
  const data = await odpoved.json()
  const utterances: Array<{ speaker: number; start: number; transcript: string }> =
    data.results?.utterances ?? []
  if (!utterances.length) {
    console.error('✗ deepgram: odpověď neobsahuje úseky (utterances)')
    return
  }
  // sloučit navazující úseky téhož mluvčího
  const useky: Usek[] = []
  for (const u of utterances) {
    const posledni = useky.at(-1)
    if (posledni && posledni.mluvci === String(u.speaker + 1)) {
      posledni.text += ' ' + u.transcript
    } else {
      useky.push({ mluvci: String(u.speaker + 1), od: u.start, text: u.transcript })
    }
  }
  console.log(`  (deepgram model: ${model})`)
  zapis('deepgram', useky)
}

async function elevenlabs(klic: string) {
  const form = new FormData()
  form.append('file', new Blob([audio], { type: 'audio/wav' }), basename(soubor))
  form.append('model_id', 'scribe_v1')
  form.append('language_code', 'cs')
  form.append('diarize', 'true')

  const odpoved = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': klic },
    body: form,
  })
  if (!odpoved.ok) {
    console.error(`✗ elevenlabs: HTTP ${odpoved.status} — ${(await odpoved.text()).slice(0, 300)}`)
    return
  }
  const data = await odpoved.json()
  const slova: Array<{ text: string; speaker_id?: string; start?: number; type?: string }> =
    data.words ?? []
  if (!slova.length) {
    console.error('✗ elevenlabs: odpověď neobsahuje slova')
    return
  }
  const useky: Usek[] = []
  for (const w of slova) {
    if (w.type === 'spacing') {
      const posledni = useky.at(-1)
      if (posledni) posledni.text += ' '
      continue
    }
    const mluvci = (w.speaker_id ?? 'neznámý').replace('speaker_', '')
    const posledni = useky.at(-1)
    if (posledni && posledni.mluvci === mluvci) {
      posledni.text += w.text
    } else {
      useky.push({ mluvci, od: w.start ?? 0, text: w.text })
    }
  }
  zapis('elevenlabs', useky)
}

const dgKlic = process.env.DEEPGRAM_API_KEY
const elKlic = process.env.ELEVENLABS_API_KEY
const maDg = dgKlic && !dgKlic.startsWith('SEM_')
const maEl = elKlic && !elKlic.startsWith('SEM_')

if (!maDg && !maEl) {
  console.error('V .env.local není žádný klíč (DEEPGRAM_API_KEY / ELEVENLABS_API_KEY).')
  process.exit(1)
}

console.log(`Testuji: ${basename(soubor)} (${(audio.length / 1024 / 1024).toFixed(1)} MB)`)
if (maDg) await deepgram(dgKlic!)
if (maEl) await elevenlabs(elKlic!)
