import { NextResponse, type NextRequest } from 'next/server'
import { FDS_COOKIE, FDS_HOST, fdsToken, safeEqual } from '@/lib/fds-auth'
import { DEFAULT_LOCALE, LOCALE_COOKIE, SEGMENTS, isLocale, parsePath } from '@/i18n/config'
import { WIP } from '@/lib/wip'

// Two jobs:
// 1. FDS docs live at fds.juancfresno.com behind a password cover. The static
//    files stay in public/FDS; this proxy serves them on the subdomain and
//    closes the old public path www.juancfresno.com/FDS.
// 2. Locales (src/i18n/config.ts): English URLs have no prefix and are
//    rewritten to app/[lang]=en; /es/… is served as is (translated slugs are
//    mapped back to the internal folder); public /en/… redirects to the bare
//    path. The only redirect by preference: / with the selector's cookie
//    lang=es → /es. No Accept-Language detection (copy-web-v1-es.md, decision
//    3): crawlers and shared links always get the URL they asked for.

const PRIVATE_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'private, no-store',
}

function withHeaders(res: NextResponse) {
  for (const [k, v] of Object.entries(PRIVATE_HEADERS)) res.headers.set(k, v)
  return res
}

async function fds(request: NextRequest, host: string) {
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

// Static HTML in public/ served through next.config rewrites: not localized.
const PASSTHROUGH = /^\/(medida|glyf)(\/|$)/
// Metadata routes generated per locale (og images): fetched by their /en/… URL.
const METADATA_ROUTE = /\/(opengraph-image|twitter-image)(-\w+)?$/

function locale(request: NextRequest) {
  const url = request.nextUrl
  const { pathname } = url
  if (PASSTHROUGH.test(pathname)) return NextResponse.next()

  const first = pathname.split('/')[1]

  // WIP landing (lib/wip.ts): only the locale roots (and their og image) are
  // live. The v1.0 sections (every first segment in SEGMENTS: work, about,
  // contact, feed, lab, journal, legal, and their subpaths) → / or /es,
  // temporary (307) so those URLs keep their standing for launch. Anything
  // else is truly unknown and falls through to the 404 (real 404 status).
  if (WIP) {
    const prefixed = isLocale(first)
    const rest = prefixed ? pathname.slice(first.length + 1) : pathname
    const section = parsePath(pathname).path.split('/')[1]
    const held = !!section && Object.hasOwn(SEGMENTS, section) && !METADATA_ROUTE.test(rest)
    if (held) {
      const to = url.clone()
      to.pathname = prefixed && first !== DEFAULT_LOCALE ? `/${first}` : '/'
      to.search = ''
      return NextResponse.redirect(to, 307)
    }
  }

  // Public /en/… → bare path (English has no prefix).
  if (first === DEFAULT_LOCALE) {
    if (METADATA_ROUTE.test(pathname)) return NextResponse.next()
    const to = url.clone()
    to.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || '/'
    return NextResponse.redirect(to, 308)
  }

  if (isLocale(first)) {
    // Translated first segment → internal folder.
    const { path } = parsePath(pathname)
    const internal = `/${first}${path === '/' ? '' : path}`
    if (internal === pathname) return NextResponse.next()
    // An internal id typed under /es when Spanish has its own slug → the public one.
    const seg = pathname.split('/')[2]
    if (seg && SEGMENTS[seg] && SEGMENTS[seg][first] !== seg) {
      const to = url.clone()
      to.pathname = pathname.replace(`/${first}/${seg}`, `/${first}/${SEGMENTS[seg][first]}`)
      return NextResponse.redirect(to, 308)
    }
    const to = url.clone()
    to.pathname = internal
    return NextResponse.rewrite(to)
  }

  // English URL. Home only: the language chosen in the selector.
  if (pathname === '/') {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value
    if (isLocale(saved) && saved !== DEFAULT_LOCALE) {
      const to = url.clone()
      to.pathname = `/${saved}`
      return NextResponse.redirect(to, 307)
    }
  }

  const to = url.clone()
  to.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(to)
}

export async function proxy(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const { pathname } = request.nextUrl
  if (host === FDS_HOST || pathname === '/FDS' || pathname.startsWith('/FDS/')) return fds(request, host)
  return locale(request)
}

export const config = {
  matcher: [
    '/FDS',
    '/FDS/:path*',
    // Must be a literal (statically parsed); keep in sync with FDS_HOST.
    { source: '/:path*', has: [{ type: 'host', value: 'fds.juancfresno.com' }] },
    // Pages: everything except API, Next internals, Vercel and files with an extension.
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
}
