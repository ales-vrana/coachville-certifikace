import Image from 'next/image'
import { nactiNavrhPodleTokenu } from '@/lib/plan/navrh-akce'
import { FAZE_POPISKY, TYP_POLOZKY_POPISKY, formatujDatum } from '@/lib/popisky'
import { PotvrditTlacitko } from './potvrdit-tlacitko'

/**
 * Veřejná stránka „Potvrdit plán" z e-mailu s návrhem. Nepotvrzuje se už při
 * otevření odkazu (to by uměly udělat e-mailové skenery) — potvrzení provede
 * až tlačítko na stránce. Přístup chrání jednorázový token.
 */
export default async function PotvrzeniPlanuPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const navrh = token ? await nactiNavrhPodleTokenu(token) : null

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Image src="/coachville-logo.png" alt="CoachVille" width={152} height={36} priority />
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">Plán termínů pro nahrávky</h1>

        {navrh?.ok && navrh.terminy ? (
          <>
            <p className="mt-2 text-sm text-zinc-600">
              {navrh.jmeno}, tady je návrh tvých termínů pro dodání nahrávek. Kliknutím na
              tlačítko ho potvrdíš — tím je plán stanoven napevno.
            </p>
            <ul className="mt-5 space-y-2">
              {navrh.terminy.map((t) => (
                <li
                  key={t.poradi}
                  className="flex items-baseline justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                >
                  <span className="text-zinc-700">
                    <span className="mr-2 text-zinc-400">{t.poradi}.</span>
                    {TYP_POLOZKY_POPISKY[t.typ]}
                    {t.faze && (
                      <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                        {FAZE_POPISKY[t.faze]}
                      </span>
                    )}
                  </span>
                  <span className="whitespace-nowrap font-medium text-zinc-900">
                    {formatujDatum(t.termin)}
                  </span>
                </li>
              ))}
            </ul>
            <PotvrditTlacitko token={token!} />
          </>
        ) : (
          <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            {navrh?.chyba ??
              'Odkaz není úplný — otevři prosím tlačítko „Potvrdit plán" přímo z e-mailu s návrhem.'}
          </div>
        )}
      </div>
    </main>
  )
}
