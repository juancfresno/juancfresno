import type { Metadata } from 'next'
import { INTROS } from '@/content/site'
import { PROJECTS, ARCHIVE, toRow } from '@/content/cases'
import WorkViews from '@/components/work/WorkViews'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import v from '@/components/blocks/v0.module.scss'
import w from '@/components/work/work.module.scss'

export const metadata: Metadata = { title: 'Work' }

// Figma: "Work · v0" (6770:9563). Intro line, index with floating preview and
// NDA rows, Lista / Portadas toggle, then the archive anchor (#archivo).
export default function WorkPage() {
  const rows = PROJECTS.map(toRow)

  return (
    <div className={v.page}>
      <p className={v.intro}>{INTROS.work}</p>

      <V0Section label={`{ Trabajo · ${String(PROJECTS.length).padStart(2, '0')} ↘`}>
        <WorkViews rows={rows} />
      </V0Section>

      <V0Section id="archivo" label="{ Archivo 2012–2026 ↘">
        <ul className={w.archive}>
          {ARCHIVE.map((a) => (
            <li key={a.name}>
              <span>{a.name}</span>
              <span className={v.mono}>{a.discipline} · {a.year ?? <Pending>año</Pending>}</span>
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
