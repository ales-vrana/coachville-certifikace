import { NextResponse, type NextRequest } from 'next/server'
import { zpracujDalsiUlohu, type VysledekUlohy } from '@/lib/zpracovani/worker'

// Zpracování fronty může trvat (stažení souboru + transkripce delší nahrávky)
export const maxDuration = 300

const CASOVY_ROZPOCET_MS = 240_000

function autorizovano(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

async function zpracujFrontu(): Promise<VysledekUlohy[]> {
  const start = Date.now()
  const vysledky: VysledekUlohy[] = []
  while (Date.now() - start < CASOVY_ROZPOCET_MS) {
    const vysledek = await zpracujDalsiUlohu()
    if (!vysledek.zpracovano) break
    vysledky.push(vysledek)
  }
  return vysledky
}

/** Spouštěno po uploadu (waitUntil) a ručně; GET pro Vercel Cron. */
export async function POST(request: NextRequest) {
  if (!autorizovano(request)) return NextResponse.json({ chyba: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ ulohy: await zpracujFrontu() })
}

export async function GET(request: NextRequest) {
  if (!autorizovano(request)) return NextResponse.json({ chyba: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ ulohy: await zpracujFrontu() })
}
