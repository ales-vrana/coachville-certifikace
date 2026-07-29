import Link from 'next/link'
import { vyzadujRoli } from '@/lib/auth/over-roli'
import { FormularNovehoStudenta } from './formular'

export default async function NovyStudentPage() {
  await vyzadujRoli(['meira', 'admin'])

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/studenti" className="hover:underline">
          ← Studenti
        </Link>
      </nav>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Založit studenta
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Systém vygeneruje individuální plán dodávek a pošle studentovi uvítací e-mail
        s přihlašovacím odkazem.
      </p>
      <FormularNovehoStudenta />
    </main>
  )
}
