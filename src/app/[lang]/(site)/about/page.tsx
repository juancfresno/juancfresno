import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { getSite, getUi } from '@/content/site'
import { localeOf, type LangParams } from '@/i18n/server'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import a from '@/components/about/about.module.scss'

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const { META } = getSite(l)
  return pageMeta({ locale: l, path: '/about', title: META.about.title, description: META.about.description })
}

// About — Figma "about" (AXxkCCuckrXGKDUCk8lNyQ · 6964:14926): hero row with
// the ficha marker left and "/ About" right (Work / Contact pattern), the bio
// in three tints, a brand-blue band reserved for the photo / 3D piece (empty
// frame with crop marks) and the "collaborate" close (04 · Archivo).
export default async function AboutPage({ params }: Props) {
  const l = await localeOf(params)
  const { ABOUT, PERSON } = getSite(l)
  const ui = getUi(l)
  const P = ABOUT.page

  return (
    <div className={a.page}>
      <header className={a.hero} data-wf="hero">
        <p className={a.marker} aria-hidden="true">{P.marker}</p>
        <h1 className={a.name}>/ {ui.about.h1}</h1>
      </header>

      <section className={a.bio} data-wf="bio">
        <div className={a.bioLead}>
          {P.bio.slice(0, 2).map((p, i) => (
            <p key={i}>
              {'hi' in p && p.hi ? <span className={a.hi}>{p.hi}</span> : null}
              {'mid' in p && p.mid ? <span className={a.mid}>{p.mid}</span> : null}
              <span className={a.dim}>{p.dim}</span>
            </p>
          ))}
        </div>
        <p className={a.dim}>{P.bio[2].dim}</p>
      </section>

      <section className={a.stage} data-wf="media" aria-label={P.frame}>
        <div className={a.frame} aria-hidden="true">
          <span /><span /><span /><span />
        </div>
      </section>

      <section className={a.close} data-wf="close" aria-labelledby="about-close">
        <ElasticLine className={a.rule} />
        <p id="about-close" className={a.closeLabel}>{P.close.label}</p>
        <p className={a.closeLine}>{P.close.line}</p>
        <a className={a.closeMail} href={`mailto:${PERSON.email}`} data-no-transition>{PERSON.email}</a>
      </section>
    </div>
  )
}
