import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Admin klient s tajným klíčem — obchází RLS. Veškerý přístup k datům jde
 * v této aplikaci přes server (RLS je deny-all, klient do DB nesahá přímo),
 * autorizaci podle role hlídá aplikační kód. Nikdy neimportovat do klientského
 * kódu — `server-only` to vynucuje při buildu.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
