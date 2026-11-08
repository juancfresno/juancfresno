import type { Metadata } from 'next'
import Link from 'next/link'
import { LAB, LAB_FEATURED, LAB_LABELS, EXPERIMENTS, INTROS, META } from '@/content/site'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import v from '@/components/blocks/v0.module.scss'
import l from '@/components/lab/lab.module.scss'

export const metadata: Metadata = {
  title: META.lab.title,
  description: META.lab.description,
  alternates: { canonical: '/lab' },
}

// Lab v1.0 (copy doc): intro, featured 002 Transitions (11a runs this site),
// experiments with a one-line "how it's built", own products, resources.
// Layout of our own until the Figma "↪ Visual v1.0" frame lands.
export default function LabPage() {
  const F = LAB_FEATURED

  return (
    <div className={v.page}>
      <h1 className={v.srOnly}>Lab</h1>
      <p className={v.intro}>{INTROS.lab}</p>

      <V0Section label={LAB_LABELS.featured}>
        <article className={l.featured}>
          <Link href={`/lab/${F.slug}`} className={l.featuredVisual} aria-label="Open 002 · Transitions" tabIndex={-1}>
            <span className={l.wire} aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => <span key={i} className={l.wireCol} style={{ ['--i' as string]: i }} />)}
              <span className={`${l.wireBox} ${l.wireBoxA}`}><em>H1 · 40/46</em></span>
              <span className={`${l.wireBox} ${l.wireBoxB}`}><em>P · 18</em></span>
              <span className={`${l.wireBox} ${l.wireBoxC}`}><em>IMG 16:9</em></span>
            </span>
          </Link>
          <div className={l.featuredText}>
            <p className={l.featuredMeta}>{F.meta}</p>
            <h2 className={l.featuredTitle}>{F.head}</h2>
            <p className={l.featuredBody}>{F.text}</p>
            <p className={l.featuredLinks}>
              <Link href={`/lab/${F.slug}`} className={v.label}>{F.live}</Link>
              <span className={v.label}>{F.code}<Pending>public repo</Pending></span>
            </p>
          </div>
        </article>
      </V0Section>

      <V0Section label={LAB_LABELS.experiments}>
        <ol className={l.rows}>
          {EXPERIMENTS.map((e) => (
            <li key={e.slug}>
              <Link href={`/lab/${e.slug}`} className={l.exp}>
                <span className={l.n}>{e.n}</span>
                <span className={l.expMain}>
                  <span className={l.rowName}>{e.name} <span aria-hidden="true" className={l.arrow}>↗</span></span>
                  <span className={l.expWhat}>{e.what}</span>
                </span>
                <span className={l.spec}>{e.kind}</span>
                <span className={l.spec}>{e.built}</span>
                <span className={`${l.spec} ${l.end}`}>{e.year}</span>
              </Link>
            </li>
          ))}
        </ol>
      </V0Section>

      <V0Section label={LAB_LABELS.products}>
        <ol className={l.rows}>
          {LAB.map((x, i) => (
            <li key={x.name}>
              <div className={l.row}>
                <span className={l.n}>{String(i + 1).padStart(2, '0')}</span>
                <span className={l.rowName}>{x.name}</span>
                <span className={l.whatCell}>{x.what ?? <Pending>one line · Juan</Pending>}</span>
                <span className={`${l.spec} ${l.end}`}>{x.status}</span>
              </div>
            </li>
          ))}
        </ol>
      </V0Section>

      <V0Section label={LAB_LABELS.resources}>
        <p className={v.mono}>{LAB_LABELS.openSource}<Pending>public repo</Pending></p>
      </V0Section>

      <ContactBlock />
    </div>
  )
}
