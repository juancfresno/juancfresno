import type { FeedItem, InstagramResponse } from './types'

const API = 'https://graph.instagram.com/me/media'
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'

export async function fetchInstagramFeed(limit = 12): Promise<FeedItem[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    console.warn('[SocialFeed] INSTAGRAM_ACCESS_TOKEN not set — skipping')
    return []
  }

  try {
    const res = await fetch(
      `${API}?fields=${FIELDS}&limit=${limit}&access_token=${token}`,
      { next: { revalidate: 43200 } }, // 12 h ISR
    )

    if (!res.ok) {
      console.error(`[SocialFeed] Instagram API ${res.status}`)
      return []
    }

    const json: InstagramResponse = await res.json()

    return json.data.map((m) => ({
      id: `ig-${m.id}`,
      source: 'instagram' as const,
      imageUrl:
        m.media_type === 'VIDEO'
          ? (m.thumbnail_url ?? m.media_url)
          : m.media_url,
      permalink: m.permalink,
      label: m.caption
        ? m.caption.split('\n')[0].substring(0, 60)
        : 'Instagram',
      date: m.timestamp,
    }))
  } catch (err) {
    console.error('[SocialFeed] Instagram fetch error:', err)
    return []
  }
}
