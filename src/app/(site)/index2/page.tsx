import type { Metadata } from 'next'
import HomeContent from '@/components/home/HomeContent'
import {
  fetchInstagramFeed,
  fetchDribbbleFeed,
  mergeFeedItems,
} from '@/lib/feeds'

// Superseded by "/" — kept reachable but excluded from indexing/sitemap to avoid
// duplicate-content competition with the new homepage.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function HomePage() {
  const [instagramItems, dribbbleItems] = await Promise.all([
    fetchInstagramFeed(12),
    fetchDribbbleFeed(12),
  ])

  const feedItems = mergeFeedItems(instagramItems, dribbbleItems)

  return <HomeContent feedItems={feedItems} />
}
