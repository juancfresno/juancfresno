import { getLatestFeed } from '@/content/latest-feed'
import { getSite } from '@/content/site'
import type { Locale } from '@/i18n/config'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import LatestMarquee from './LatestMarquee'
import s from './latestFeed.module.scss'

// Home band between the hero and the contact module (Figma placeholder
// "Social Media Feed"): rule, mono label, then the marquee of the latest posts.
export default async function LatestFeed({ locale }: { locale: Locale }) {
  const { LANDING } = getSite(locale)
  const items = await getLatestFeed()
  if (!items.length) return null
  return (
    <section className={s.band} aria-labelledby="home-feed-label">
      <div className={s.head}>
        <ElasticLine className={s.rule} />
        <p id="home-feed-label" className={s.label}>{LANDING.feedLabel}</p>
      </div>
      <LatestMarquee items={items} ariaLabel={LANDING.feedAria} />
    </section>
  )
}
