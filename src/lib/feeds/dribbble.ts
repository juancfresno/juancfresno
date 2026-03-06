import type { FeedItem, DribbbleShot } from './types'

const API = 'https://api.dribbble.com/v2/user/shots'

export async function fetchDribbbleFeed(limit = 12): Promise<FeedItem[]> {
  const token = process.env.DRIBBBLE_ACCESS_TOKEN
  if (!token) {
    console.warn('[SocialFeed] DRIBBBLE_ACCESS_TOKEN not set — skipping')
    return []
  }

  try {
    const res = await fetch(`${API}?per_page=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 43200 }, // 12 h ISR
    })

    if (!res.ok) {
      console.error(`[SocialFeed] Dribbble API ${res.status}`)
      return []
    }

    const shots: DribbbleShot[] = await res.json()

    return shots.map((shot) => ({
      id: `dr-${shot.id}`,
      source: 'dribbble' as const,
      imageUrl: shot.images.hidpi ?? shot.images.normal,
      permalink: shot.html_url,
      label: shot.title.substring(0, 60),
      date: shot.published_at,
    }))
  } catch (err) {
    console.error('[SocialFeed] Dribbble fetch error:', err)
    return []
  }
}
