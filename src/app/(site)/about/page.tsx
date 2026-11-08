import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ABOUT, META } from '@/content/site'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import AboutViews from '@/components/about/AboutViews'
import v from '@/components/blocks/v0.module.scss'
import a from '@/components/about/about.module.scss'

export const metadata: Metadata = {
  title: META.about.title,
  description: META.about.description,
  alternates: { canonical: '/about' },
}

const pad = (n: number) => String(n).padStart(2, '0')

function ExpTable({ rows, numbered = true }: { rows: { name: string; role: string; how: string; years: string }[]; numbered?: boolean }) {
  return (
    <div className={a.table}>
      <div className={`${a.tr} ${a.th} ${numbered ? '' : a.noN}`} aria-hidden="true">
        {numbered && <span>Nº</span>}<span>Studio or company</span><span>Role</span><span>How</span><span className={a.right}>Years</span>
      </div>
      <ol>
        {rows.map((x, i) => (
          <li key={`${x.name}-${x.years}`} className={`${a.tr} ${numbered ? '' : a.noN}`}>
            {numbered && <span className={a.n}>{pad(i + 1)}</span>}
            <span className={a.company}>{x.name}</span>
            <span className={a.cell}>{x.role}</span>
            <span className={a.cell}>{x.how}</span>
            <span className={`${a.cell} ${a.right}`}>{x.years}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// About v1.0: professional / personal views, services, studios & brands,
// experience with the figures, the in-house years and the dossier link.
// No process section (it went to the dossier). Biako only as a footnote.
export default function AboutPage() {
  const [setup, poster, face] = ABOUT.photos
  const P = ABOUT.personal

  return (
    <div className={v.page}>
      <header className={a.hero}>
        <div className={a.heroHead}>
          <h1 className={a.name}>About</h1>
          <p className={a.role}>Juan C. Fresno · {ABOUT.role}</p>
        </div>

        <AboutViews
          professional={
            <>
              <p className={v.label}>{ABOUT.professional.label}</p>
              {ABOUT.professional.paragraphs.map((t, i) => (
                <p key={i} className={i === 0 ? a.bioLead : a.bioRest}>{t}</p>
              ))}
            </>
          }
          personal={
            <>
              <p className={v.label}>{P.label}</p>
              <p className={a.bioLead}>{P.paragraph}</p>
              <p className={a.bioRest}>{P.offScreen.text}<sup className={a.ref}>1</sup>{P.offScreen.pending && <Pending>confirm</Pending>}</p>
              <p className={a.footnote}>
                <sup>1</sup> {P.footnote.before}
                <a href={P.footnote.href} target="_blank" rel="noopener noreferrer">{P.footnote.link}</a>
                {P.footnote.after}
              </p>
            </>
          }
          photoPro={<Image src={setup.src} width={setup.w} height={setup.h} alt={setup.alt} sizes="(max-width: 768px) 100vw, 33vw" unoptimized priority />}
          photoPersonal={
            <div className={a.personalPhotos}>
              <Image src={poster.src} width={poster.w} height={poster.h} alt={poster.alt} sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
              <Image src={face.src} width={face.w} height={face.h} alt={face.alt} className={a.face} sizes="8rem" unoptimized />
            </div>
          }
        />
      </header>

      <V0Section label={ABOUT.servicesLabel}>
        <ul className={a.serviceList}>
          {ABOUT.services.map((x) => (
            <li key={x.name}>
              <h2 className={a.serviceName}>{x.name}</h2>
              <p className={a.serviceText}>{x.text}</p>
              <p className={a.serviceTags}>{x.tags}</p>
            </li>
          ))}
        </ul>
        <Link href="/contact" className={`${v.label} ${a.after}`}>{ABOUT.servicesLink}</Link>
      </V0Section>

      <V0Section label={'{ Studios & brands ↘'}>
        <p className={a.sentence}>{ABOUT.studiosSentence}</p>
        <div className={a.lists}>
          <div>
            <p className={v.label}>{ABOUT.studiosLabel}</p>
            <ul className={a.names}>{ABOUT.studios.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div>
            <p className={v.label}>{ABOUT.brandsLabel}</p>
            <ul className={a.names}>
              {ABOUT.brands.map((x) => <li key={x}>{x}</li>)}
              <li className={a.namesTail}>{ABOUT.brandsTail}</li>
            </ul>
          </div>
        </div>
      </V0Section>

      <V0Section label={ABOUT.experienceLabel} id="experience">
        <ul className={a.figures}>
          {ABOUT.figures.map((x) => (
            <li key={x.value}>
              <span className={a.figValue}>{x.value}</span>
              {x.label && <span className={a.figLabel}>{x.label}</span>}
            </li>
          ))}
        </ul>
        <ExpTable rows={ABOUT.experience} />
        <p className={a.before}>{ABOUT.beforeLine}</p>
        <ExpTable rows={ABOUT.before} numbered={false} />
        <a href={ABOUT.dossier.href} className={`${v.label} ${a.after}`} data-no-transition>{ABOUT.dossier.text}</a>
      </V0Section>

      <ContactBlock />
    </div>
  )
}
