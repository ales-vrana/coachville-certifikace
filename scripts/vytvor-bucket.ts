/**
 * Založí privátní Storage bucket `nahravky` (idempotentně).
 *
 * Spuštění:
 *   node --env-file=.env.local scripts/vytvor-bucket.ts
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
  console.error('Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SECRET_KEY.')
  process.exit(1)
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Bez omezení MIME typů — „jakýkoli formát, žádná technická bariéra" (kap. 5).
// Free tarif Supabase má globální strop 50 MB na soubor a bucket nesmí mít
// limit vyšší; po přechodu na Pro zvednout (updateBucket) na ~500 MB.
const { error } = await supabase.storage.createBucket('nahravky', {
  public: false,
  fileSizeLimit: 50 * 1024 * 1024,
})

if (error) {
  if (/already exists/i.test(error.message)) {
    console.log('Bucket nahravky už existuje — v pořádku.')
  } else {
    console.error('Bucket se nepodařilo založit:', error.message)
    process.exit(1)
  }
} else {
  console.log('Bucket nahravky založen.')
}
