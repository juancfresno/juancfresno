import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { INTROS, META } from '@/content/site'
import { PROJECTS, ARCHIVE, toRow } from '@/content/cases'
import WorkViews from '@/components/work/WorkViews'
import ArchiveTable from '@/components/work/ArchiveTable'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import v from '@/components/blocks/v0.module.scss'
import w from '@/components/work/work.module.scss'

export const metadata: Metadata = pageMeta({ path: '/work', title: META.work.title, description: META.work.description })

// Work v1.0 — Figma "Work · v1.0 · 1680" (6884:611): giant "Work" + intro,
// View: List / Covers, the index renumbered 01–13 (NDA rows hidden,
// SHOW_NDA in cases.ts), then the archive from the invoices.
export default function WorkPage() {
  const rows = PROJECTS.map(toRow)

  return (
    <div className={v.page}>
      <header className={w.header}>
        <h1 className={w.h1}>Work</h1>
        <p className={w.intro}>{INTROS.work}</p>
      </header>

      <section className={w.indexMod} aria-label="Selected work">
        <WorkViews rows={rows} />
      </section>

      <V0Section id="archive" label="{ Archive 2016—2026 ↘">
        <div className={w.archiveHead}><p className={w.archiveIntro}>{INTROS.archive}</p></div>
        <ArchiveTable rows={ARCHIVE} />
      </V0Section>

      <ContactBlock />
    </div>
  )
}
