// ─── Normalized feed item (used by SocialFeed component) ─────────────────────

export interface FeedItem {
  id: string
  source: 'instagram' | 'dribbble'
  imageUrl: string
  permalink: string
  label: string
  date: string // ISO 8601
}

// ─── Instagram Graph API response ────────────────────────────────────────────

export interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
}

export interface InstagramResponse {
  data: InstagramMedia[]
}

// ─── Dribbble API v2 response ────────────────────────────────────────────────

export interface DribbbleShot {
  id: number
  title: string
  description: string | null
  images: {
    hidpi: string | null
    normal: string
    teaser: string
  }
  html_url: string
  published_at: string
}
