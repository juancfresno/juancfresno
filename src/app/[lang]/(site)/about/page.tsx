import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import Image from 'next/image'
import Link from 'next/link'
import { getSite, getUi } from '@/content/site'
import { localePath } from '@/i18n/config'
import { localeOf, type LangParams } from '@/i18n/server'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import AboutViews from '@/components/about/AboutViews'
import v from '@/components/blocks/v0.module.scss'
import a from '@/components/about/about.module.scss'

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await localeOf(params)
  const { META } = getSite(l)
  return pageMeta({ locale: l, path: '/about', title: META.about.title, description: META.about.description })
}

const pad = (n: number) => String(n).padStart(2, '0')

function ExpRows({ rows, numbered = true }: { rows: { name: string; role: string; how: string; years: string }[]; numbered?: boolean }) {
  return (
    <ol className={a.exp}>
      {rows.map((x, i) => (
        <li key={`${x.name}-${x.years}`} className={a.tr}>
          <span className={a.n}>{numbered ? pad(i + 1) : ''}</span>
          <span className={a.company}>{x.name}</span>
          <span className={a.cell}>{x.role}</span>
          <span className={a.cell}>{x.how}</span>
          <span className={`${a.cell} ${a.right}`}>{x.years}</span>
        </li>
      ))}
    </ol>
  )
}

// About v1.0 — Figma "About · v1.0 · 1680" (6888:1117): "About" + View
// selector, professional | personal side by side, services as rows with tag
// chips, studios & brands, experience with figures, in-house years, dossier.
export default async function AboutPage({ params }: Props) {
  const l = await localeOf(params)
  const { ABOUT } = getSite(l)
  const ui = getUi(l)
  const [setup, poster] = ABOUT.photos
  const P = ABOUT.personal
  const Pro = ABOUT.professional

  return (
    <div className={v.page}>
      <section className={a.hero}>
        <AboutViews
          title={<h1 className={a.name}>{ui.about.h1}</h1>}
          professional={
            <>
              <p className={a.paneLabel}><span>{Pro.label}</span><span>{Pro.caption}</span></p>
              <div className={a.photo}><Image src={setup.src} width={setup.w} height={setup.h} alt={setup.alt} sizes="(max-width: 768px) 100vw, 25vw" unoptimized priority /></div>
              <p className={a.bioLead}>{Pro.paragraphs[0]}</p>
              <p className={a.bioRest}>{Pro.paragraphs[1]}</p>
            </>
          }
          personal={
            <>
              <p className={a.paneLabel}><span>{P.label}</span><span>{P.caption}</span></p>
              <div className={a.photo}><Image src={poster.src} width={poster.w} height={poster.h} alt={poster.alt} sizes="(max-width: 768px) 100vw, 25vw" unoptimized /></div>
              <p className={a.bioLead}>{P.paragraph}</p>
              <div className={a.hobbies}>
                <p className={a.bioRest}>{P.offScreen.text}</p>
                {P.offScreen.pending && <Pending>{ui.pending.hobbies}</Pending>}
              </div>
              <p className={a.footnote}>
                ¹ {P.footnote.before}
                <a href={P.footnote.href} target="_blank" rel="noopener noreferrer">{P.footnote.link}</a>
                {P.footnote.after}
              </p>
            </>
          }
        />
      </section>

      <V0Section label={ABOUT.servicesLabel} className={a.alt}>
        <ol className={a.services}>
          {ABOUT.services.map((x, i) => (
            <li key={x.name}>
              <span className={a.n}>{pad(i + 1)}</span>
              <h2 className={a.serviceName}>{x.name}</h2>
              <p className={a.serviceText}>{x.text}</p>
              <ul className={a.tags}>{x.tags.split(' · ').map((t) => <li key={t}>{t}</li>)}</ul>
            </li>
          ))}
        </ol>
        <Link href={localePath(l, '/contact')} className={`${v.label} ${a.after}`}>{ABOUT.servicesLink}</Link>
      </V0Section>

      <V0Section label={ui.about.studiosBrands}>
        <p className={a.sentence}>{ABOUT.studiosSentence}</p>
        <div className={a.lists}>
          <div>
            <p className={v.label}>{ABOUT.studiosLabel}</p>
            <p className={a.names}>{ABOUT.studios.join('\u00a0· ')}</p>
          </div>
          <div>
            <p className={v.label}>{ABOUT.brandsLabel}</p>
            <p className={a.names}>{ABOUT.brands.join('\u00a0· ')} <span className={a.namesTail}>{ABOUT.brandsTail}</span></p>
          </div>
        </div>
      </V0Section>

      <V0Section label={ABOUT.experienceLabel} id="experience" className={a.alt}>
        <ul className={a.figures}>
          {ABOUT.figures.map((x) => (
            <li key={x.value}>
              <span className={a.figLabel}>{x.label}</span>
              <span className={a.figValue}>{x.value}</span>
            </li>
          ))}
        </ul>
        <div className={`${a.tr} ${a.th}`} aria-hidden="true">
          <span>{ui.about.th.n}</span><span>{ui.about.th.company}</span><span>{ui.about.th.role}</span><span>{ui.about.th.how}</span><span className={a.right}>{ui.about.th.years}</span>
        </div>
        <ExpRows rows={ABOUT.experience} />
        <p className={a.before}><span /><span>{ABOUT.beforeLine}</span></p>
        <ExpRows rows={ABOUT.before} numbered={false} />
        <a href={ABOUT.dossier.href} className={`${v.label} ${a.after}`} data-no-transition>{ABOUT.dossier.text}</a>
      </V0Section>

      <ContactBlock locale={l} />
    </div>
  )
}
