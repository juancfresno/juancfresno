import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { getSite, getUi } from '@/content/site'
import { getProjects, getCases, caseMedia, projectNumber, isPersonal, openKind } from '@/content/cases'
import { localeOf, type LangParams } from '@/i18n/server'
import type { WorkItem } from '@/components/work/archive/types'
import WorkArchive from '@/components/work/archive/WorkArchive'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import PageHero from '@/components/blocks/PageHero'
import SelectedGrid from '@/components/work/selected/SelectedGrid'
import LatestFeed from '@/components/home/LatestFeed'
import s from '@/components/work/archive/page.module.scss'

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const { META } = getSite(l)
  return pageMeta({ locale: l, path: '/work', title: META.work.title, description: META.work.description })
}

// Work — Figma "work" (AXxkCCuckrXGKDUCk8lNyQ · 6951:13221, read 14 Nov 2026),
// in the frame's order: 02 · Hero (letter, "/ Work", intro, note),
// web/projects-grid ("/ Selected projects", 7311:9611 → SelectedGrid),
// 03 · Archive (6951:13618): the 28 cases in the Figma order (ALL_PROJECTS),
// "Feed block · Home" (7273:4642, the Home gallery) and the footer in its
// subtle theme (data-foot). No close block and no Lab band any more.
// Rows don't navigate to /work/[slug]: they open the case in the drawer
// (CaseDrawer).
export default async function WorkPage({ params }: Props) {
  const l = await localeOf(params)
  const { INTROS, HEROES, LANDING } = getSite(l)
  const ui = getUi(l)
  const cases = getCases(l)

  const projects = getProjects(l).filter((p) => cases[p.slug] && caseMedia(p.slug))
  const dupes = new Set(projects.map((p) => p.name).filter((n, i, a) => a.indexOf(n) !== i))
  const items: WorkItem[] = projects.map((p) => {
    const c = cases[p.slug]
    const m = caseMedia(p.slug)
    const kind = c.meta.split(' · ').slice(1).join(' · ')
    return {
      slug: p.slug,
      n: projectNumber(p.slug),
      name: p.listName ?? (dupes.has(p.name) ? `${p.name} · ${kind}` : p.name),
      title: c.title,
      kind,
      via: p.listVia ?? c.ficha.via ?? (isPersonal(p.slug) ? c.ficha.client : ui.work.direct),
      category: p.discipline,
      role: c.ficha.role ?? '—',
      year: c.ficha.year,
      client: c.ficha.client,
      studio: c.ficha.via,
      chips: c.chips,
      lead: c.lead,
      question: c.question,
      cover: m.cover,
      images: m.images,
      open: openKind(p, m.images.length),
    }
  })

  return (
    <div className={s.page} data-work-page data-foot="subtle">
      <PageHero letter={HEROES.work.letter} name={ui.work.h1} intro={HEROES.work.intro} note={HEROES.work.note} />

      <SelectedGrid />

      <section id="archive" className={s.archive} aria-labelledby="archive-label">
        <ElasticLine className={s.rule} />
        <p id="archive-label" className={s.label}>{ui.archive.label}</p>
        <p className={s.archiveIntro}>{INTROS.archive}</p>
        <WorkArchive items={items} />
      </section>

      <div data-flip-after>
        <LatestFeed locale={l} show={['block']} labels={{ block: LANDING.feedLabel }} />
      </div>
    </div>
  )
}
