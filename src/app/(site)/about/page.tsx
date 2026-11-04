import type { Metadata } from 'next'
import { PERSON, ABOUT } from '@/content/site'
import Section from '@/components/blocks/Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import s from '@/components/blocks/blocks.module.scss'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <p className={s.heroMeta}>{PERSON.role} · {PERSON.years}</p>
        <h1 className={s.heroTitle}>{PERSON.name}</h1>
      </header>

      <Section label="Bio">
        {ABOUT.bio.map((p) => <p key={p} className={s.lead}>{p}</p>)}
        <div className={s.placeholderMedia}>Foto <Pending /></div>
      </Section>

      <Section label="Cómo trabajo con estudios">
        <div className={s.grid3}>
          {ABOUT.modes.map((m) => (
            <div key={m.name} className={s.card}>
              <span className={s.cardTitle}>{m.name}</span>
              <span className={s.text}>{m.text}</span>
            </div>
          ))}
        </div>
        <Pending>copy por revisar</Pending>
      </Section>

      <Section label="{ servicios ↘">
        <ul className={s.rows}>
          {ABOUT.services.map((x) => (
            <li key={x.name}>
              <span className={s.rowTitle}>{x.name}</span>
              <div>
                <p className={s.text}>{x.text}</p>
                <p className={s.rowTags}>{x.tags}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="{ Estudios — agencias ↘">
        <ul className={s.chips}>{ABOUT.studios.map((x) => <li key={x}>{x}</li>)}</ul>
        <p className={s.text}>Timeline por año con cada cliente y estudio. <Pending>años de las facturas</Pending></p>
      </Section>

      <Section label="{ Clientes ↘">
        <ul className={s.chips}>{ABOUT.clients.map((x) => <li key={x}>{x}</li>)}</ul>
      </Section>

      <Section label="Herramientas">
        <p className={s.text}>{ABOUT.tools} <Pending /></p>
      </Section>

      <ContactBlock />
    </div>
  )
}
