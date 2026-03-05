'use client'

import { useEffect, useRef, useState } from 'react'
import { usePageTransition } from '@/providers/PageTransition'
import s from './ProjectsGallery.module.scss'

// ─── Project data — 9 items, rotating colors ─────────────────────────────────────
const COLORS = ['#003dff', '#D5F936', '#8DF8CD', '#FFFFE6']

const PROJECTS = [
  { slug: 'brand-identity-01',   title: 'Brand Identity',     client: 'Acciona',            color: COLORS[0] },
  { slug: 'digital-product-02',  title: 'Digital Product',     client: 'BBVA',               color: COLORS[1] },
  { slug: 'web-experience-03',   title: 'Web Experience',      client: 'Coca-Cola',          color: COLORS[2] },
  { slug: 'art-direction-04',    title: 'Art Direction',       client: 'Google',             color: COLORS[3] },
  { slug: 'visual-system-05',    title: 'Visual System',       client: 'Iberdrola',          color: COLORS[0] },
  { slug: 'interaction-06',      title: 'Interaction Design',  client: 'La Liga',            color: COLORS[1] },
  { slug: 'campaign-07',         title: 'Campaign',            client: 'Telefónica',         color: COLORS[2] },
  { slug: 'product-design-08',   title: 'Product Design',      client: 'Repsol',             color: COLORS[3] },
  { slug: 'creative-direction-09', title: 'Creative Direction', client: 'Vodafone',          color: COLORS[0] },
]

// ─── Component ───────────────────────────────────────────────────────────────────
export default function ProjectsGallery() {
  const { navigate } = usePageTransition()
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [translateX, setTranslateX] = useState(0)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // ── Calculate & apply horizontal scroll from vertical scroll position ────────
  useEffect(() => {
    const container = containerRef.current
    const track = trackRef.current
    if (!container || !track) return

    const handleScroll = () => {
      const rect = container.getBoundingClientRect()
      const containerTop = -rect.top
      const containerHeight = container.scrollHeight - window.innerHeight

      if (containerHeight <= 0) return

      const progress = Math.max(0, Math.min(containerTop / containerHeight, 1))
      const trackWidth = track.scrollWidth
      const viewportWidth = window.innerWidth
      const maxTranslate = trackWidth - viewportWidth + 80 // 80px end padding

      setTranslateX(-progress * maxTranslate)
    }

    // Listen on window scroll (Lenis drives this)
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // initial calc
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      className={s.container}
      ref={containerRef}
      // Height creates the scroll distance
      // 9 cards × ~480px = ~4320px total. Need ~3000px of scroll.
      style={{ height: 'calc(300vh)' }}
    >
      {/* Sticky viewport — stays in place while we scroll through container */}
      <div className={s.sticky}>
        {/* Horizontal track */}
        <div
          className={s.track}
          ref={trackRef}
          style={{ transform: `translateX(${translateX}px)` }}
        >
          {PROJECTS.map((project, i) => (
            <a
              key={project.slug}
              href={`/projects/${project.slug}`}
              className={s.card}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey) return
                e.preventDefault()
                navigate(`/projects/${project.slug}`)
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                // Subtle vertical offset — alternating heights for rhythm
                alignSelf: i % 2 === 0 ? 'flex-end' : 'center',
              }}
            >
              {/* Color placeholder (future: video) */}
              <div
                className={s.cardMedia}
                style={{
                  backgroundColor: project.color,
                  // Slight scale on hover
                  transform: hoveredIdx === i ? 'scale(1.02)' : 'scale(1)',
                }}
              />
              {/* Project info */}
              <div className={s.cardInfo}>
                <span className={s.cardClient}>{project.client}</span>
                <span className={s.cardTitle}>{project.title}</span>
              </div>
            </a>
          ))}
        </div>

        {/* Page title overlay — bottom left */}
        <div className={s.pageTitle}>
          <span className={s.pageTitleLabel}>{'{ proyectos }'}</span>
          <span className={s.pageTitleCount}>{`${String(PROJECTS.length).padStart(2, '0')} cases`}</span>
        </div>
      </div>
    </div>
  )
}
