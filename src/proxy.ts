import { NextResponse, type NextRequest } from 'next/server'
import { FDS_COOKIE, FDS_HOST, fdsToken, safeEqual } from '@/lib/fds-auth'

// FDS docs live at fds.juancfresno.com behind a password cover.
// The static files stay in public/FDS; this proxy serves them on the
// subdomain and closes the old public path www.juancfresno.com/FDS.

const PRIVATE_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'private, no-store',
}

function withHeaders(res: NextResponse) {
  for (const [k, v] of Object.entries(PRIVATE_HEADERS)) res.headers.set(k, v)
  return res
}

export async function proxy(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const { pathname } = request.nextUrl

  // Old path on the main site → the subdomain (no open copy left).
  if (host !== FDS_HOST) {
    return NextResponse.redirect(`https://${FDS_HOST}/`, 308)
  }

  if (pathname === '/api/fds-login') return withHeaders(NextResponse.next())

  if (pathname === '/logout') {
    const res = NextResponse.redirect(new URL('/', request.url), 303)
    res.cookies.delete(FDS_COOKIE)
    return withHeaders(res)
  }

  const password = process.env.FDS_PASSWORD
  const cookie = request.cookies.get(FDS_COOKIE)?.value
  const authed = !!password && !!cookie && safeEqual(cookie, await fdsToken(password))

  if (!authed) {
    return withHeaders(NextResponse.rewrite(new URL('/FDS/login.html', request.url)))
  }

  if (pathname === '/' || pathname === '/index.html') {
    return withHeaders(NextResponse.rewrite(new URL('/FDS/index.html', request.url)))
  }
  if (pathname === '/fds-tokens.css') {
    return withHeaders(NextResponse.rewrite(new URL('/FDS/fds-tokens.css', request.url)))
  }
  return NextResponse.redirect(new URL('/', request.url), 307)
}

export const config = {
  matcher: [
    '/FDS',
    '/FDS/:path*',
    // Must be a literal (statically parsed); keep in sync with FDS_HOST.
    { source: '/:path*', has: [{ type: 'host', value: 'fds.juancfresno.com' }] },
  ],
}
