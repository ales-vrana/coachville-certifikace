import Link from 'next/link'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { ImportFormular } from './import-formular'

export default async function ImportPage() {
  await vyzadujRoli(['meira', 'admin'])

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/studenti" className="hover:underline">
          ← Studenti
        </Link>
      </nav>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Import starších studentů (migrace)
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Jeden student = jeden řádek ve tvaru{' '}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          Jméno Příjmení, email, hotové dlouhé (0–2), skupina
        </code>
        . Podle počtu hotových praktik systém dopočítá zbývající povinnosti (R36) a termíny
        rozloží od dneška — doladíte je v editaci plánu.
      </p>
      <ImportFormular />
    </main>
  )
}
