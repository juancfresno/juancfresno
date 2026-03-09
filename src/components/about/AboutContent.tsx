'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useInView } from '@/hooks/useInView'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import s from './AboutContent.module.scss'

// =============================================================================
// Bio text constants (used for typewriter + glow overlay)
// =============================================================================
const BIO_BRIGHT =
  'Desde 2012 trabajo de forma independiente como Art Director & Digital Designer, colaborando con marcas, agencias y equipos en proyectos digitales de distinta escala. '
const BIO_MEDIUM =
  'Trabajo desde Valencia, Espana, adaptandome a diferentes contextos, ritmos y formas de trabajo, tanto con clientes pequenos como con grandes organizaciones. '
const BIO_DARK =
  'Mi foco esta en definir lineas visuales claras, cuidar la interaccion y construir productos digitales que no solo se vean bien, sino que funcionen con sentido.'

const FULL_BIO_LEN = BIO_BRIGHT.length + BIO_MEDIUM.length + BIO_DARK.length

// =============================================================================
// Scramble text hook (glitch effect — same as Nav)
// =============================================================================
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%?'

function useScramble(text: string, active: boolean): string {
  const [display, setDisplay] = useState(text)
  const rafRef = useRef<number>(undefined)
  const t0Ref = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      t0Ref.current = null
      setDisplay(text)
      return
    }

    const DURATION = 420

    const frame = (ts: number) => {
      if (!t0Ref.current) t0Ref.current = ts
      const elapsed = ts - t0Ref.current
      const progress = Math.min(elapsed / DURATION, 1)
      const resolved = Math.floor(progress * text.length)

      setDisplay(
        text
          .split('')
          .map((ch, i) => {
            if (ch === ' ') return ' '
            if (i < resolved) return ch
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
          })
          .join('')
      )

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        setDisplay(text)
        t0Ref.current = null
      }
    }

    t0Ref.current = null
    rafRef.current = requestAnimationFrame(frame)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active, text])

  return display
}

// =============================================================================
// Reusable scroll-reveal wrapper
// =============================================================================
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

// =============================================================================
// Pixel Art Character (CSS grid of tiny colored rectangles)
// =============================================================================
// 5 columns x ~17 rows, each cell is 3x3px
// Colors: skin=#ffc9a9, dark=#272727, eyes=#997865, white=#ffffff, gray=#d8d8d8, black=#000000, transparent
type C = string | null
const _  = null       // transparent
const SK = '#ffc9a9'  // skin
const DK = '#272727'  // dark / hair
const EY = '#997865'  // eyes
const WH = '#ffffff'  // white body
const GR = '#d8d8d8'  // gray body
const BK = '#000000'  // black outlines

const PIXEL_GRID: C[][] = [
  [_,  DK, DK, DK, _],   // hair top
  [DK, DK, DK, DK, DK],  // hair
  [DK, SK, SK, SK, DK],   // forehead
  [SK, EY, SK, EY, SK],   // eyes
  [_,  SK, SK, SK, _],    // nose
  [_,  SK, SK, SK, _],    // mouth
  [_,  _,  BK, _,  _],    // neck
  [BK, WH, WH, WH, BK],  // body top
  [BK, WH, WH, WH, BK],  // body
  [BK, WH, GR, WH, BK],  // body mid
  [BK, WH, GR, WH, BK],  // body
  [BK, GR, GR, GR, BK],  // body lower
  [_,  BK, BK, BK, _],    // belt
  [BK, DK, _,  DK, BK],   // legs
  [BK, DK, _,  DK, BK],   // legs
  [DK, DK, _,  DK, DK],   // feet
]

function PixelCharacter() {
  return (
    <div className={s.pixelCharacter} aria-hidden="true">
      {PIXEL_GRID.map((row, y) => (
        <div key={y} className={s.pixelRow}>
          {row.map((color, x) => (
            <span
              key={x}
              className={s.px}
              style={color ? { backgroundColor: color } : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Services data
// =============================================================================
const SERVICES = [
  {
    title: 'Direccion Creativa & Arte',
    desc: 'Defino la direccion visual de marcas y productos digitales, estableciendo un criterio claro y coherente desde el concepto hasta la ejecucion.',
    tags: 'Art direction \u00b7 Visual direction \u00b7 Concept development \u00b7 Visual systems \u00b7 Creative guidance',
  },
  {
    title: 'Producto Digital',
    desc: 'Diseno productos y experiencias digitales claras, funcionales y bien pensadas, cuidando tanto la estructura como la interaccion y el detalle visual.',
    tags: 'UI design \u00b7 Interaction design \u00b7 Product thinking \u00b7 Prototyping \u00b7 User flows \u00b7 Design systems',
  },
  {
    title: 'Branding',
    desc: 'Creo y desarrollo identidades visuales solidas que funcionan en contextos digitales y se adaptan a distintos formatos y necesidades.',
    tags: 'Brand identity \u00b7 Rebranding \u00b7 Logo design \u00b7 Visual identity \u00b7 Brand systems \u00b7 Guidelines',
  },
  {
    title: 'Desarrollo web',
    desc: 'Desarrollo webs funcionales y bien ejecutadas, colaborando con perfiles tecnicos para llevar el diseno a produccion con fidelidad y calidad.',
    tags: 'Frontend collaboration \u00b7 Web implementation \u00b7 Framer \u00b7 CMS \u00b7 Developer handoff \u00b7 QA visual',
  },
]

// =============================================================================
// Process data
// =============================================================================
const PROCESS = [
  { num: '01', title: 'Descubrimiento', desc: 'Entiendo el contexto, las necesidades y los objetivos antes de proponer nada. Escucho, analizo y pregunto.' },
  { num: '02', title: 'Ideacion', desc: 'Exploro multiples direcciones visuales y conceptuales. Es el momento de pensar en abierto, sin filtros.' },
  { num: '03', title: 'Conceptualizacion', desc: 'Selecciono y refino las ideas mas fuertes. Defino la linea visual, el tono y la estructura del proyecto.' },
  { num: '04', title: 'Colaboracion', desc: 'Trabajo codo con codo con equipos de desarrollo, estrategia y contenido. El diseno no vive aislado.' },
  { num: '05', title: 'Desarrollo', desc: 'Llevo el diseno a produccion. Superviso la implementacion para asegurar que cada detalle se respeta.' },
  { num: '06', title: 'Entrega', desc: 'Presento el resultado final, documentado y listo para escalar. El trabajo no termina: itero si es necesario.' },
]

// =============================================================================
// FRESNO SVG wordmark
// =============================================================================
function FresnoLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1340 201"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="FRESNO"
    >
      <path
        d="M0 199V2h200.5v36.5H45.5V88h134v36H45.5v75H0Z
           M258 199V2h134.5c43 0 72 27 72 67.5S435.5 137 392.5 137H303.5v62H258Zm45.5-98h86c20 0 33-14 33-33.5S409.5 34 389.5 34H303.5v67Z
           M520 199V2h200v36.5H565.5V88h134v36H565.5v38.5H720V199H520Z
           M778 144.5c14.5 18 39 30 66 30 30 0 50-14 50-35.5 0-23-17-32-52-41-45-11.5-78-28-78-73C764 9 795-1 836.5-1c35 0 62 12 81 32l-28 28c-15-15-33-24-55-24-26 0-41 12-41 30 0 20 15 28 50 37.5 47 12.5 80 29 80 76 0 23-22 52-53 52h-1c-1 0-1 0 0 0h1c-34 0-62-5.5-89-30l-3.5-3Z
           M1000 199V2h45l155 140V2h44v197h-40L1044 55v144h-44Z
           M1340 100.5C1340 46 1297 0 1240 0c-57 0-100 46-100 100.5S1183 201 1240 201c57 0 100-46 100-100.5Zm-155 0c0-32 24-63 55-63s55 31 55 63-24 63.5-55 63.5-55-31.5-55-63.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

// =============================================================================
// Service item with scramble title + green divider
// =============================================================================
function ServiceItem({
  title,
  desc,
  tags,
  onMouseEnter,
}: {
  title: string
  desc: string
  tags: string
  onMouseEnter: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const scrambled = useScramble(title, hovered)

  return (
    <div
      className={s.serviceItem}
      onMouseEnter={() => {
        setHovered(true)
        onMouseEnter()
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <h3 className={s.serviceTitle}>{scrambled}</h3>
      <p className={s.serviceDesc}>{desc}</p>
      <div className={s.serviceTags}>
        <span className={s.serviceTagText}>{tags}</span>
        <span className={s.serviceTagFill}>{tags}</span>
      </div>
      <div className={s.serviceDivider} />
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================
export default function AboutContent() {
  // ---- Bio: intersection observer (reuse bioRef) ----
  const bioRef = useRef<HTMLDivElement>(null)
  const [bioInView, setBioInView] = useState(false)

  useEffect(() => {
    const el = bioRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBioInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // ---- Bio: typewriter ----
  const [typedLength, setTypedLength] = useState(0)
  const [typingDone, setTypingDone] = useState(false)
  const [restVisible, setRestVisible] = useState(false)

  useEffect(() => {
    if (!bioInView || typingDone) return

    const CHAR_MS = 14 // ms per character
    let start: number | null = null
    let raf: number

    const frame = (ts: number) => {
      if (!start) start = ts
      const chars = Math.min(
        Math.floor((ts - start) / CHAR_MS),
        FULL_BIO_LEN
      )
      setTypedLength(chars)

      if (chars < FULL_BIO_LEN) {
        raf = requestAnimationFrame(frame)
      } else {
        setTypingDone(true)
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [bioInView, typingDone])

  // Fade in rest after typing
  useEffect(() => {
    if (!typingDone) return
    const timer = setTimeout(() => setRestVisible(true), 200)
    return () => clearTimeout(timer)
  }, [typingDone])

  // ---- Bio glow effect (mouse follow) ----
  const handleBioMouseMove = useCallback((e: React.MouseEvent) => {
    const el = bioRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    el.style.setProperty('--glow-x', `${x}px`)
    el.style.setProperty('--glow-y', `${y}px`)
  }, [])

  // ---- Services hover (image pixelation) ----
  const [activeService, setActiveService] = useState<number | null>(null)
  const [imagePixelating, setImagePixelating] = useState(false)
  const pixelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleServiceHover = useCallback((index: number) => {
    if (activeService !== null && activeService !== index) {
      // Trigger pixelation effect
      setImagePixelating(true)
      if (pixelTimeoutRef.current) clearTimeout(pixelTimeoutRef.current)
      pixelTimeoutRef.current = setTimeout(() => {
        setImagePixelating(false)
      }, 400)
    }
    setActiveService(index)
  }, [activeService])

  const handleServiceLeave = useCallback(() => {
    setActiveService(null)
  }, [])

  // ---- Process section: scroll-based indent + active state ----
  const processListRef = useRef<HTMLDivElement>(null)
  const [activeProcess, setActiveProcess] = useState<number | null>(null)
  const [indentedItems, setIndentedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    const container = processListRef.current
    if (!container) return

    const items = container.querySelectorAll('[data-process-item]')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute('data-process-item'))
          if (isNaN(idx)) return

          setIndentedItems((prev) => {
            const next = new Set(prev)
            if (entry.isIntersecting) {
              next.add(idx)
            }
            return next
          })
        })
      },
      {
        threshold: 0.5,
        rootMargin: '-20% 0px -20% 0px',
      }
    )

    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [])

  // ---- FRESNO logo reveal ----
  const { ref: logoRef, inView: logoInView } = useInView<HTMLDivElement>({
    threshold: 0.2,
  })

  // ---- Bio typewriter: per-span visible chars ----
  const brightChars = Math.min(typedLength, BIO_BRIGHT.length)
  const mediumChars = Math.min(
    Math.max(typedLength - BIO_BRIGHT.length, 0),
    BIO_MEDIUM.length
  )
  const darkChars = Math.min(
    Math.max(typedLength - BIO_BRIGHT.length - BIO_MEDIUM.length, 0),
    BIO_DARK.length
  )
  const cursorSpan =
    typedLength <= BIO_BRIGHT.length
      ? 'bright'
      : typedLength <= BIO_BRIGHT.length + BIO_MEDIUM.length
        ? 'medium'
        : 'dark'

  return (
    <div className={s.page}>
      {/* ================================================================== */}
      {/* 1. HEADER                                                         */}
      {/* ================================================================== */}
      <Reveal className={s.header}>
        <div className={s.headerLeft}>
          <span className={s.headerName}>Juan C. Fresno</span>
          <span className={s.headerRole}>
            Independent Designer &mdash; Art Direction, Brand, Interactive
          </span>
        </div>
        <div className={s.pixelFlip}>
          <PixelCharacter />
        </div>
      </Reveal>

      <ElasticLine className={s.divider} />

      {/* ================================================================== */}
      {/* 2. BIO TEXT — typewriter + text-masked glow                        */}
      {/* ================================================================== */}
      <section className={s.bio}>
        <div
          ref={bioRef}
          className={s.bioInner}
          onMouseMove={handleBioMouseMove}
        >
          <p className={s.bioText}>
            <span className={s.bioBright}>
              {BIO_BRIGHT.substring(0, brightChars)}
              {!typingDone && bioInView && cursorSpan === 'bright' && (
                <span className={s.bioCursor} />
              )}
            </span>
            <span className={s.bioMedium}>
              {BIO_MEDIUM.substring(0, mediumChars)}
              {!typingDone && bioInView && cursorSpan === 'medium' && (
                <span className={s.bioCursor} />
              )}
            </span>
            <span className={s.bioDark}>
              {BIO_DARK.substring(0, darkChars)}
              {!typingDone && bioInView && cursorSpan === 'dark' && (
                <span className={s.bioCursor} />
              )}
            </span>
          </p>

          {/* Glow overlay — same text, gradient clipped to text shape */}
          {restVisible && (
            <p className={s.bioTextGlow} aria-hidden="true">
              <span>{BIO_BRIGHT}</span>
              <span>{BIO_MEDIUM}</span>
              <span>{BIO_DARK}</span>
            </p>
          )}
        </div>
      </section>

      <div className={`${s.afterBio} ${typingDone ? s.afterBioVisible : ''}`}>
      {/* ================================================================== */}
      {/* 3. SERVICES                                                       */}
      {/* ================================================================== */}
      <section className={s.servicesSection}>
        <Reveal>
          <span className={s.sectionLabel}>{'{ servicios \u2198'}</span>
        </Reveal>

        <div className={s.servicesLayout}>
          {/* Left: service items */}
          <div
            className={s.servicesList}
            onMouseLeave={handleServiceLeave}
          >
            {SERVICES.map((srv, i) => (
              <Reveal key={i} delay={i * 60}>
                <ServiceItem
                  title={srv.title}
                  desc={srv.desc}
                  tags={srv.tags}
                  onMouseEnter={() => handleServiceHover(i)}
                />
              </Reveal>
            ))}
          </div>

          {/* Right: image */}
          <Reveal className={s.servicesImageWrap} delay={200}>
            <Image
              src="/images/about-services.jpg"
              alt="Workspace"
              width={565}
              height={377}
              className={`${s.servicesImage} ${imagePixelating ? s.servicesImagePixelating : ''}`}
              priority
            />
          </Reveal>
        </div>
      </section>

      {/* ================================================================== */}
      {/* 4. PROCESO CREATIVO                                               */}
      {/* ================================================================== */}
      <section className={s.processSection}>
        <Reveal>
          <span className={s.processLabel}>{'{ proceso creativo \u2198'}</span>
        </Reveal>

        <div ref={processListRef} className={s.processList}>
          {PROCESS.map((step, i) => (
            <div
              key={i}
              data-process-item={i}
              className={`
                ${s.processItem}
                ${indentedItems.has(i) ? s.processItemIndented : ''}
                ${activeProcess === i ? s.processItemActive : ''}
              `}
              onMouseEnter={() => setActiveProcess(i)}
              onMouseLeave={() => setActiveProcess(null)}
            >
              <div className={s.processRow}>
                <div className={s.processLeft}>
                  <span className={s.processNum}>{`{${step.num}}`}</span>
                  <span className={s.processTitle}>{step.title}</span>
                </div>
                <div className={s.processRight}>
                  <p className={s.processDesc}>{step.desc}</p>
                </div>
              </div>
              <div className={s.processDivider} />
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================== */}
      {/* 5. ESTUDIOS & CLIENTES                                            */}
      {/* ================================================================== */}
      <section className={s.clientsSection}>
        <Reveal>
          <div className={s.clientsBlock}>
            <span className={s.clientsLabel}>{'{ Estudios \u2014 agencias \u2198'}</span>
            <p className={s.clientsText}>
              Invisible Geeks, Accenture Song, Fjord, Hanzo, VML KingeClient,
              Wildbytes entre otros.
            </p>
          </div>
        </Reveal>

        <ElasticLine className={s.divider} />

        <Reveal>
          <div className={s.clientsBlock}>
            <span className={s.clientsLabel}>{'{ Clientes \u2198'}</span>
            <p className={s.clientsText}>
              Acciona, Bankia, BBVA, Cepsa, Cinces Capitol, Coca-Cola, Correos,
              Google, Iberdrola, La Liga, Moto GP, Movistar, Orange, Pull &amp;
              Bear, Real Madrid C.F. , Room Mate Hotels, Standard Chartered,
              Uno de 50, Sephora, Burger King, Melia entre otros.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ================================================================== */}
      {/* 6. FRESNO LOGO                                                    */}
      {/* ================================================================== */}
      <section className={s.logoSection}>
        <div
          ref={logoRef}
          className={`${s.logoWrap} ${s.logoMask} ${logoInView ? s.logoMaskRevealed : ''}`}
        >
          <FresnoLogo className={s.logoSvg} />
        </div>
      </section>
      </div>{/* /afterBio */}
    </div>
  )
}
