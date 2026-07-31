import Image from 'next/image'

/** Úspěšné potvrzení plánu — sem přesměruje potvrzovací akce. */
export default function PlanPotvrzenPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Image src="/coachville-logo.png" alt="CoachVille" width={152} height={36} priority />
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">Plán je potvrzen ✅</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Od teď je závazný — termíny si zapiš do kalendáře. Poslali jsme ti je i e-mailem.
          Nahrávku můžeš dodat i dříve než je termín, později ale ne.
        </p>
        <p className="mt-3 text-sm text-zinc-600">
          Nahrávky budeš odevzdávat po přihlášení do systému — odkaz najdeš v uvítacím e-mailu,
          nebo si necháš poslat nový na přihlašovací stránce.
        </p>
      </div>
    </main>
  )
}
