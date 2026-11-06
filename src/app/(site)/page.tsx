import Link from 'next/link'
import { HOME, EXPERIMENTS } from '@/content/site'
import { PROJECTS, toRow } from '@/content/cases'
import { FEED, monthYear } from '@/content/feed'
import HoverIndex from '@/components/work/HoverIndex'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import v from '@/components/blocks/v0.module.scss'
import h from '@/components/home/home.module.scss'
import f from '@/components/feed/feed.module.scss'

// Figma: "Home · v0" (6770:9448). Hero, featured cases as an index with the
// floating preview, links to Work and the archive, the latest feed pieces,
// Lab and contact.
export default function HomePage() {
  const featured = PROJECTS.filter((p) => p.featured).map(toRow)
  const latest = FEED.slice(0, 7)

  return (
    <div className={v.page}>
      <header className={h.hero}>
        <div className={h.heroHead}>
          <p className={h.name}>{HOME.name}</p>
          <h1 className={h.title}>{HOME.title}</h1>
          <p className={h.disciplines}>{HOME.disciplines}</p>
        </div>
        <p className={h.intro}>{HOME.intro}</p>
        <ul className={h.figures}>
          {HOME.figures.map((x) => (
            <li key={x.label}><span>{x.label}</span> <span>{x.value}</span></li>
          ))}
        </ul>
      </header>

      <V0Section label="{ Casos destacados ↘">
        <HoverIndex rows={featured} label="Casos destacados" />
        <div className={v.links}>
          <Link href="/work" className={v.label}>Todo el trabajo ↘</Link>
          <Link href="/work#archivo" className={v.label}>Archivo 2010–2026 ↘</Link>
        </div>
      </V0Section>

      <V0Section label="{ feed ↘" href="/feed" className={h.feedSection}>
        <ul className={h.strip}>
          {latest.map((it) => (
            <li key={it.id}>
              <a href={it.url} target="_blank" rel="noopener noreferrer" className={`${f.link} ${h.stripLink}`} aria-label={`${it.title} · ${monthYear(it.date)}`}>
                <span className={`${f.media} ${h.stripMedia}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.src} alt="" width={it.w} height={it.h} className={f.img} decoding="async" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </V0Section>

      <V0Section label="{ Lab ↘" href="/lab">
        <ul className={h.lab}>
          {EXPERIMENTS.map((e) => (
            <li key={e.slug}>
              <Link href={`/lab/${e.slug}`} className={h.labRow}>
                <span className={v.mono}>{e.n}</span>
                <span className={h.labName}>{e.name}</span>
                <span className={v.mono}>{e.kind} · {e.year}</span>
              </Link>
            </li>
          ))}
        </ul>
      </V0Section>

      <div className={v.closing}>
        <ContactBlock />
      </div>
    </div>
  )
}
