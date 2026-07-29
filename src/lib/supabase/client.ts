import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

/** Supabase klient pro prohlížeč (jen auth a veřejné operace — data jdou přes server). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        // implicit místo PKCE: magic link jde tokem token_hash → /auth/confirm
        // a musí fungovat i na jiném zařízení, než kde byl vyžádán (PKCE token
        // s prefixem pkce_ jde ověřit jen v původním prohlížeči)
        flowType: 'implicit',
      },
    },
  )
}
