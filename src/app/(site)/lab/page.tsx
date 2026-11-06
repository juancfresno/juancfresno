import type { Metadata } from 'next'
import Link from 'next/link'
import { LAB, EXPERIMENTS, INTROS } from '@/content/site'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import v from '@/components/blocks/v0.module.scss'
import l from '@/components/lab/lab.module.scss'

export const metadata: Metadata = { title: 'Lab' }

// Figma: "Lab · Desktop" (6770:10097). Intro, numbered experiments with mono
// specs, own products with status, and the open-source line.
export default function LabPage() {
  return (
    <div className={v.page}>
      <p className={v.intro}>{INTROS.lab}</p>

      <V0Section label="Experimentos ↘">
        <ol className={l.rows}>
          {EXPERIMENTS.map((e) => (
            <li key={e.slug}>
              <Link href={`/lab/${e.slug}`} className={l.row}>
                <span className={l.n}>{e.n}</span>
                <span className={l.rowName}>{e.name}</span>
                <span className={l.spec}>{e.kind}</span>
                <span className={l.spec}>{e.files.length} archivos · sin dependencias</span>
                <span className={`${l.spec} ${l.end}`}>{e.year}</span>
              </Link>
            </li>
          ))}
        </ol>
      </V0Section>

      <V0Section label="Productos propios ↘">
        <ol className={l.rows}>
          {LAB.map((x, i) => (
            <li key={x.name}>
              <div className={l.row}>
                <span className={l.n}>{String(i + 1).padStart(2, '0')}</span>
                <span className={l.rowName}>{x.name}</span>
                <span className={l.spec}>{x.what ?? <Pending>qué hace</Pending>}</span>
                <span className={l.spec}>{x.status ?? <Pending>estado</Pending>}</span>
                <span className={`${l.spec} ${l.end}`}>{x.year ?? '—'}</span>
              </div>
            </li>
          ))}
        </ol>
      </V0Section>

      <V0Section label="Código abierto · GitHub ↘">
        <p className={v.mono}>
          El código de cada experimento, para copiar o pedírselo a Claude. <Pending>repo público</Pending>
        </p>
      </V0Section>

      <div className={v.closing}>
        <ContactBlock />
      </div>
    </div>
  )
}
