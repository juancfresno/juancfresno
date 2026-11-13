import { getLatestFeed } from '@/content/latest-feed'
import { getSite } from '@/content/site'
import type { Locale } from '@/i18n/config'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import LatestStrip from '@/components/feed-strip/LatestStrip'
import FeedRail from '@/components/feed-rail/FeedRail'
import FeedBlock from '@/components/feed-block/FeedBlock'
import s from './latestFeed.module.scss'

export type FeedGallery = 'strip' | 'rail' | 'block'

// The latest Instagram + Dribbble posts, in up to three galleries (all drag
// and eased "hits", never the page scroll):
//   strip · gallery 1, the curved WebGL drum (feed-strip/LatestStrip; CSS
//           marquee fallback), under a rule + mono label;
//   rail  · gallery 2 (feed-rail/FeedRail), fisheye per card;
//   block · gallery 3 (feed-block/FeedBlock), the effect on the whole block.
// Home: only the block, labelled "Latest from Instagram & Dribbble" (13 Nov
// 2026). Work: strip + rail (default). Lab 006 Carruseles: all three,
// numbered. `beforeBlock` is a slot right above the block (the Home puts the
// Lab floppy module there).
export default async function LatestFeed({
  locale,
  show = ['strip', 'rail'],
  labels = {},
  beforeBlock = null,
}: {
  locale: Locale
  show?: FeedGallery[]
  labels?: Partial<Record<FeedGallery, string>>
  beforeBlock?: React.ReactNode
}) {
  const { LANDING } = getSite(locale)
  const items = await getLatestFeed()
  if (!items.length) return beforeBlock
  return (
    <>
      {show.includes('strip') && (
        <section className={s.band} aria-labelledby="latest-feed-label">
          <div className={s.head}>
            <ElasticLine className={s.rule} />
            <p id="latest-feed-label" className={s.label}>{labels.strip ?? LANDING.feedLabel}</p>
          </div>
          <LatestStrip items={items} ariaLabel={LANDING.feedAria} />
        </section>
      )}
      {show.includes('rail') && <FeedRail items={items} ariaLabel={LANDING.feedMoreAria} label={labels.rail ?? LANDING.feedMoreLabel} />}
      {beforeBlock}
      {show.includes('block') && <FeedBlock items={items} ariaLabel={LANDING.feedBlockAria} label={labels.block ?? LANDING.feedBlockLabel} />}
    </>
  )
}
