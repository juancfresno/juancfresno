import { FEED, type FeedItem } from './feed'

// Latest posts for the Home marquee: static FEED (Instagram + Dribbble, already
// de-duplicated at import) merged with live Dribbble shots when
// DRIBBBLE_ACCESS_TOKEN works. Any failure falls back silently to static data.
// The token stays on the server and is never logged.

export type LatestItem = {
  id: string
  title: string
  url: string
  source: 'instagram' | 'dribbble'
  date: string
  src: string
  w: number
  h: number
}

const COUNT = 16
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const shotId = (url: string) => url.match(/shots\/(\d+)/)?.[1] ?? ''

type Shot = {
  id: number
  title: string
  html_url: string
  published_at: string
  width?: number
  height?: number
  images?: { hidpi?: string | null; normal?: string; teaser?: string }
}

async function liveDribbble(): Promise<LatestItem[]> {
  const token = process.env.DRIBBBLE_ACCESS_TOKEN
  if (!token) return []
  try {
    const res = await fetch('https://api.dribbble.com/v2/user/shots?per_page=12', {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const shots = (await res.json()) as Shot[]
    if (!Array.isArray(shots)) return []
    return shots.flatMap((s) => {
      const src = s.images?.normal ?? s.images?.teaser
      if (!src || !s.html_url || !s.published_at) return []
      return [{
        id: `live-${s.id}`,
        title: s.title,
        url: s.html_url,
        source: 'dribbble' as const,
        date: s.published_at.slice(0, 10),
        src,
        w: 4,
        h: 3,
      }]
    })
  } catch {
    return []
  }
}

export async function getLatestFeed(): Promise<LatestItem[]> {
  const live = await liveDribbble()
  const all: LatestItem[] = [...(FEED as FeedItem[]), ...live]
  all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.source === 'instagram' ? -1 : 1))
  const seenTitle = new Set<string>()
  const seenShot = new Set<string>()
  const out: LatestItem[] = []
  // Static entries come first on ties so their local thumbs win over live ones.
  for (const it of all) {
    const sid = it.source === 'dribbble' ? shotId(it.url) : ''
    const nt = norm(it.title)
    if ((sid && seenShot.has(sid)) || (nt && seenTitle.has(nt))) continue
    if (sid) seenShot.add(sid)
    if (nt) seenTitle.add(nt)
    out.push(it)
    if (out.length === COUNT) break
  }
  return out
}
