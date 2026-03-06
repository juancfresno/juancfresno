import { NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * Vercel Cron — refreshes the Instagram long-lived token every 14 days.
 * Token lasts 60 days, so we have 4 refresh opportunities before expiry.
 */
export async function GET(request: Request) {
  // Verify request comes from Vercel Cron
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentToken = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!currentToken) {
    return NextResponse.json(
      { error: 'INSTAGRAM_ACCESS_TOKEN not configured' },
      { status: 500 },
    )
  }

  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`,
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('[Cron] Instagram token refresh failed:', text)
      return NextResponse.json({ error: 'Refresh failed', details: text }, { status: 500 })
    }

    const data = await res.json()
    // data = { access_token: "NEW_TOKEN", token_type: "bearer", expires_in: 5184000 }

    // Update env var via Vercel REST API (if configured)
    const vercelToken = process.env.VERCEL_TOKEN
    const projectId = process.env.VERCEL_PROJECT_ID

    if (vercelToken && projectId) {
      await fetch(
        `https://api.vercel.com/v10/projects/${projectId}/env/INSTAGRAM_ACCESS_TOKEN`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            value: data.access_token,
            target: ['production', 'preview', 'development'],
          }),
        },
      )
    }

    return NextResponse.json({
      success: true,
      expires_in: data.expires_in,
      refreshed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[Cron] Token refresh error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
