import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import Image from 'next/image'
import { getSite, getUi } from '@/content/site'
import { localeOf, type LangParams } from '@/i18n/server'
import { FEED_SELECTED, groupFeed, groupRange, monthYear } from '@/content/feed'
import PageHero from '@/components/blocks/PageHero'
import CloseArchivo from '@/components/blocks/CloseArchivo'
import v from '@/components/blocks/v0.module.scss'
import hs from '@/components/blocks/pageHero.module.scss'
import f from '@/components/feed/feed.module.scss'
import FeedViews from '@/components/feed/FeedViews'
import { FEED_VIEW_SCRIPT } from '@/components/feed/feedView'

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const { META } = getSite(l)
  return pageMeta({ locale: l, path: '/feed', title: META.feed.title, description: META.feed.description })
}

// Two views (components/feed/FeedViews): Canvas, an infinite WebGL plane
// (default on desktop), and Rejilla, the static accessible grid below — Figma
// "Feed · Desktop" (6770:9789): sessions of consecutive pieces of the same
// project, newest first; masonry in 3 / 2 / 1 columns; title and month inside
// each image; monochrome dither at rest, colour on hover or focus. The grid is
// always server-rendered; the inline script picks the view before paint.
export default async function FeedPage({ params }: Props) {
  const l = await localeOf(params)
  const { HEROES } = getSite(l)
  const ui = getUi(l)
  // Only the curated selection (content/feed-selection.ts); the grid by date.
  const groups = groupFeed([...FEED_SELECTED].sort((a, b) => b.date.localeCompare(a.date)), ui.feed)
  let n = 0

  return (
    <div className={hs.shell}>
      <script dangerouslySetInnerHTML={{ __html: FEED_VIEW_SCRIPT }} />
      <PageHero letter={HEROES.feed.letter} name={ui.feed.h1} intro={HEROES.feed.intro} note={HEROES.feed.note} />
      <FeedViews items={FEED_SELECTED}>
      <div className={f.feed}>
        {groups.map((g) => (
          <section key={g.key} className={f.group} aria-label={`${g.label} · ${groupRange(g)}`}>
            <header className={f.head}>
              <p className={f.headLabel}>{g.label}</p>
              <p className={f.headMeta}>
                {g.items.length} {g.items.length === 1 ? ui.feed.piece : ui.feed.pieces} · {groupRange(g)}
              </p>
            </header>
            <ul className={f.masonry}>
              {g.items.map((it) => {
                const first = n === 0 // LCP on mobile (grid is the default there)
                const eager = n++ < 6
                return (
                  <li key={it.id} className={f.item}>
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className={f.link}>
                      <span className={f.media}>
                        <Image
                          src={it.src}
                          width={it.w}
                          height={it.h}
                          alt=""
                          className={f.img}
                          loading={eager ? 'eager' : 'lazy'}
                          fetchPriority={first ? 'high' : undefined}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized
                        />
                      </span>
                      {/* Visible tags are the link's name (flex: the spaces don't render). */}
                      <span className={f.tags}>
                        <span className={f.tag}>{it.title}</span>{' '}
                        <span className={`${f.tag} ${f.tagDate}`}>{monthYear(it.date)}</span>
                        <span className={v.srOnly}> {ui.feed.opens(it.source === 'instagram' ? 'Instagram' : 'Dribbble')}</span>
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        <p className={v.mono}>{ui.feed.total(FEED_SELECTED.length)}</p>
      </div>
      </FeedViews>
      <CloseArchivo locale={l} />
    </div>
  )
}
