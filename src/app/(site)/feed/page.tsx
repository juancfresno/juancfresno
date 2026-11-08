import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import Image from 'next/image'
import { INTROS, META } from '@/content/site'
import { FEED_SELECTED, groupFeed, groupRange, monthYear } from '@/content/feed'
import ContactBlock from '@/components/blocks/ContactBlock'
import v from '@/components/blocks/v0.module.scss'
import f from '@/components/feed/feed.module.scss'
import FeedViews from '@/components/feed/FeedViews'
import { FEED_VIEW_SCRIPT } from '@/components/feed/feedView'

export const metadata: Metadata = pageMeta({ path: '/feed', title: META.feed.title, description: META.feed.description })

// Two views (components/feed/FeedViews): Canvas, an infinite WebGL plane
// (default on desktop), and Rejilla, the static accessible grid below — Figma
// "Feed · Desktop" (6770:9789): sessions of consecutive pieces of the same
// project, newest first; masonry in 3 / 2 / 1 columns; title and month inside
// each image; monochrome dither at rest, colour on hover or focus. The grid is
// always server-rendered; the inline script picks the view before paint.
export default function FeedPage() {
  // Only the curated selection (content/feed-selection.ts); the grid by date.
  const groups = groupFeed([...FEED_SELECTED].sort((a, b) => b.date.localeCompare(a.date)))
  let n = 0

  return (
    <div className={v.page}>
      <script dangerouslySetInnerHTML={{ __html: FEED_VIEW_SCRIPT }} />
      <h1 className={v.srOnly}>Feed</h1>
      <FeedViews items={FEED_SELECTED} intro={INTROS.feed}>
      <div className={f.feed}>
        {groups.map((g) => (
          <section key={g.key} className={f.group} aria-label={`${g.label} · ${groupRange(g)}`}>
            <header className={f.head}>
              <p className={f.headLabel}>{g.label}</p>
              <p className={f.headMeta}>
                {g.items.length} {g.items.length === 1 ? 'piece' : 'pieces'} · {groupRange(g)}
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
                        <span className={v.srOnly}> (opens {it.source === 'instagram' ? 'Instagram' : 'Dribbble'} in a new tab)</span>
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        <p className={v.mono}>{FEED_SELECTED.length} pieces · Dribbble and Instagram</p>
      </div>

      <ContactBlock />
      </FeedViews>
    </div>
  )
}
