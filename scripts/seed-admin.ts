/**
 * Založí (nebo doplní) admin účet: auth uživatele + řádek v profiles.
 *
 * Spuštění:
 *   node --env-file=.env.local scripts/seed-admin.ts <email> "<Jméno Příjmení>"
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
const email = process.argv[2]
const jmeno = process.argv[3]

if (!url || !secret) {
  console.error('Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SECRET_KEY (spusťte s --env-file=.env.local).')
  process.exit(1)
}
if (!email || !jmeno) {
  console.error('Použití: node --env-file=.env.local scripts/seed-admin.ts <email> "<Jméno Příjmení>"')
  process.exit(1)
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let userId: string

const { data: novy, error } = await supabase.auth.admin.createUser({
  email,
  email_confirm: true,
})

if (novy?.user) {
  userId = novy.user.id
  console.log(`Auth uživatel založen: ${email}`)
} else if (error && (error.code === 'email_exists' || /already/i.test(error.message))) {
  const { data: seznam, error: chybaSeznamu } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (chybaSeznamu) {
    console.error('Nepodařilo se načíst uživatele:', chybaSeznamu.message)
    process.exit(1)
  }
  const existujici = seznam.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!existujici) {
    console.error('Uživatel prý existuje, ale nebyl nalezen.')
    process.exit(1)
  }
  userId = existujici.id
  console.log(`Auth uživatel už existuje: ${email}`)
} else {
  console.error('Založení uživatele selhalo:', error?.message)
  process.exit(1)
}

const { error: chybaProfilu } = await supabase.from('profiles').upsert({
  id: userId,
  jmeno,
  email,
  role: 'admin',
})

if (chybaProfilu) {
  console.error('Uložení profilu selhalo:', chybaProfilu.message)
  process.exit(1)
}

console.log(`Profil uložen: ${jmeno} (admin)`)
