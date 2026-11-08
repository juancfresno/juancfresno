import type { Metadata } from 'next'
import { INTROS, META } from '@/content/site'
import { PROJECTS, ARCHIVE, toRow } from '@/content/cases'
import WorkViews from '@/components/work/WorkViews'
import ArchiveTable from '@/components/work/ArchiveTable'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import v from '@/components/blocks/v0.module.scss'
import w from '@/components/work/work.module.scss'

export const metadata: Metadata = {
  title: META.work.title,
  description: META.work.description,
  alternates: { canonical: '/work' },
}

// Work v1.0: discreet intro, the case index (NDA rows hidden, SHOW_NDA in
// cases.ts) with the List / Covers toggle, then the archive from the invoices.
export default function WorkPage() {
  const rows = PROJECTS.map(toRow)

  return (
    <div className={v.page}>
      <h1 className={v.srOnly}>Work</h1>
      <p className={v.intro}>{INTROS.work}</p>

      <V0Section label={`{ Work · ${String(PROJECTS.length).padStart(2, '0')} ↘`}>
        <WorkViews rows={rows} />
      </V0Section>

      <V0Section id="archive" label="{ Archive 2016—2026 ↘">
        <p className={w.archiveIntro}>{INTROS.archive}</p>
        <ArchiveTable rows={ARCHIVE} />
      </V0Section>

      <ContactBlock />
    </div>
  )
}
