/**
 * Založí interní účet (verca / meira / admin): auth uživatele + profil.
 * Mentory zakládejte v administraci aplikace (/admin/mentori).
 *
 * Spuštění:
 *   node --env-file=.env.local scripts/zaloz-uzivatele.ts <email> "<Jméno Příjmení>" <verca|meira|admin>
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
const email = process.argv[2]
const jmeno = process.argv[3]
const role = process.argv[4]

if (!url || !secret || !email || !jmeno || !['verca', 'meira', 'admin'].includes(role ?? '')) {
  console.error('Použití: node --env-file=.env.local scripts/zaloz-uzivatele.ts <email> "<Jméno Příjmení>" <verca|meira|admin>')
  process.exit(1)
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let userId: string
const { data: novy, error } = await supabase.auth.admin.createUser({ email, email_confirm: true })
if (novy?.user) {
  userId = novy.user.id
} else if (error && (error.code === 'email_exists' || /already/i.test(error.message))) {
  const { data: seznam } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existujici = seznam?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!existujici) {
    console.error('Uživatel prý existuje, ale nebyl nalezen.')
    process.exit(1)
  }
  userId = existujici.id
} else {
  console.error('Založení selhalo:', error?.message)
  process.exit(1)
}

const { error: chybaProfilu } = await supabase
  .from('profiles')
  .upsert({ id: userId, jmeno, email, role })
if (chybaProfilu) {
  console.error('Profil selhal:', chybaProfilu.message)
  process.exit(1)
}
console.log(`Založeno: ${jmeno} (${role}) — přihlásí se magic linkem na ${email}`)
