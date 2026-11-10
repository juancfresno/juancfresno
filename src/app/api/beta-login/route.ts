import { NextResponse, type NextRequest } from 'next/server'
import {
  BETA_COOKIE,
  BETA_COOKIE_MAX_AGE,
  BETA_ERROR_PARAM,
  betaToken,
  isBetaHost,
  safeEqual,
  safeNext,
} from '@/lib/beta-auth'

// POST from the beta cover form. Right password → signed cookie → back to the page asked for.
export async function POST(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  if (!isBetaHost(host)) return new NextResponse(null, { status: 404 })

  const form = await request.formData().catch(() => null)
  const given = String(form?.get('password') ?? '')
  const next = safeNext(form?.get('next'))
  const password = process.env.BETA_PASSWORD || process.env.FDS_PASSWORD

  const ok = !!password && safeEqual(await betaToken(given), await betaToken(password))
  const to = new URL(next, request.url)
  if (ok) to.searchParams.delete(BETA_ERROR_PARAM)
  else to.searchParams.set(BETA_ERROR_PARAM, '1')

  const res = NextResponse.redirect(to, 303)
  res.headers.set('Cache-Control', 'no-store')
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  if (ok) {
    res.cookies.set(BETA_COOKIE, await betaToken(password!), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: BETA_COOKIE_MAX_AGE,
    })
  }
  return res
}
