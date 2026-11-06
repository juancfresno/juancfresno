import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CASES, CASE_PROJECTS, caseMedia, projectNumber } from '@/content/cases'
import CaseBlock from '@/components/case/CaseBlock'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import s from '@/components/case/case.module.scss'
import v from '@/components/blocks/v0.module.scss'

type Props = { params: Promise<{ slug: string }> }

// Only projects with caseStudy: true and copy in CASES get a page.
export function generateStaticParams() {
  return CASE_PROJECTS.map((p) => ({ slug: p.slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const c = CASES[slug]
  if (!c) return { title: 'Work' }
  const cover = caseMedia(slug)?.cover
  return {
    title: c.title,
    description: c.lead,
    openGraph: cover ? { images: [{ url: cover.src, width: cover.w, height: cover.h }] } : undefined,
  }
}

function Mod({ label, className, aside, children }: { label: string; className?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`${s.mod} ${className ?? ''}`}>
      <ElasticLine className={s.rule} />
      <div className={s.fila}>
        <div className={s.colLabel}>
          <p className={s.label}>{label}</p>
          {aside}
        </div>
        <div className={s.colContent}>{children}</div>
      </div>
    </section>
  )
}

// Case template — Figma "Caso · Shoeciety · Rediseño" (header and text
// modules) + "Caso · Shoeciety · v0" (one continuous Behance block with notes).
export default async function CasePage({ params }: Props) {
  const { slug } = await params
  const c = CASES[slug]
  const m = caseMedia(slug)
  const i = CASE_PROJECTS.findIndex((p) => p.slug === slug)
  if (!c || !m || i < 0) notFound()
  const next = CASE_PROJECTS[(i + 1) % CASE_PROJECTS.length]
  const nextCase = CASES[next.slug]

  // Sections are numbered in the order they appear, as in each Figma frame.
  let k = 0
  const num = () => String(++k).padStart(2, '0')
  const total = c.decisions?.length ?? 0

  return (
    <article className={v.page}>
      <header className={s.header}>
        <div className={s.metaRow}>
          <span><Link href="/work">Work</Link> / {projectNumber(slug)}</span>
          <span>{c.meta}</span>
        </div>
        <h1 className={s.title}>{c.title}</h1>
        <p className={s.lead}>{c.lead}</p>
        <dl className={s.ficha}>
          <div><dt>Cliente</dt><dd>{c.ficha.cliente}</dd></div>
          <div><dt>Año</dt><dd>{c.ficha.año}</dd></div>
          <div><dt>Rol</dt><dd>{c.ficha.rol}</dd></div>
          <div><dt>Disciplina</dt><dd>{c.ficha.disciplina}</dd></div>
        </dl>
      </header>

      {c.question && (
        <Mod label={`${num()} · La pregunta`} className={s.modQuestion}>
          <p className={s.question}>{c.question}</p>
        </Mod>
      )}

      {c.context && (
        <Mod label={`${num()} · Contexto`}>
          <p className={s.contextLead}>{c.context.lead}</p>
          <p className={s.text}>{c.context.text}</p>
        </Mod>
      )}

      {c.decisions && (() => {
        const n = num()
        return c.decisions.map((d, j) => (
          <Mod
            key={d.title}
            label={`${n} · Decisiones — ${String(j + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`}
            aside={<span className={s.bigNumber} aria-hidden="true">{String(j + 1).padStart(2, '0')}</span>}
          >
            <h2 className={s.decisionTitle}>{d.title}</h2>
            <p className={s.text}>{d.text}</p>
          </Mod>
        ))
      })()}

      <CaseBlock images={m.images} title={c.title} notes={c.notes} />

      <Mod label={`${num()} · Resultado · Behance`} className={s.modResult}>
        <div className={s.stats}>
          {c.stats.map((st) => (
            <div key={st.label} className={s.stat}>
              <span className={s.statValue}>{st.value}</span>
              <span className={s.label}>{st.label}</span>
            </div>
          ))}
        </div>
        <p className={s.published}>{c.published}</p>
      </Mod>

      <Mod label={`${num()} · Créditos`} className={s.modCredits}>
        <p className={s.credits}>{c.credits}</p>
      </Mod>

      <Link href={`/work/${next.slug}`} className={s.next}>
        <span className={s.label}>Siguiente caso</span>
        <span className={s.nextTitle}>{nextCase.title} ↘</span>
      </Link>
    </article>
  )
}
