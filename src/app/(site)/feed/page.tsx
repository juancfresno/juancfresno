import type { Metadata } from 'next'
import Image from 'next/image'
import { INTROS } from '@/content/site'
import { FEED, groupFeed, groupRange, monthYear } from '@/content/feed'
import ContactBlock from '@/components/blocks/ContactBlock'
import v from '@/components/blocks/v0.module.scss'
import f from '@/components/feed/feed.module.scss'

export const metadata: Metadata = { title: 'Feed' }

// Figma: "Feed · Desktop" (6770:9789). Sessions of consecutive pieces of the
// same project, newest first; masonry in 3 / 2 / 1 columns; title and month
// inside each image; monochrome dither at rest, colour on hover or focus.
export default function FeedPage() {
  const groups = groupFeed()
  let n = 0

  return (
    <div className={v.page}>
      <p className={v.intro}>{INTROS.feed}</p>

      <div className={f.feed}>
        {groups.map((g) => (
          <section key={g.key} className={f.group} aria-label={g.label}>
            <header className={f.head}>
              <p className={f.headLabel}>{g.label}</p>
              <p className={f.headMeta}>
                {g.items.length} {g.items.length === 1 ? 'pieza' : 'piezas'} · {groupRange(g)}
              </p>
            </header>
            <ul className={f.masonry}>
              {g.items.map((it) => {
                const eager = n++ < 6
                return (
                  <li key={it.id} className={f.item}>
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className={f.link} aria-label={`${it.title} · ${monthYear(it.date)} · abre ${it.source === 'instagram' ? 'Instagram' : 'Dribbble'}`}>
                      <span className={f.media}>
                        <Image
                          src={it.src}
                          width={it.w}
                          height={it.h}
                          alt=""
                          className={f.img}
                          loading={eager ? 'eager' : 'lazy'}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized
                        />
                      </span>
                      <span className={f.tags} aria-hidden="true">
                        <span className={f.tag}>{it.title}</span>
                        <span className={`${f.tag} ${f.tagDate}`}>{monthYear(it.date)}</span>
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        <p className={v.mono}>{FEED.length} piezas · Dribbble e Instagram</p>
      </div>

      <div className={v.closing}>
        <ContactBlock />
      </div>
    </div>
  )
}
