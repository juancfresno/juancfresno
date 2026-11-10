import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { getSite, getUi } from '@/content/site'
import { getProjects, getCases, caseMedia, projectNumber, isPersonal, openKind } from '@/content/cases'
import { localeOf, type LangParams } from '@/i18n/server'
import type { WorkItem } from '@/components/work/archive/types'
import WorkArchive from '@/components/work/archive/WorkArchive'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import ContactBlock from '@/components/blocks/ContactBlock'
import s from '@/components/work/archive/page.module.scss'

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const { META } = getSite(l)
  return pageMeta({ locale: l, path: '/work', title: META.work.title, description: META.work.description })
}

// Work — Figma "work" (AXxkCCuckrXGKDUCk8lNyQ · 6951:13221, 10 Nov 2026):
// hero with the page name on the right + intro, an empty reserved band for the
// future featured gallery (537 px at 1680), then the list of the 30 cases
// (03 · Archive, 6951:13618) in ALL_PROJECTS order. Rows don't navigate to
// /work/[slug]: they open the project in place (?open=drawer|expand|stage).
export default async function WorkPage({ params }: Props) {
  const l = await localeOf(params)
  const { INTROS } = getSite(l)
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
      name: dupes.has(p.name) ? `${p.name} · ${kind}` : p.name,
      title: c.title,
      kind,
      via: c.ficha.via ?? (isPersonal(p.slug) ? c.ficha.client : ui.work.direct),
      category: p.discipline,
      role: c.ficha.role ?? '—',
      year: c.ficha.year,
      client: c.ficha.client,
      studio: c.ficha.via,
      chips: c.chips,
      lead: c.lead,
      cover: m.cover,
      images: m.images,
      open: openKind(p, m.images.length),
    }
  })

  const [first, ...rest] = INTROS.workHero.split('\n')

  return (
    <div className={s.page} data-work-page>
      <header className={s.hero}>
        <h1 className={s.name}>/{ui.work.h1}</h1>
        <p className={s.intro}>
          {first}
          {rest.length > 0 && <><br />{rest.join(' ')}</>}
        </p>
      </header>

      {/* Reserved for the featured gallery (Juan designs it later): exact
          Figma height, nothing inside but four crop marks. */}
      <div className={s.gallery} aria-hidden="true">
        <span /><span /><span /><span />
      </div>

      <section id="archive" className={s.archive} aria-labelledby="archive-label">
        <ElasticLine className={s.rule} />
        <p id="archive-label" className={s.label}>{ui.archive.label}</p>
        <p className={s.archiveIntro}>{INTROS.archive}</p>
        <WorkArchive items={items} />
      </section>

      <div data-flip-after>
        <ContactBlock locale={l} />
      </div>
    </div>
  )
}
