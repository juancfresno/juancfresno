import type { Metadata } from 'next'
import Image from 'next/image'
import { ABOUT, HOME } from '@/content/site'
import V0Section from '@/components/blocks/V0Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import v from '@/components/blocks/v0.module.scss'
import a from '@/components/about/about.module.scss'

export const metadata: Metadata = { title: 'About' }

// Figma: "About · Desktop" (6770:10229), dark theme. Bio, services with
// photos, studios and brands, process, experience; dossier and resources are
// still placeholders in Figma.
export default function AboutPage() {
  const [setup, poster, face] = ABOUT.photos

  return (
    <div className={v.page}>
      <header className={a.hero}>
        <div className={a.heroHead}>
          <h1 className={a.name}>{HOME.name}</h1>
          <p className={a.role}>{ABOUT.role}</p>
        </div>
        <p className={a.bio}>
          <span className={a.bioLead}>{ABOUT.bioLead}</span> <span className={a.bioRest}>{ABOUT.bioRest}</span>
        </p>
      </header>

      <V0Section label="{ servicios ↘">
        <div className={a.services}>
          <ul className={a.serviceList}>
            {ABOUT.services.map((x) => (
              <li key={x.name}>
                <h2 className={a.serviceName}>{x.name}</h2>
                <p className={a.serviceText}>{x.text}</p>
                <p className={a.serviceTags}>{x.tags}</p>
              </li>
            ))}
          </ul>
          <div className={a.photos}>
            <Image src={setup.src} width={setup.w} height={setup.h} alt={setup.alt} className={a.photoSetup} sizes="(max-width: 768px) 60vw, 20vw" unoptimized />
            <Image src={poster.src} width={poster.w} height={poster.h} alt={poster.alt} className={a.photoPoster} sizes="(max-width: 768px) 100vw, 35vw" unoptimized />
            <Image src={face.src} width={face.w} height={face.h} alt={face.alt} className={a.photoFace} sizes="8rem" unoptimized />
          </div>
        </div>
      </V0Section>

      <V0Section label="{ Estudios y agencias ↘">
        <p className={a.paragraph}>{ABOUT.studios}</p>
        <p className={`${v.label} ${a.subLabel}`}>{'{ Marcas ↘'}</p>
        <p className={a.paragraph}>{ABOUT.brands}</p>
      </V0Section>

      <V0Section label="{ proceso ↘">
        <ol className={a.process}>
          {ABOUT.process.map((p) => (
            <li key={p.n}>
              <span className={a.processN}>{`{${p.n}}`}</span>
              <span className={a.processName}>{p.name}</span>
              <span className={a.processText}>{p.text}</span>
            </li>
          ))}
        </ol>
      </V0Section>

      <V0Section label="{ Experiencia ↘">
        <div className={a.table}>
          <div className={`${a.tr} ${a.th}`} aria-hidden="true">
            <span>Nº</span><span>Estudio o empresa</span><span>Rol</span><span>Cómo</span><span className={a.right}>Años</span>
          </div>
          <ol>
            {ABOUT.experience.map((x, i) => (
              <li key={x.name} className={a.tr}>
                <span className={a.n}>{String(i + 1).padStart(2, '0')}</span>
                <span className={a.company}>{x.name}</span>
                <span className={a.cell}>{x.role}</span>
                <span className={a.cell}>{x.how}</span>
                <span className={`${a.cell} ${a.right}`}>{x.years}</span>
              </li>
            ))}
          </ol>
        </div>
      </V0Section>

      <V0Section label="Dossier para agencias ↘">
        <p className={v.mono}>PDF con casos, formas de trabajo y disponibilidad. <Pending>dossier</Pending></p>
      </V0Section>

      <div className={v.closing}>
        <ContactBlock />
      </div>
    </div>
  )
}
