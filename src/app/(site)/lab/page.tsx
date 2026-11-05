import type { Metadata } from 'next'
import Link from 'next/link'
import { LAB, EXPERIMENTS } from '@/content/site'
import Section from '@/components/blocks/Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import s from '@/components/blocks/blocks.module.scss'
import l from '@/components/lab/lab.module.scss'

export const metadata: Metadata = { title: 'Lab' }

// Lab: own products (with status and how they were built) + experiments.
export default function LabPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <p className={s.heroMeta}>Experimentos · productos propios</p>
        <h1 className={s.heroTitle}>Lab</h1>
        <p className={s.text}>Lo que funciona o se toca: navegaciones, artefactos, prototipos y productos propios.</p>
      </header>

      <Section label="Productos propios">
        <ul className={s.rows}>
          {LAB.map((x) => (
            <li key={x.name}>
              <span className={s.rowTitle}>{x.name}</span>
              <div>
                <p className={s.text}>{x.what ?? <Pending>qué hace</Pending>}</p>
                <p className={s.rowTags}>
                  {x.status ?? 'estado'} · {x.year ?? 'año'} · cómo se ha construido, incluida la parte con IA <Pending />
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Experimentos">
        <div className={s.grid3}>
          {EXPERIMENTS.map((e) => (
            <Link key={e.slug} href={`/lab/${e.slug}`} className={l.piece}>
              <div className={l.pieceMedia}>{e.name}</div>
              <p className={l.pieceMeta}>{e.n} · {e.kind} · {e.year}</p>
            </Link>
          ))}
          {['Motion', 'Shot'].map((x) => (
            <div key={x} className={s.placeholderMedia}>{x} <Pending /></div>
          ))}
        </div>
      </Section>

      <ContactBlock />
    </div>
  )
}
