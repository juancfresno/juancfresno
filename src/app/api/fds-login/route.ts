import { NextResponse, type NextRequest } from 'next/server'
import { FDS_COOKIE, FDS_COOKIE_MAX_AGE, FDS_HOST, fdsToken, safeEqual } from '@/lib/fds-auth'

// POST from the FDS cover form. Right password → signed cookie → docs.
export async function POST(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  if (host !== FDS_HOST) return new NextResponse(null, { status: 404 })

  const form = await request.formData().catch(() => null)
  const given = String(form?.get('password') ?? '')
  const password = process.env.FDS_PASSWORD

  const ok = !!password && safeEqual(await fdsToken(given), await fdsToken(password))
  const res = NextResponse.redirect(new URL(ok ? '/' : '/?e=1', request.url), 303)
  res.headers.set('Cache-Control', 'no-store')
  if (ok) {
    res.cookies.set(FDS_COOKIE, await fdsToken(password!), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: FDS_COOKIE_MAX_AGE,
    })
  }
  return res
}
