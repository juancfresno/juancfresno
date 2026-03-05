'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import s from './HeroCategories.module.scss'

// ─── Category items from Figma node 6256:606 ────────────────────────────────────
const CATEGORIES = [
  'Art direction',
  'Visual Design',
  'Interaction Design',
  'Brand Identity',
  'Things.',
]

// ─── Scramble character pool (same as Nav) ───────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%?'

// ─── ScrambleCategory — each skill scrambles in from random chars ────────────────
// Three-layer VHS glitch wrapper shares the same scrambled text across all layers.
function ScrambleCategory({
  text,
  active,
  delay,
  onMouseEnter,
  onMouseLeave,
}: {
  text: string
  active: boolean
  delay: number
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const [display, setDisplay] = useState('')
  const [visible, setVisible] = useState(false) // controls CSS opacity
  const rafRef = useRef<number>(undefined)
  const t0Ref = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!active) return

    // Wait for stagger delay, then start scramble
    timerRef.current = setTimeout(() => {
      setVisible(true) // fade in the element

      const DURATION = 650 // ms — a bit slower than nav for dramatic effect

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
              return CHARS[Math.floor(Math.random() * CHARS.length)]
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
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active, delay, text])

  return (
    <span
      className={`${s.category} ${visible ? s.categoryVisible : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className={s.glWrap}>
        {/* Canal B — desplaza izquierda con clip-path */}
        <span className={`${s.glLayer} ${s.glB}`} aria-hidden="true">
          {display || '\u00A0'}
        </span>
        {/* Canal R — desplaza derecha con clip-path */}
        <span className={`${s.glLayer} ${s.glR}`} aria-hidden="true">
          {display || '\u00A0'}
        </span>
        {/* Capa principal — shake + flicker */}
        <span className={`${s.glLayer} ${s.glMain}`}>
          {display || '\u00A0'}
        </span>
      </span>
    </span>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────────
export default function HeroCategories() {
  const placeholderRef = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [hovered, setHovered] = useState(false)

  // ── Reveal after HeroIntro finishes (~3.5s from page load) ────────────────────
  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 3500)
    return () => clearTimeout(id)
  }, [])

  // ── Subtle mouse parallax on the video placeholder ─────────────────────────────
  useEffect(() => {
    const el = placeholderRef.current
    if (!el) return

    let rafId: number
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const handleMove = (e: MouseEvent) => {
      const { innerWidth: w, innerHeight: h } = window
      targetX = (e.clientX / w - 0.5) * -14
      targetY = (e.clientY / h - 0.5) * -10
    }

    const tick = () => {
      currentX = lerp(currentX, targetX, 0.06)
      currentY = lerp(currentY, targetY, 0.06)
      el.style.transform = `translate(${currentX}px, ${currentY}px)`
      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', handleMove)
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  const handleEnter = useCallback(() => setHovered(true), [])
  const handleLeave = useCallback(() => setHovered(false), [])

  return (
    <section className={s.section}>
      {/* ── Categories line ─────────────────────────────────────────────────────── */}
      <p className={s.categories}>
        {CATEGORIES.map((cat, i) => (
          <span key={cat} className={s.catWrap}>
            {i > 0 && (
              <span
                className={`${s.dash} ${revealed ? s.dashVisible : ''}`}
                style={{ transitionDelay: `${i * 120}ms` }}
                aria-hidden="true"
              >
                {' — '}
              </span>
            )}
            <ScrambleCategory
              text={cat}
              active={revealed}
              delay={i * 120} // stagger: 120ms between each category
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            />
          </span>
        ))}
      </p>

      {/* ── Video placeholder — #003DFF — only visible on hover ───────────────── */}
      <div
        className={`${s.placeholder} ${hovered ? s.placeholderVisible : ''}`}
        ref={placeholderRef}
      />
    </section>
  )
}
