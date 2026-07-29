import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const VEREJNE_CESTY = ['/prihlaseni', '/auth']

/** Obnova Supabase session + přesměrování nepřihlášených na /prihlaseni. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() ověří token proti auth serveru — mezi createServerClient
  // a tímto voláním nesmí být žádný jiný kód.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const cesta = request.nextUrl.pathname
  const jeVerejna = VEREJNE_CESTY.some((v) => cesta === v || cesta.startsWith(`${v}/`))

  if (!user && !jeVerejna) {
    const url = request.nextUrl.clone()
    url.pathname = '/prihlaseni'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
