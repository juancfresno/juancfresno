import HomeContent from '@/components/home/HomeContent'
import {
  fetchInstagramFeed,
  fetchDribbbleFeed,
  mergeFeedItems,
} from '@/lib/feeds'

export default async function HomePage() {
  const [instagramItems, dribbbleItems] = await Promise.all([
    fetchInstagramFeed(12),
    fetchDribbbleFeed(12),
  ])

  const feedItems = mergeFeedItems(instagramItems, dribbbleItems)

  return <HomeContent feedItems={feedItems} />
}
