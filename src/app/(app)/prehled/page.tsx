import { redirect } from 'next/navigation'
import { nactiProfil } from '@/lib/auth/over-roli'
import { MentoruvPrehled } from './mentoruv-prehled'
import { StudentuvPlan } from './studentuv-plan'

export default async function PrehledPage() {
  const profil = await nactiProfil()
  if (!profil) redirect('/prihlaseni')

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Dobrý den, {profil.jmeno.split(' ')[0]}
      </h1>

      {profil.role === 'student' && <StudentuvPlan profileId={profil.id} />}
      {profil.role === 'mentor' && <MentoruvPrehled profileId={profil.id} />}
      {['verca', 'meira', 'admin'].includes(profil.role) && (
        <p className="mt-4 text-sm text-zinc-500">
          Vše důležité najdete v menu vlevo — studenty, fronty i mentory. První ostrá nahrávka:
          září 2026.
        </p>
      )}
    </main>
  )
}
