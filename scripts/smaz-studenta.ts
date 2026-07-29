/**
 * Kompletně smaže studenta podle e-mailu (plán, studenta, profil, auth účet).
 * Jen pro úklid testovacích dat — odmítne smazat jinou roli než studenta.
 *
 * Spuštění:
 *   node --env-file=.env.local scripts/smaz-studenta.ts <email>
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
const email = process.argv[2]

if (!url || !secret || !email) {
  console.error('Použití: node --env-file=.env.local scripts/smaz-studenta.ts <email>')
  process.exit(1)
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: profil } = await supabase
  .from('profiles')
  .select('id, jmeno, role')
  .ilike('email', email)
  .single()

if (!profil) {
  console.error(`Profil s e-mailem ${email} nenalezen.`)
  process.exit(1)
}
if (profil.role !== 'student') {
  console.error(`Odmítám: ${profil.jmeno} má roli ${profil.role}, ne student.`)
  process.exit(1)
}

const { data: student } = await supabase
  .from('students')
  .select('id')
  .eq('profile_id', profil.id)
  .single()

if (student) {
  await supabase.from('plan_items').delete().eq('student_id', student.id)
  await supabase.from('students').delete().eq('id', student.id)
}
await supabase.from('profiles').delete().eq('id', profil.id)
const { error } = await supabase.auth.admin.deleteUser(profil.id)
if (error) {
  console.error('Auth účet se nepodařilo smazat:', error.message)
  process.exit(1)
}
console.log(`Smazáno: ${profil.jmeno} (${email})`)
