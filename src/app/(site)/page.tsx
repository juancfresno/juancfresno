import Image from 'next/image'
import Link from 'next/link'
import { PERSON, PROJECTS, LAB, ABOUT } from '@/content/site'
import Section from '@/components/blocks/Section'
import ProjectIndex from '@/components/blocks/ProjectIndex'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import s from '@/components/blocks/blocks.module.scss'

export default function HomePage() {
  const featured = PROJECTS.filter((p) => p.featured)

  return (
    <div className={s.page}>
      {/* 02 · One line: role, for whom, city */}
      <header className={s.hero}>
        <p className={s.heroMeta}>{PERSON.name} · {PERSON.years}</p>
        <h1 className={s.heroTitle}>{PERSON.role}</h1>
        <ul className={s.heroDisciplines} aria-label="Disciplinas">
          {PERSON.disciplines.map((d) => <li key={d}>{d}</li>)}
        </ul>
      </header>

      {/* 03 · Three featured cases */}
      <Section label="Selected work">
        <div className={s.cases}>
          {featured.map((p, i) => (
            <Link key={p.slug} href={`/work/${p.slug}`} className={s.case}>
              <div className={s.caseMedia}>
                <Image src={p.cover} alt="" fill sizes="(max-width: 768px) 100vw, 75vw" priority={i === 0} />
              </div>
              <div className={s.caseInfo}>
                <span className={s.caseName}>{p.name}</span>
                <span className={s.caseTag}>
                  {p.discipline} · {p.year ?? <Pending>año</Pending>} · {p.studio ? `para ${p.studio}` : <Pending>estudio</Pending>}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* 04 · Short index */}
      <Section label="Index">
        <ProjectIndex projects={PROJECTS.slice(0, 8)} />
        <Link href="/work" className={`${s.button} ${s.more}`}>Ver todo ↘</Link>
      </Section>

      {/* 05 · Lab teaser */}
      <Section label="Lab">
        <div className={s.grid3}>
          {LAB.slice(0, 3).map((x) => (
            <div key={x.name} className={s.card}>
              <span className={s.cardTitle}>{x.name}</span>
              <span className={s.text}>{x.what ?? <Pending>qué hace</Pending>}</span>
            </div>
          ))}
        </div>
        <Link href="/lab" className={`${s.button} ${s.more}`}>Ver Lab ↘</Link>
      </Section>

      {/* 06 · Clients */}
      <Section label="Clientes">
        <ul className={s.chips}>
          {ABOUT.clients.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </Section>

      <ContactBlock />
    </div>
  )
}
