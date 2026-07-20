'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import s from './GlitchSocialLink.module.scss'

// ─── Scramble character pool (same as Nav/HeroIntro) ─────────────────────────
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%?'
const SCRAMBLE_MS = 420

type Phase = 'idle' | 'scrambling' | 'resolved'

interface Props {
  href: string
  label: string
  letter: string
  color: string
  width: number
  height: number
  logo: ReactNode
}

// ─── GlitchSocialLink — scrambles to a single brand-colored glyph on hover ───
// Shared by all four social logos; each instance just supplies its own
// resolved letter + brand color.
export default function GlitchSocialLink({ href, label, letter, color, width, height, logo }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [display, setDisplay] = useState(label)
  const rafRef = useRef<number>(undefined)
  const t0Ref = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    t0Ref.current = null
  }, [])

  const handleEnter = useCallback(() => {
    stop()
    setPhase('scrambling')

    const frame = (ts: number) => {
      if (!t0Ref.current) t0Ref.current = ts
      const elapsed = ts - t0Ref.current

      if (elapsed >= SCRAMBLE_MS) {
        setPhase('resolved')
        return
      }

      setDisplay(
        label
          .split('')
          .map((ch) => (ch === ' ' ? ' ' : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]))
          .join('')
      )
      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
  }, [label, stop])

  const handleLeave = useCallback(() => {
    stop()
    setPhase('idle')
    setDisplay(label)
  }, [label, stop])

  useEffect(() => stop, [stop])

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={s.link}
      aria-label={label}
      style={{ width, height, '--brand-color': color } as CSSProperties}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      <span className={`${s.layer} ${s.logo} ${phase === 'idle' ? s.visible : ''}`} aria-hidden="true">
        {logo}
      </span>
      <span className={`${s.layer} ${s.scramble} ${phase === 'scrambling' ? s.visible : ''}`} aria-hidden="true">
        {display}
      </span>
      <span className={`${s.layer} ${s.letter} ${phase === 'resolved' ? s.visible : ''}`} aria-hidden="true">
        {letter}
      </span>
    </a>
  )
}
