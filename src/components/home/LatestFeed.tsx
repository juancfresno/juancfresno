import { getLatestFeed } from '@/content/latest-feed'
import { getSite } from '@/content/site'
import type { Locale } from '@/i18n/config'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import LatestStrip from '@/components/feed-strip/LatestStrip'
import FeedRail from '@/components/feed-rail/FeedRail'
import FeedBlock from '@/components/feed-block/FeedBlock'
import s from './latestFeed.module.scss'

// "Latest from Instagram & Dribbble" band: rule, mono label, then the curved
// WebGL strip of the latest posts (feed-strip/LatestStrip; CSS marquee
// fallback). Home: between the hero and the contact module. Work: after the
// archive (Figma "dribble + instagram ?" 7146:22505, before CloseArchivo).
// Gallery 2 (feed-rail/FeedRail, `{ More from the feed ↘`) follows right
// under it with the same items; both move in hits and by drag, never by
// the page scroll. Gallery 3 (feed-block/FeedBlock, `{ More from the feed ↘
// · 03`, effect on the whole block) follows on the Home only (`block`),
// while Juan compares the three.
export default async function LatestFeed({ locale, block = false }: { locale: Locale; block?: boolean }) {
  const { LANDING } = getSite(locale)
  const items = await getLatestFeed()
  if (!items.length) return null
  return (
    <>
      <section className={s.band} aria-labelledby="latest-feed-label">
        <div className={s.head}>
          <ElasticLine className={s.rule} />
          <p id="latest-feed-label" className={s.label}>{LANDING.feedLabel}</p>
        </div>
        <LatestStrip items={items} ariaLabel={LANDING.feedAria} />
      </section>
      <FeedRail items={items} ariaLabel={LANDING.feedMoreAria} label={LANDING.feedMoreLabel} />
      {block && <FeedBlock items={items} ariaLabel={LANDING.feedBlockAria} label={LANDING.feedBlockLabel} />}
    </>
  )
}
