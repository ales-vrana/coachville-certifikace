import 'server-only'

export type Role = 'kouc' | 'klient' | 'neurceno'

export type Usek = {
  role: Role
  /** interní id mluvčího ze služby (speaker_0, speaker_1…) */
  mluvci: string
  /** začátek úseku v sekundách */
  od: number
  text: string
}

interface SlovoScribe {
  text: string
  type?: string
  speaker_id?: string
  start?: number
}

/** Pošle audio na ElevenLabs Scribe s diarizací a vrátí úseky po mluvčích. */
export async function prepisNahravku(
  audio: ArrayBuffer,
  nazevSouboru: string,
  jazyk: 'cs' | 'sk' = 'cs',
): Promise<{ useky: Usek[]; slova: SlovoScribe[] }> {
  const klic = process.env.ELEVENLABS_API_KEY
  if (!klic || klic.startsWith('SEM_')) {
    throw new Error('ELEVENLABS_API_KEY není nastaven')
  }

  const form = new FormData()
  form.append('file', new Blob([audio]), nazevSouboru)
  form.append('model_id', 'scribe_v1')
  form.append('language_code', jazyk)
  form.append('diarize', 'true')

  const odpoved = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': klic },
    body: form,
  })
  if (!odpoved.ok) {
    throw new Error(`ElevenLabs HTTP ${odpoved.status}: ${(await odpoved.text()).slice(0, 300)}`)
  }

  const data = (await odpoved.json()) as { words?: SlovoScribe[] }
  const slova = data.words ?? []
  if (!slova.length) throw new Error('ElevenLabs vrátil prázdný přepis')

  // slova → úseky po mluvčích
  const useky: Usek[] = []
  for (const w of slova) {
    if (w.type === 'spacing') {
      const posledni = useky.at(-1)
      if (posledni) posledni.text += ' '
      continue
    }
    const mluvci = w.speaker_id ?? 'neznamy'
    const posledni = useky.at(-1)
    if (posledni && posledni.mluvci === mluvci) {
      posledni.text += w.text
    } else {
      useky.push({ role: 'neurceno', mluvci, od: w.start ?? 0, text: w.text })
    }
  }
  return { useky, slova }
}

/**
 * Určí, který mluvčí je Kouč a který Klient (zadání Aleše, 2026-07-29):
 * kouč setkání zahajuje a ptá se na souhlas (mluví první), pokládá otázky
 * a má kratší vstupy; klient souhlasí, definuje téma a mluví déle.
 */
export function oznacRole(useky: Usek[]): { useky: Usek[]; zduvodneni: string } {
  const mluvci = [...new Set(useky.map((u) => u.mluvci))]

  if (mluvci.length === 1) {
    // jediný mluvčí — nelze rozlišit, označíme neurčeně a nechame na lidech
    return {
      useky: useky.map((u) => ({ ...u, role: 'neurceno' as Role })),
      zduvodneni: 'V nahrávce byl rozpoznán jen jeden mluvčí, role nelze určit.',
    }
  }

  const skore = new Map<string, number>(mluvci.map((m) => [m, 0]))
  const pripis = (m: string, body: number) => skore.set(m, (skore.get(m) ?? 0) + body)

  // 1) kdo mluví první, zahajuje setkání → kouč (+2)
  pripis(useky[0]!.mluvci, 2)

  // 2) podíl otázek: kouč se ptá častěji (+1)
  const otazky = new Map<string, number>()
  const pocetUseku = new Map<string, number>()
  const slovaCelkem = new Map<string, number>()
  for (const u of useky) {
    otazky.set(u.mluvci, (otazky.get(u.mluvci) ?? 0) + (u.text.match(/\?/g)?.length ?? 0))
    pocetUseku.set(u.mluvci, (pocetUseku.get(u.mluvci) ?? 0) + 1)
    slovaCelkem.set(u.mluvci, (slovaCelkem.get(u.mluvci) ?? 0) + u.text.split(/\s+/).length)
  }
  const podilOtazek = (m: string) => (otazky.get(m) ?? 0) / Math.max(1, pocetUseku.get(m) ?? 1)
  const podleOtazek = [...mluvci].sort((a, b) => podilOtazek(b) - podilOtazek(a))[0]!
  pripis(podleOtazek, 1)

  // 3) kratší vstupy: kouč má méně slov na úsek (+1)
  const prumerSlov = (m: string) =>
    (slovaCelkem.get(m) ?? 0) / Math.max(1, pocetUseku.get(m) ?? 1)
  const podleDelky = [...mluvci].sort((a, b) => prumerSlov(a) - prumerSlov(b))[0]!
  pripis(podleDelky, 1)

  const poradi = [...skore.entries()].sort((a, b) => b[1] - a[1])
  const kouc = poradi[0]![0]

  const zduvodneni =
    `Kouč = ${kouc} (zahajuje: ${useky[0]!.mluvci === kouc ? 'ano' : 'ne'}, ` +
    `podíl otázek: ${podilOtazek(kouc).toFixed(2)}, ` +
    `prům. délka vstupu: ${Math.round(prumerSlov(kouc))} slov; ` +
    `skóre ${poradi.map(([m, s]) => `${m}=${s}`).join(', ')})`

  return {
    useky: useky.map((u) => ({ ...u, role: u.mluvci === kouc ? 'kouc' : 'klient' })),
    zduvodneni,
  }
}

function formatujCas(sekundy: number): string {
  const m = Math.floor(sekundy / 60)
  const s = Math.floor(sekundy % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export const ROLE_TITULKY: Record<Role, string> = {
  kouc: 'Kouč',
  klient: 'Klient',
  neurceno: 'Mluvčí',
}

/** Čitelný text transkriptu pro uložení a e-maily. */
export function formatujTranskript(useky: Usek[]): string {
  return useky
    .map((u) => `[${formatujCas(u.od)}] ${ROLE_TITULKY[u.role]}:\n${u.text.trim()}`)
    .join('\n\n')
}
