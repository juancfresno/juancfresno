import type { Metadata } from 'next'
import { LAB } from '@/content/site'
import Section from '@/components/blocks/Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import s from '@/components/blocks/blocks.module.scss'

export const metadata: Metadata = { title: 'Playground' }

// Lab: own products (with status and how they were built) + experiments.
export default function PlaygroundPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <p className={s.heroMeta}>Lab</p>
        <h1 className={s.heroTitle}>Playground</h1>
        <p className={s.text}>Productos propios y experimentos.</p>
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
          {['Motion', 'Shot', 'Interacción'].map((x) => (
            <div key={x} className={s.placeholderMedia}>{x} <Pending /></div>
          ))}
        </div>
      </Section>

      <ContactBlock />
    </div>
  )
}
