'use client'

import { useInView } from '@/hooks/useInView'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import s from './AboutContent.module.scss'

// ─── Reusable scroll-reveal wrapper ──────────────────────────────────────────────
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.1 })

  return (
    <div
      ref={ref}
      className={`${s.reveal} ${inView ? s.revealVisible : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

// ─── Word-by-word scroll reveal for large body text ──────────────────────────────
function RevealWords({
  children,
  className = '',
  highlightWords = [] as string[],
}: {
  children: string
  className?: string
  highlightWords?: string[]
}) {
  const { ref, inView } = useInView<HTMLParagraphElement>({ threshold: 0.1 })
  const words = children.split(/(\s+)/)

  // Build set of highlight words (lowercased) for matching
  const hlSet = new Set(highlightWords.map(w => w.toLowerCase()))

  let wordIdx = 0
  return (
    <p ref={ref} className={`${s.revealWords} ${inView ? s.revealWordsVisible : ''} ${className}`}>
      {words.map((w, i) => {
        if (/^\s+$/.test(w)) return <span key={i}>{w}</span>
        const idx = wordIdx++
        const isHl = hlSet.has(w.toLowerCase().replace(/[.,;:—–-]/g, ''))
        return (
          <span
            key={i}
            className={`${s.rw} ${isHl ? s.rwHl : ''}`}
            style={{ transitionDelay: `${idx * 25}ms` }}
          >
            {w}
          </span>
        )
      })}
    </p>
  )
}

// ─── Services data (from Figma) ──────────────────────────────────────────────────
const SERVICES = [
  {
    title: 'Dirección Creativa & Arte',
    desc: 'Defino la línea visual y conceptual de cada proyecto, asegurando coherencia y una narrativa clara a través de todos los puntos de contacto.',
    tags: [
      { text: 'Art direction · Visual direction · Concept development', color: '#ddedff' },
      { text: 'Visual systems · Creative guidance', color: '#ddedff' },
    ],
  },
  {
    title: 'Producto Digital',
    desc: 'Diseño interfaces y experiencias centradas en el usuario, conectando negocio, tecnología y diseño en productos que funcionan.',
    tags: [
      { text: 'UI design · Interaction design · Product thinking', color: '#8df8cd' },
      { text: 'Prototyping · User flows · Design systems', color: '#8df8cd' },
    ],
  },
  {
    title: 'Branding',
    desc: 'Creo identidades visuales que comunican con claridad, construyen reconocimiento y escalan con el crecimiento de la marca.',
    tags: [
      { text: 'Brand identity · Rebranding · Logo design', color: '#ddedff' },
      { text: 'Visual identity · Brand systems · Guidelines', color: '#ddedff' },
    ],
  },
  {
    title: 'Desarrollo web',
    desc: 'Colaboro en la implementación frontend para asegurar que el resultado final respeta la intención del diseño en cada detalle.',
    tags: [
      { text: 'Frontend collaboration · Web implementation · Framer', color: '#ddedff' },
      { text: 'CMS · Developer handoff · QA visual', color: '#ddedff' },
    ],
  },
]

// ─── Process data (from Figma) ───────────────────────────────────────────────────
const PROCESS = [
  { num: '01', title: 'Descubrimiento', arrow: '→', desc: 'Entiendo el contexto, las necesidades y los objetivos antes de proponer nada. Escucho, analizo y pregunto.' },
  { num: '02', title: 'Ideación', arrow: '→', desc: 'Exploro múltiples direcciones visuales y conceptuales. Es el momento de pensar en abierto, sin filtros.' },
  { num: '03', title: 'Conceptualización', arrow: '→', desc: 'Selecciono y refino las ideas más fuertes. Defino la línea visual, el tono y la estructura del proyecto.' },
  { num: '04', title: 'Colaboración', arrow: '→', desc: 'Trabajo codo con codo con equipos de desarrollo, estrategia y contenido. El diseño no vive aislado.' },
  { num: '05', title: 'Desarrollo', arrow: '→', desc: 'Llevo el diseño a producción. Superviso la implementación para asegurar que cada detalle se respeta.' },
  { num: '06', title: 'Entrega', arrow: '→', desc: 'Presento el resultado final, documentado y listo para escalar. El trabajo no termina: itero si es necesario.' },
]

// ─── Studios & Agencies ──────────────────────────────────────────────────────────
const STUDIOS = [
  'Accenture Song', 'Fjord', 'Hanzo', 'Onestic', 'Redbility',
  'The Cocktail', 'VML KingClient', 'Wildbytes',
]

// ─── Clients ─────────────────────────────────────────────────────────────────────
const CLIENTS = [
  'Acciona', 'Bankia', 'BBVA', 'Cepsa', 'Coca-Cola', 'Google',
  'Iberdrola', 'La Liga', 'Moto GP', 'Naturgy', 'NH Hotels',
  'Repsol', 'Securitas Direct', 'Telefónica', 'Vodafone',
]

// ─── Side Projects ───────────────────────────────────────────────────────────────
const SIDE_PROJECTS = [
  'Drip', 'Foodeat', 'Signflow', 'Educaprojects', 'Likitech',
  '15 Bodegas', 'Securitas Direct', 'Entradium', 'Awen',
  'Push for Burger', 'Uno de 50', 'Evax', 'Bonamar', 'Dinamo', 'Ereare',
]

// ─── Component ───────────────────────────────────────────────────────────────────
export default function AboutContent() {
  return (
    <div className={s.page}>
      {/* ── Hero identifier ─────────────────────────────────────────────────── */}
      <Reveal className={s.hero}>
        <div className={s.heroRow}>
          <span className={s.heroName}>Juan C. Fresno</span>
          <span className={s.heroRole}>Independent Art Director & Digital Designer</span>
        </div>
        <ElasticLine className={s.divider} />
      </Reveal>

      {/* ── Bio — large text with highlighted words ─────────────────────────── */}
      <section className={s.bio}>
        <RevealWords
          className={s.bioText}
          highlightWords={['2012', 'Art', 'Director', 'Digital', 'Designer', 'Valencia', 'Spain']}
        >
          Trabajo de forma independiente desde 2012 como Art Director y Digital Designer. Colaboro con marcas, agencias y equipos en proyectos digitales de distinta escala — desde Valencia, Spain.
        </RevealWords>
        <RevealWords
          className={s.bioText}
          highlightWords={['interacción', 'productos', 'digitales', 'propósito']}
        >
          Me enfoco en definir líneas visuales claras, cuidar la interacción y construir productos digitales que no solo se vean bien, sino que funcionen con propósito.
        </RevealWords>
      </section>

      {/* ── Portrait placeholder ────────────────────────────────────────────── */}
      <Reveal className={s.portraitWrap}>
        <div className={s.portrait} />
      </Reveal>

      {/* ── Servicios ───────────────────────────────────────────────────────── */}
      <section className={s.section}>
        <Reveal>
          <span className={s.sectionLabel}>{'{ servicios }'}</span>
        </Reveal>

        <div className={s.servicesList}>
          {SERVICES.map((srv, i) => (
            <Reveal key={i} className={s.serviceItem} delay={i * 60}>
              <h3 className={s.serviceTitle}>{srv.title}</h3>
              <p className={s.serviceDesc}>{srv.desc}</p>
              <div className={s.serviceTags}>
                {srv.tags.map((tag, t) => (
                  <span key={t} className={s.serviceTag} style={{ color: tag.color }}>
                    {tag.text}
                  </span>
                ))}
              </div>
              <ElasticLine className={s.divider} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Proceso Creativo ────────────────────────────────────────────────── */}
      <section className={s.section}>
        <Reveal>
          <span className={s.sectionLabel}>{'{ proceso creativo }'}</span>
        </Reveal>

        <div className={s.processList}>
          {PROCESS.map((step, i) => (
            <Reveal key={i} className={s.processItem} delay={i * 50}>
              <div className={s.processHeader}>
                <span className={s.processNum}>{`{${step.num}}`}</span>
                <span className={s.processTitle}>
                  {step.title} <span className={s.processArrow}>{step.arrow}</span>
                </span>
              </div>
              <p className={s.processDesc}>{step.desc}</p>
              <ElasticLine className={s.divider} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Estudios & Agencias ─────────────────────────────────────────────── */}
      <section className={s.section}>
        <Reveal>
          <span className={s.sectionLabel}>{'{ Estudios — agencias }'}</span>
        </Reveal>
        <Reveal className={s.namesList}>
          {STUDIOS.map(name => (
            <span key={name} className={s.nameItem}>{name}</span>
          ))}
        </Reveal>
        <ElasticLine className={s.divider} />
      </section>

      {/* ── Clientes ────────────────────────────────────────────────────────── */}
      <section className={s.section}>
        <Reveal>
          <span className={s.sectionLabel}>{'{ Clientes }'}</span>
        </Reveal>
        <Reveal className={s.namesList}>
          {CLIENTS.map(name => (
            <span key={name} className={s.nameItem}>{name}</span>
          ))}
        </Reveal>
        <ElasticLine className={s.divider} />
      </section>

      {/* ── Side Projects ───────────────────────────────────────────────────── */}
      <section className={s.section}>
        <Reveal>
          <span className={s.sectionLabel}>{'{ side projects }'}</span>
        </Reveal>
        <Reveal className={s.projectsGrid}>
          {SIDE_PROJECTS.map(name => (
            <span key={name} className={s.projectItem}>{name}</span>
          ))}
        </Reveal>
      </section>
    </div>
  )
}
