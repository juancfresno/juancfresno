import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CASES, CASE_PROJECTS, caseMedia, projectNumber, projectTotal } from '@/content/cases'
import CaseBlock from '@/components/case/CaseBlock'
import CaseClose from '@/components/close/CaseClose'
import Pending from '@/components/blocks/Pending'
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
  const description = c.lead.length > 155 ? `${c.lead.slice(0, 154).trimEnd()}…` : c.lead
  return {
    title: { absolute: `${c.title} — ${c.chips[0]} · Juan C. Fresno` },
    description,
    alternates: { canonical: `/work/${slug}` },
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

// Case template v1.0 (copy doc "Case template (EN)"): header with ficha and
// discipline chips, the question, context, decisions, ONE continuous image
// block, in hindsight, credits (+ live site), next case, short close.
export default async function CasePage({ params }: Props) {
  const { slug } = await params
  const c = CASES[slug]
  const m = caseMedia(slug)
  const i = CASE_PROJECTS.findIndex((p) => p.slug === slug)
  if (!c || !m || i < 0) notFound()
  const next = CASE_PROJECTS[(i + 1) % CASE_PROJECTS.length]
  const nextCase = CASES[next.slug]

  // Sections are numbered in the order they appear.
  let k = 0
  const num = () => String(++k).padStart(2, '0')
  const total = c.decisions?.length ?? 0
  const f = c.ficha

  return (
    <article className={v.page}>
      <header className={s.header}>
        <div className={s.metaRow}>
          <span><Link href="/work">Work</Link> / {projectNumber(slug)}</span>
          <span>{c.meta}</span>
        </div>
        <div className={s.titleBlock}>
          <h1 className={s.title}>{c.title}</h1>
          <ul className={s.chips} aria-label="Disciplines">
            {c.chips.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
        <p className={s.lead}>{c.lead}</p>
        <dl className={s.ficha}>
          <div><dt>Client</dt><dd>{f.client}</dd></div>
          {f.via && <div><dt>Via</dt><dd>{f.via}</dd></div>}
          <div><dt>Year</dt><dd>{f.year}</dd></div>
          <div><dt>Role</dt><dd>{f.role ?? <Pending>role</Pending>}</dd></div>
          {f.team && <div><dt>Team</dt><dd>{f.team}</dd></div>}
        </dl>
      </header>

      {c.question && (
        <Mod label={`${num()} · The question`} className={s.modQuestion}>
          <p className={s.question}>{c.question}</p>
        </Mod>
      )}

      {c.context && (
        <Mod label={`${num()} · Context`}>
          <p className={s.contextLead}>{c.context.lead}</p>
          <p className={s.text}>{c.context.text}</p>
        </Mod>
      )}

      {c.decisions && (() => {
        const n = num()
        return c.decisions.map((d, j) => (
          <Mod
            key={d.title}
            label={`${n} · Decisions — ${String(j + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`}
            aside={<span className={s.bigNumber} aria-hidden="true">{String(j + 1).padStart(2, '0')}</span>}
          >
            <h2 className={s.decisionTitle}>{d.title}</h2>
            <p className={s.text}>{d.text}</p>
          </Mod>
        ))
      })()}

      <CaseBlock images={m.images} title={c.title} notes={c.notes} />

      <Mod label={`${num()} · In hindsight`} className={s.modHindsight}>
        {c.hindsight ? <p className={s.contextLead}>{c.hindsight}</p> : <p className={s.text}><Pending>in hindsight · Juan writes it</Pending></p>}
      </Mod>

      <Mod label="Credits" className={s.modCredits}>
        <p className={s.credits}>{c.credits}</p>
        {c.live && <a className={s.live} href={c.live} target="_blank" rel="noopener noreferrer">Live site ↗</a>}
      </Mod>

      <Link href={`/work/${next.slug}`} className={s.next}>
        <span className={s.label}>Next · {projectNumber(next.slug)}/{projectTotal()}</span>
        <span className={s.nextTitle}>{nextCase.title} ↗</span>
      </Link>

      <CaseClose />
    </article>
  )
}
