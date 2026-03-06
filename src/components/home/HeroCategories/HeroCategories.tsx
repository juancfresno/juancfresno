'use client'

import { useEffect, useRef, useState } from 'react'
import s from './HeroCategories.module.scss'

// ─── Category items from Figma node 6235-511 ────────────────────────────────
const CATEGORIES = [
  'Art direction',
  'Visual Design',
  'Interaction',
  'Brand Identity',
  'Strategy',
  'Develop',
]

// ─── Scramble character pool (same as Nav) ───────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%?'

// ─── ScrambleCategory — each skill scrambles in from random chars ────────────
// Three-layer VHS glitch wrapper shares the same scrambled text across all layers.
function ScrambleCategory({
  text,
  active,
  delay,
}: {
  text: string
  active: boolean
  delay: number
}) {
  const [display, setDisplay] = useState('')
  const [visible, setVisible] = useState(false)
  const rafRef = useRef<number>(undefined)
  const t0Ref = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!active) return

    timerRef.current = setTimeout(() => {
      setVisible(true)

      const DURATION = 650

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
    <span className={`${s.category} ${visible ? s.categoryVisible : ''}`}>
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

// ─── Props ────────────────────────────────────────────────────────────────────
interface HeroCategoriesProps {
  onCategoryHover?: (index: number | null) => void
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function HeroCategories({ onCategoryHover }: HeroCategoriesProps) {
  const [revealed, setRevealed] = useState(false)

  // ── Reveal after HeroIntro finishes (~3.5s from page load) ─────────────────
  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 3500)
    return () => clearTimeout(id)
  }, [])

  return (
    <section className={s.section}>
      <p className={s.categories}>
        {CATEGORIES.map((cat, i) => (
          <span
            key={cat}
            className={s.catWrap}
            onMouseEnter={() => onCategoryHover?.(i)}
            onMouseLeave={() => onCategoryHover?.(null)}
          >
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
              delay={i * 120}
            />
          </span>
        ))}
      </p>
    </section>
  )
}
