'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import s from './HeroIntro.module.scss'

// ─── Text content (from Figma node 6235-511) ────────────────────────────────
const NAME = 'Juan C. Fresno'
const SUBTITLE = 'Independent Designer — Art Direction, Brand, Interactive'
const YEAR = '2012 — 2026'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const chars = (text: string) => [...text]
const words = (text: string) => text.match(/\S+\s?/g) || []

// ─── Animation speeds (ms) ───────────────────────────────────────────────────
const CHAR_SPEED = 35
const WORD_SPEED_SUB = 55

// ─── Component ───────────────────────────────────────────────────────────────
export default function HeroIntro() {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 800)
    return () => clearTimeout(id)
  }, [])

  // ── Pre-compute all delays ─────────────────────────────────────────────────
  let cursor = 0

  // Name — char by char
  const nameChars = chars(NAME)
  const nameDelays = nameChars.map((_, i) => i * CHAR_SPEED)
  cursor = nameChars.length * CHAR_SPEED + 200

  // Subtitle — word by word
  const subtitleWords = words(SUBTITLE)
  const subtitleDelays = subtitleWords.map((_, i) => cursor + i * WORD_SPEED_SUB)
  cursor += subtitleWords.length * WORD_SPEED_SUB + 200

  // Year — simple fade-in after subtitle
  const yearDelay = cursor

  return (
    <section className={`${s.hero} ${revealed ? s.revealed : ''}`}>
      {/* Left text column */}
      <div className={s.textCol}>
        <p className={s.name}>
          {nameChars.map((ch, i) => (
            <span
              key={i}
              className={s.char}
              style={{ transitionDelay: `${nameDelays[i]}ms` }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </p>

        <p className={s.subtitle}>
          {subtitleWords.map((w, i) => (
            <span
              key={i}
              className={s.word}
              style={{ transitionDelay: `${subtitleDelays[i]}ms` }}
            >
              {w}
            </span>
          ))}
        </p>

        <p
          className={`${s.year} ${s.word}`}
          style={{ transitionDelay: `${yearDelay}ms` }}
        >
          {YEAR}
        </p>
      </div>

      {/* Right poster image */}
      <div className={s.imageCol}>
        <Image
          src="/images/hero-poster.jpg"
          alt="Juan C. Fresno — poster"
          width={358}
          height={239}
          className={s.posterImg}
          priority
        />
      </div>
    </section>
  )
}
