import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { caseJsonLd } from '@/lib/jsonld'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getCases, getCaseProjects, CASE_PROJECT_SLUGS, caseMedia, creditsLine, projectNumber, projectTotal } from '@/content/cases'
import { getUi } from '@/content/site'
import { localePath, LOCALES } from '@/i18n/config'
import { localeOf } from '@/i18n/server'
import CaseBlock from '@/components/case/CaseBlock'
import CaseClose from '@/components/close/CaseClose'
import Pending from '@/components/blocks/Pending'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import s from '@/components/case/case.module.scss'
import v from '@/components/blocks/v0.module.scss'

type Props = { params: Promise<{ lang: string; slug: string }> }

// Only projects with caseStudy: true and copy in CASES get a page.
export function generateStaticParams() {
  return LOCALES.flatMap((lang) => CASE_PROJECT_SLUGS.map((slug) => ({ lang, slug })))
}

export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const l = await localeOf(params)
  const c = getCases(l)[slug]
  if (!c) return { title: getUi(l).work.h1 }
  const description = c.lead.length > 155 ? `${c.lead.slice(0, 154).trimEnd()}…` : c.lead
  // og:image = work/[slug]/opengraph-image.tsx (the case cover on the brand card).
  return pageMeta({ locale: l, path: `/work/${slug}`, title: `${c.title} — ${c.chips[0]} · ${getUi(l).case.metaSuffix}`, description, absoluteTitle: true, type: 'article' })
}

// Text module on the case grid: label (cols 5–6) + content (cols 7–12).
function Row({ label, n, className, children }: { label: string; n?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`${s.row} ${className ?? ''}`}>
      <div className={s.rowInner}>
        <p className={s.rowLabel}><span>{label}</span>{n && <span className={s.rowN}>{n}</span>}</p>
        <div className={s.rowContent}>{children}</div>
      </div>
    </section>
  )
}

// Case template v1.0 — Figma v1/case-top (6879:460) + "Caso · … · v1.0"
// frames: case top (big number + ficha | title, chips, description, the
// question), [Context, Decisions when the copy is in English], ONE continuous
// image block, In hindsight, Credits, Next case (title + cover), case close.
export default async function CasePage({ params }: Props) {
  const { slug } = await params
  const l = await localeOf(params)
  const ui = getUi(l)
  const t = ui.case
  const CASES = getCases(l)
  const CASE_PROJECTS = getCaseProjects(l)
  const href = (p: string) => localePath(l, p)
  const c = CASES[slug]
  const m = caseMedia(slug)
  const i = CASE_PROJECTS.findIndex((p) => p.slug === slug)
  if (!c || !m || i < 0) notFound()
  const next = CASE_PROJECTS[(i + 1) % CASE_PROJECTS.length]
  const nextCase = CASES[next.slug]
  const nextCover = caseMedia(next.slug)?.cover
  const f = c.ficha
  const n = projectNumber(slug)
  const kind = c.meta.split(' · ').slice(1).join(' · ')
  const total = c.decisions?.length ?? 0
  const pad = (x: number) => String(x).padStart(2, '0')

  const ld = caseJsonLd(l, slug)

  return (
    <article className={v.page}>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />}
      <header className={s.top}>
        <div className={s.fichaCol}>
          <p className={s.bigN} aria-hidden="true">{n}</p>
          <dl className={s.ficha}>
            <div><dt>{t.client}</dt><dd>{f.client}</dd></div>
            {f.via && <div><dt>{t.via}</dt><dd>{f.via}</dd></div>}
            <div><dt>{t.year}</dt><dd>{f.year}</dd></div>
            <div><dt>{t.role}</dt><dd>{f.role ?? <Pending>{ui.pending.role}</Pending>}</dd></div>
            {f.team && <div><dt>{t.team}</dt><dd>{f.team}</dd></div>}
          </dl>
          {c.live && <a className={s.live} href={c.live} target="_blank" rel="noopener noreferrer">{t.live}</a>}
        </div>
        <span className={s.divider} aria-hidden="true" />
        <div className={s.headCol}>
          <p className={s.crumb}><Link href={href('/work')}>{t.crumb}</Link> / {n} · {kind} · {f.year}</p>
          <h1 className={s.title}>{c.title}</h1>
          <ul className={s.chips} aria-label={t.disciplines}>
            {c.chips.map((x) => <li key={x}>{x}</li>)}
          </ul>
          <p className={s.lead}>{c.lead}</p>
          {c.question && (
            <div className={s.question}>
              <p className={s.qLabel}><span>{t.question}</span><span className={s.rowN}>01</span></p>
              <p className={s.questionText}>{c.question}</p>
            </div>
          )}
        </div>
      </header>

      {c.copyEn && c.context && (
        <Row label={t.context} n="02" className={s.rowFirst}>
          <p className={s.contextLead}>{c.context.lead}</p>
          <p className={s.text}>{c.context.text}</p>
        </Row>
      )}

      {c.copyEn && c.decisions && (
        <Row label={t.decisions} n="03">
          <ol className={s.decisions}>
            {c.decisions.map((d, j) => (
              <li key={d.title}>
                <span className={s.decN}>{pad(j + 1)}/{pad(total)}</span>
                <span><span className={s.decTitle}>{d.title}</span><span className={s.decText}>{d.text}</span></span>
              </li>
            ))}
          </ol>
        </Row>
      )}

      <CaseBlock images={m.images} title={c.title} notes={c.notes} />

      <Row label={t.hindsight} n="04" className={s.rowHindsight}>
        {c.hindsight ? (
          <p className={s.contextLead}>{c.hindsight}</p>
        ) : (
          <>
            <p className={`${s.contextLead} ${s.faint}`}>{t.hindsightGuide}</p>
            <p><Pending>{ui.pending.juan}</Pending></p>
          </>
        )}
      </Row>

      <Row label={t.credits} className={s.rowCredits}>
        <p className={s.credits}>{creditsLine(l, slug, c)}</p>
      </Row>

      <section className={s.nextMod} aria-label={t.nextCase}>
        <div className={s.head}>
          <ElasticLine className={s.headRule} />
          <div className={s.headRow}><p>{t.next}</p><Link href={href('/work')}>{t.allWork}</Link></div>
        </div>
        <Link href={href(`/work/${next.slug}`)} className={s.next}>
          <span className={s.nextText}>
            <span className={s.nextLabel}>{t.nextN} · {projectNumber(next.slug)}/{projectTotal()}</span>
            <span className={s.nextTitle}>{nextCase.title} <span className={s.nextArrow} aria-hidden="true">↗</span></span>
            <span className={s.nextLead}>{nextCase.lead}</span>
          </span>
          {nextCover && (
            <span className={s.nextCover}>
              <Image src={nextCover.src} width={nextCover.w} height={nextCover.h} alt="" sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
            </span>
          )}
        </Link>
      </section>

      <CaseClose locale={l} />
    </article>
  )
}
