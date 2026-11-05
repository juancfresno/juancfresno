import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PROJECTS } from '@/content/site'
import Section from '@/components/blocks/Section'
import Pending from '@/components/blocks/Pending'
import s from '@/components/blocks/blocks.module.scss'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return PROJECTS.filter((p) => p.caseStudy).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = PROJECTS.find((x) => x.slug === slug)
  return { title: p?.name ?? 'Project' }
}

// Case study template (architecture doc): ficha, hard question, context,
// decisions, discarded, result, process, credits, next case.
export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params
  const i = PROJECTS.findIndex((x) => x.slug === slug)
  if (i < 0) notFound()
  const p = PROJECTS[i]
  const cases = PROJECTS.filter((x) => x.caseStudy)
  const next = cases[(cases.findIndex((x) => x.slug === slug) + 1) % cases.length]

  const ficha: [string, React.ReactNode][] = [
    ['Cliente', p.client ?? <Pending />],
    ['Para', p.studio ?? <Pending>@estudio</Pending>],
    ['Año', p.year ?? <Pending />],
    ['Rol', <Pending key="r" />],
    ['Equipo', <Pending key="e" />],
    ['Web', p.url ? <a href={p.url}>Ver ↗</a> : <Pending key="w" />],
  ]

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <p className={s.heroMeta}>{p.discipline}</p>
        <h1 className={s.heroTitle}>{p.name}</h1>
        <dl className={s.ficha}>
          {ficha.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </header>

      <div className={s.caseMedia}>
        <Image src={p.cover} alt="" fill sizes="100vw" priority />
      </div>

      <Section label="La pregunta difícil">
        <p className={s.lead}>Una frase con el problema real del proyecto. <Pending /></p>
      </Section>
      <Section label="Contexto y límites">
        <p className={s.text}>Plazo, equipo, tecnología y lo que no se podía tocar. <Pending /></p>
      </Section>
      <Section label="Decisiones">
        {[1, 2, 3].map((n) => (
          <div key={n} className={s.card}>
            <div className={s.placeholderMedia}>Decisión {n}</div>
            <span className={s.cardTitle}>Qué se decidió <Pending /></span>
            <span className={s.text}>Por qué, en una línea.</span>
          </div>
        ))}
      </Section>
      <Section label="Lo que se descartó">
        <p className={s.text}>Una o dos direcciones que no salieron y el motivo. <Pending /></p>
      </Section>
      <Section label="Resultado">
        <p className={s.lead}>Un dato real o qué cambió para el cliente. <Pending /></p>
      </Section>
      <Section label="Cómo se hizo">
        <p className={s.text}>Proceso, y la parte dirigida con IA cuando la haya. <Pending /></p>
      </Section>
      <Section label="Créditos">
        <p className={s.text}>Estudio, desarrollo y equipo. <Pending /></p>
      </Section>

      <Section label="Siguiente caso">
        <Link href={`/work/${next.slug}`} className={s.case}>
          <div className={s.caseMedia}>
            <Image src={next.cover} alt="" fill sizes="(max-width: 768px) 100vw, 75vw" />
          </div>
          <div className={s.caseInfo}><span className={s.caseName}>{next.name} ↘</span></div>
        </Link>
      </Section>
    </div>
  )
}
