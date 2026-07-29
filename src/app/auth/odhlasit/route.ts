import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // 303: po POSTu přesměrovat GETem (307 by metodu zachovalo a stránka vrátí 405)
  return NextResponse.redirect(new URL('/prihlaseni', new URL(request.url).origin), 303)
}
