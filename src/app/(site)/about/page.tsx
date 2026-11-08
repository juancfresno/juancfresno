import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import Image from 'next/image'
import Link from 'next/link'
import { ABOUT, META } from '@/content/site'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import AboutViews from '@/components/about/AboutViews'
import v from '@/components/blocks/v0.module.scss'
import a from '@/components/about/about.module.scss'

export const metadata: Metadata = pageMeta({ path: '/about', title: META.about.title, description: META.about.description })

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
export default function AboutPage() {
  const [setup, poster] = ABOUT.photos
  const P = ABOUT.personal
  const Pro = ABOUT.professional

  return (
    <div className={v.page}>
      <section className={a.hero}>
        <AboutViews
          title={<h1 className={a.name}>About</h1>}
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
                {P.offScreen.pending && <Pending>hobbies, confirm</Pending>}
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
        <Link href="/contact" className={`${v.label} ${a.after}`}>{ABOUT.servicesLink}</Link>
      </V0Section>

      <V0Section label={'{ Studios & brands ↘'}>
        <p className={a.sentence}>{ABOUT.studiosSentence}</p>
        <div className={a.lists}>
          <div>
            <p className={v.label}>{ABOUT.studiosLabel}</p>
            <p className={a.names}>{ABOUT.studios.join(' · ')}</p>
          </div>
          <div>
            <p className={v.label}>{ABOUT.brandsLabel}</p>
            <p className={a.names}>{ABOUT.brands.join(' · ')} <span className={a.namesTail}>{ABOUT.brandsTail}</span></p>
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
          <span>Nº</span><span>Studio or company</span><span>Role</span><span>How</span><span className={a.right}>Years</span>
        </div>
        <ExpRows rows={ABOUT.experience} />
        <p className={a.before}><span /><span>{ABOUT.beforeLine}</span></p>
        <ExpRows rows={ABOUT.before} numbered={false} />
        <a href={ABOUT.dossier.href} className={`${v.label} ${a.after}`} data-no-transition>{ABOUT.dossier.text}</a>
      </V0Section>

      <ContactBlock />
    </div>
  )
}
