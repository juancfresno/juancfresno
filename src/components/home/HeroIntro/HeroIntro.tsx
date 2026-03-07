'use client'

import { useEffect, useRef, useState } from 'react'
import s from './HeroIntro.module.scss'

const NAME = 'Juan C. Fresno'
const SUBTITLE = 'Independent Designer — Art Direction, Brand, Interactive'
const YEAR = '2012 — 2026'

const chars = (text: string) => [...text]
const words = (text: string) => text.match(/\S+\s?/g) || []

const CHAR_SPEED = 35
const WORD_SPEED_SUB = 55

// ─── Scramble character pool (same as Nav) ──────────────────────────────────
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%?'

// ─── useScrambleOnHover — scrambles text and resolves left-to-right on hover ─
function useScrambleOnHover(text: string): {
  display: string
  hovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
} {
  const [display, setDisplay] = useState(text)
  const [hovered, setHovered] = useState(false)
  const rafRef = useRef<number>(undefined)
  const t0Ref = useRef<number | null>(null)

  useEffect(() => {
    if (!hovered) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      t0Ref.current = null
      setDisplay(text)
      return
    }

    const DURATION = 500

    const frame = (ts: number) => {
      if (!t0Ref.current) t0Ref.current = ts
      const elapsed = ts - t0Ref.current
      const progress = Math.min(elapsed / DURATION, 1)
      const resolved = Math.floor(progress * text.length)

      setDisplay(
        text
          .split('')
          .map((ch, i) => {
            if (ch === ' ' || ch === '—' || ch === ',') return ch
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
  }, [hovered, text])

  return {
    display,
    hovered,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  }
}

export default function HeroIntro() {
  const [revealed, setRevealed] = useState(false)
  const [nameHovered, setNameHovered] = useState(false)
  const subtitle = useScrambleOnHover(SUBTITLE)

  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 800)
    return () => clearTimeout(id)
  }, [])

  let cursor = 0
  const nameChars = chars(NAME)
  const nameDelays = nameChars.map((_, i) => i * CHAR_SPEED)
  cursor = nameChars.length * CHAR_SPEED + 200

  const subtitleWords = words(SUBTITLE)
  const subtitleDelays = subtitleWords.map((_, i) => cursor + i * WORD_SPEED_SUB)
  cursor += subtitleWords.length * WORD_SPEED_SUB + 200

  const yearDelay = cursor

  return (
    <div className={`${s.intro} ${revealed ? s.revealed : ''}`}>
      {/* ── Name: VHS glitch on hover (3-layer RGB split) ── */}
      <p
        className={`${s.name} ${nameHovered ? s.nameGlitching : ''}`}
        onMouseEnter={() => setNameHovered(true)}
        onMouseLeave={() => setNameHovered(false)}
      >
        <span className={s.nameGlitchWrap}>
          {/* Canal B — drifts left */}
          <span className={`${s.nameGl} ${s.nameGlB}`} aria-hidden="true">
            {nameChars.map((ch, i) => (
              <span
                key={i}
                className={s.char}
                style={{ transitionDelay: `${nameDelays[i]}ms` }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </span>
          {/* Canal R — drifts right */}
          <span className={`${s.nameGl} ${s.nameGlR}`} aria-hidden="true">
            {nameChars.map((ch, i) => (
              <span
                key={i}
                className={s.char}
                style={{ transitionDelay: `${nameDelays[i]}ms` }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </span>
          {/* Main layer */}
          <span className={`${s.nameGl} ${s.nameGlMain}`}>
            {nameChars.map((ch, i) => (
              <span
                key={i}
                className={s.char}
                style={{ transitionDelay: `${nameDelays[i]}ms` }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </span>
        </span>
      </p>

      {/* ── Subtitle: scramble on hover ── */}
      <p
        className={s.subtitle}
        onMouseEnter={subtitle.onMouseEnter}
        onMouseLeave={subtitle.onMouseLeave}
      >
        {revealed ? (
          <span className={`${s.word} ${s.wordReady}`}>
            {subtitle.display}
          </span>
        ) : (
          subtitleWords.map((w, i) => (
            <span
              key={i}
              className={s.word}
              style={{ transitionDelay: `${subtitleDelays[i]}ms` }}
            >
              {w}
            </span>
          ))
        )}
      </p>

      <p
        className={`${s.year} ${s.word}`}
        style={{ transitionDelay: `${yearDelay}ms` }}
      >
        {YEAR}
      </p>
    </div>
  )
}
