import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import Link from 'next/link'
import { getSite, getUi } from '@/content/site'
import { getArco, ARCO_START, getFeatured, getCases, caseMedia, toRow } from '@/content/cases'
import { localePath } from '@/i18n/config'
import { localeOf, type LangParams } from '@/i18n/server'
import { FEED_SELECTED, monthYear } from '@/content/feed'
import HoverIndex from '@/components/work/HoverIndex'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import HeadlineCycle from '@/components/home/HeadlineCycle'
import { headlineCycle } from '@/content/headline'
import Arco, { type ArcoItem } from '@/components/home/Arco'
import v from '@/components/blocks/v0.module.scss'
import h from '@/components/home/home.module.scss'
import f from '@/components/feed/feed.module.scss'
import WipLanding from '@/components/wip/WipLanding'
import { WIP } from '@/lib/wip'

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const { META } = getSite(l)
  return pageMeta({ locale: l, path: '/', title: META.home.title, description: META.home.description, absoluteTitle: true })
}

// Home v1.0 — Figma "Home · v1.0 · 1680" (6882:437): hero ("Hello" cycles,
// role as H1, disciplines, meta + paragraph), the Arco with 7 cases
// (Shoeciety centred) and a 5-row index, a 6-piece feed strip, the Lab
// teaser and the global close.
export default async function HomePage({ params }: Props) {
  const l = await localeOf(params)
  // Temporary landing while v1.0 is finished (lib/wip.ts).
  if (WIP) return <WipLanding locale={l} />
  const { HOME, EXPERIMENTS, LAB_FEATURED } = getSite(l)
  const ui = getUi(l)
  const CASES = getCases(l)
  const href = (p: string) => localePath(l, p)
  const arco: ArcoItem[] = getArco(l).map((p) => {
    const m = caseMedia(p.slug)
    const img = m.images[0]
    return { key: p.slug, href: href(`/work/${p.slug}`), title: CASES[p.slug].title, meta: `${p.discipline} · ${p.year}`, src: img.src, th: m.cover.src, w: img.w, h: img.h }
  })
  const rows = getFeatured(l).map((p) => toRow(l, p))
  const latest = FEED_SELECTED.map((it, i) => ({ it, n: String(i + 1).padStart(3, '0') }))
    .sort((a, b) => b.it.date.localeCompare(a.it.date))
    .slice(0, 6)
  const intro = HOME.intro.replace(HOME.signature, '').trim()

  return (
    <div className={v.page}>
      <header className={h.hero}>
        <h1 className={h.heroHead}>
          <HeadlineCycle
            lines={headlineCycle({ lang: l, a: `${HOME.greetings[0]}, ${HOME.nameLine}`, b: HOME.title })}
            aClass={h.name}
            bClass={h.title}
            sep=" — "
          />
        </h1>
        <p className={h.disciplines}>
          {HOME.disciplines.map((d, i) => (
            <span key={d}><span className={h.disc}>{d}{i < HOME.disciplines.length - 1 && <span className={h.dash}> —</span>}</span>{' '}</span>
          ))}
        </p>
        <div className={h.introRow}>
          <div className={h.meta}>{HOME.meta.map((x) => <p key={x}>{x}</p>)}</div>
          <p className={h.intro}>{intro} <span className={h.signature}>{HOME.signature}</span></p>
        </div>
      </header>

      <V0Section
        label={HOME.labels.featured}
        className={h.featured}
        aside={
          <span className={h.asideLinks}>
            <Link href={href('/work')} className={v.label}>{HOME.labels.allWork}</Link>
            <Link href={href('/work#archive')} className={v.label}>{HOME.labels.archive}</Link>
          </span>
        }
      />
      <Arco items={arco} start={ARCO_START} hint={HOME.arcoHint} label={ui.index.featured} aria={ui.arco.aria(ui.index.featured)} open={ui.arco.open} workHref={href('/work')} />
      <div className={h.indexWrap}>
        <HoverIndex rows={rows} label={ui.index.featured} />
      </div>

      <V0Section label={HOME.labels.feed} aside={<Link href={href('/feed')} className={v.label}>{HOME.labels.seeFeed}</Link>}>
        <ul className={h.strip}>
          {latest.map(({ it, n }) => (
            <li key={it.id}>
              <a href={it.url} target="_blank" rel="noopener noreferrer" className={`${f.link} ${h.stripLink}`}>
                <span className={`${f.media} ${h.stripMedia}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.src} alt="" width={it.w} height={it.h} className={f.img} loading="lazy" decoding="async" />
                </span>
                <span className={h.stripCap}>{n} · {it.title} · {monthYear(it.date)}<span className={v.srOnly}> {ui.newTab}</span></span>
              </a>
            </li>
          ))}
        </ul>
      </V0Section>

      <V0Section label={HOME.labels.lab} aside={<Link href={href('/lab')} className={v.label}>{HOME.labels.enterLab}</Link>}>
        <ul className={h.lab}>
          {EXPERIMENTS.map((e) => (
            <li key={e.slug}>
              <Link href={href(`/lab/${e.slug}`)} className={h.labCard}>
                <span className={h.labTop}>
                  <span className={h.labN}>{e.n}</span>
                  <span className={h.labMeta}>{e.kind} · {e.year}{e.slug === LAB_FEATURED.slug ? ui.home.featuredStar : ''}</span>
                </span>
                <span className={h.labName}>{e.name}</span>
                <span className={h.labWhat}>{HOME.labLines[e.slug]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </V0Section>

      <ContactBlock locale={l} />
    </div>
  )
}
