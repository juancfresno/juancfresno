import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { getSite } from '@/content/site'
import { localeOf, type LangParams } from '@/i18n/server'
import { headlineCycle } from '@/content/headline'
import HeadlineCycle from '@/components/home/HeadlineCycle'
import LatestFeed from '@/components/home/LatestFeed'
import HomeContact from '@/components/home/HomeContact'
import FloppyBand from '@/components/floppy/FloppyBand'
import FeaturedProjects from '@/components/home/featured/FeaturedProjects'
import { FEATURED_PREVIEW } from '@/content/featured-preview'
import Grain from '@/components/wip/Grain'
import Intro from '@/components/wip/Intro'
import type { CSSProperties } from 'react'
import w from '@/components/wip/wip.module.scss'

export const revalidate = 21600

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const { META } = getSite(l)
  return pageMeta({ locale: l, path: '/', title: META.home.title, description: META.home.description, absoluteTitle: true })
}

const d = (ms: number) => ({ '--in-d': `${ms}ms` }) as CSSProperties

// Home v1 — Figma "home" (6949:12453): the landing hero (greeting that decodes
// through other languages, fixed role, mono disciplines, two-line intro) over
// the page background (no feed lens since 13 Nov), then the featured
// projects module (FeaturedProjects), the Lab floppy module, the feed block (gallery 3; the
// other two moved to Lab 006 Carruseles), the contact module and the footer. Entrance =
// wireframe grid (Intro) → page ([data-in] delays). The earlier home (Arco,
// index, strip, Lab teaser) stays in the codebase, not rendered.
export default async function HomePage({ params }: Props) {
  const l = await localeOf(params)
  const { LANDING } = getSite(l)

  return (
    <>
      <Intro />
      <Grain />
      <section className={w.hero}>
        <header className={w.copy}>
          <h1 className={w.head}>
            <HeadlineCycle lines={headlineCycle({ lang: l, a: LANDING.line1 })} className={w.name} />
            {' '}
            <span className={`${w.mask} ${w.titleMask}`} data-wire="" data-wire-text="">
              <span className={w.title} data-in="mask" style={d(280)}>{LANDING.title}</span>
            </span>
          </h1>
          <p className={`${w.disciplines} ${w.mask}`} data-wire="" data-wire-text="">
            <span data-in="mask" style={d(220)}>{LANDING.disciplines}</span>
          </p>
          <p className={w.intro}>
            <span className={w.mask} data-wire="" data-wire-text=""><span data-in="mask" style={d(280)}>{LANDING.intro[0]}</span></span>
            <span className={w.mask} data-wire="" data-wire-text=""><span data-in="mask" style={d(340)}>{LANDING.intro[1]}</span></span>
          </p>
        </header>
      </section>
      {/* Featured projects (Figma 04 · Archivo 7173:7118): preview pieces, not linked to cases yet. */}
      <FeaturedProjects pieces={FEATURED_PREVIEW} label={LANDING.featuredLabel} />
      <LatestFeed locale={l} show={['block']} labels={{ block: LANDING.feedLabel }} beforeBlock={<FloppyBand locale={l} mode="scroll" only={['002', '003', '005']} />} />
      <HomeContact locale={l} />
    </>
  )
}
