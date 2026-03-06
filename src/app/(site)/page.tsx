import s from './page.module.scss'
import HeroIntro from '@/components/home/HeroIntro/HeroIntro'
import HeroCategories from '@/components/home/HeroCategories/HeroCategories'
import SocialFeed from '@/components/home/SocialFeed/SocialFeed'
import {
  fetchInstagramFeed,
  fetchDribbbleFeed,
  mergeFeedItems,
} from '@/lib/feeds'

export default async function HomePage() {
  // Fetch both feeds in parallel — each uses 12 h ISR revalidation
  const [instagramItems, dribbbleItems] = await Promise.all([
    fetchInstagramFeed(12),
    fetchDribbbleFeed(12),
  ])

  const feedItems = mergeFeedItems(instagramItems, dribbbleItems)

  return (
    <div className={s.homePage}>
      <HeroIntro />
      <HeroCategories />
      <SocialFeed items={feedItems} />
    </div>
  )
}
