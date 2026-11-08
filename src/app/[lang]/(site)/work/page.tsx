import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { getSite, getUi } from '@/content/site'
import { getProjects, getArchive, toRow } from '@/content/cases'
import { localeOf, type LangParams } from '@/i18n/server'
import WorkViews from '@/components/work/WorkViews'
import ArchiveTable from '@/components/work/ArchiveTable'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import v from '@/components/blocks/v0.module.scss'
import w from '@/components/work/work.module.scss'

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const { META } = getSite(l)
  return pageMeta({ locale: l, path: '/work', title: META.work.title, description: META.work.description })
}

// Work v1.0 — Figma "Work · v1.0 · 1680" (6884:611): giant "Work" + intro,
// View: List / Covers, the index renumbered 01–13 (NDA rows hidden,
// SHOW_NDA in cases.ts), then the archive from the invoices.
export default async function WorkPage({ params }: Props) {
  const l = await localeOf(params)
  const { INTROS } = getSite(l)
  const ui = getUi(l)
  const rows = getProjects(l).map((p) => toRow(l, p))

  return (
    <div className={v.page}>
      <header className={w.header}>
        <h1 className={w.h1}>{ui.work.h1}</h1>
        <p className={w.intro}>{INTROS.work}</p>
      </header>

      <section className={w.indexMod} aria-label={ui.work.selected}>
        <WorkViews rows={rows} />
      </section>

      <V0Section id="archive" label={ui.archive.label}>
        <div className={w.archiveHead}><p className={w.archiveIntro}>{INTROS.archive}</p></div>
        <ArchiveTable rows={getArchive(l)} />
      </V0Section>

      <ContactBlock locale={l} />
    </div>
  )
}
