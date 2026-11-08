import type { Metadata } from 'next'
import Link from 'next/link'
import { HOME, META, EXPERIMENTS } from '@/content/site'
import { FEATURED, CASES, caseMedia, toRow } from '@/content/cases'
import { FEED, monthYear } from '@/content/feed'
import HoverIndex from '@/components/work/HoverIndex'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import HelloCycle from '@/components/home/HelloCycle'
import Arco, { type ArcoItem } from '@/components/home/Arco'
import v from '@/components/blocks/v0.module.scss'
import h from '@/components/home/home.module.scss'
import f from '@/components/feed/feed.module.scss'

export const metadata: Metadata = {
  title: { absolute: META.home.title },
  description: META.home.description,
  alternates: { canonical: '/' },
}

// Home v1.0: hero ("Hello" cycles), featured cases on the Arco drum and as a
// short index, the latest feed pieces, the Lab teaser and the global close.
// No numbers here (they live in About → Experience).
export default function HomePage() {
  const arco: ArcoItem[] = FEATURED.map((p) => {
    const m = caseMedia(p.slug)
    const img = m.images[0]
    return { key: p.slug, href: `/work/${p.slug}`, title: CASES[p.slug].title, meta: `${p.discipline} · ${p.year}`, src: img.src, th: m.cover.src, w: img.w, h: img.h }
  })
  const rows = FEATURED.map(toRow)
  const latest = FEED.slice(0, 7)

  return (
    <div className={v.page}>
      <header className={h.hero}>
        <h1 className={h.heroHead}>
          <span className={h.name}>
            <HelloCycle /> {HOME.nameLine}
          </span>
          <span className={h.srOnly}> — </span>
          <span className={h.title}>{HOME.title}</span>
        </h1>
        <p className={h.disciplines}>
          {HOME.disciplines.map((d, i) => (
            <span key={d}><span className={h.disc}>{d}{i < HOME.disciplines.length - 1 && <span className={h.dash}> —</span>}</span>{' '}</span>
          ))}
        </p>
        <p className={h.intro}>{HOME.intro}</p>
      </header>

      <V0Section
        label={HOME.labels.featured}
        className={h.featured}
        aside={
          <span className={h.asideLinks}>
            <Link href="/work" className={v.label}>{HOME.labels.allWork}</Link>
            <Link href="/work#archive" className={v.label}>{HOME.labels.archive}</Link>
          </span>
        }
      />
      <Arco items={arco} />
      <div className={h.indexWrap}>
        <HoverIndex rows={rows} label="Featured work" numbers={false} />
      </div>

      <V0Section label={HOME.labels.feed} className={h.feedSection} aside={<Link href="/feed" className={v.label}>{HOME.labels.seeFeed}</Link>}>
        <ul className={h.strip}>
          {latest.map((it) => (
            <li key={it.id}>
              <a href={it.url} target="_blank" rel="noopener noreferrer" className={`${f.link} ${h.stripLink}`} aria-label={`${it.title} · ${monthYear(it.date)} (opens in a new tab)`}>
                <span className={`${f.media} ${h.stripMedia}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.src} alt="" width={it.w} height={it.h} className={f.img} loading="lazy" decoding="async" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </V0Section>

      <V0Section label={HOME.labels.lab} aside={<Link href="/lab" className={v.label}>{HOME.labels.enterLab}</Link>}>
        <ul className={h.lab}>
          {EXPERIMENTS.map((e) => (
            <li key={e.slug}>
              <Link href={`/lab/${e.slug}`} className={h.labRow}>
                <span className={h.labName}>{e.name}</span>
                <span className={h.labWhat}>{e.built}</span>
                <span className={v.mono}>{e.kind} · {e.year}</span>
              </Link>
            </li>
          ))}
        </ul>
      </V0Section>

      <ContactBlock />
    </div>
  )
}
