'use client'

import { useEffect, useState } from 'react'
import s from './HeroIntro.module.scss'

// ─── Text content (from Figma node 6254:599-602) ────────────────────────────────
const NAME = 'Juan C. Fresno'
const SUBTITLE = 'Independent Art Director & Digital Designer'

interface BodyLine {
  segments: { text: string; bold?: boolean }[]
}

const BODY: BodyLine[] = [
  {
    segments: [
      { text: 'Trabajo de forma independiente colaborando con marcas, agencias y equipos para dar forma a ' },
      { text: 'productos y experiencias digitales, desde la direcci\u00f3n visual hasta la interacci\u00f3n.', bold: true },
    ],
  },
  {
    segments: [
      { text: 'Me interesa ' },
      { text: 'el proceso, la claridad visual y la interacci\u00f3n bien pensada.', bold: true },
    ],
  },
  {
    segments: [
      { text: 'Lo justo, bien hecho.' },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────────
/** Split into individual characters (preserving spaces) */
const chars = (text: string) => [...text]

/** Split into words keeping trailing whitespace attached */
const words = (text: string) => text.match(/\S+\s?/g) || []

// ─── Animation speeds (ms) ───────────────────────────────────────────────────────
const CHAR_SPEED = 35   // per character (name)
const WORD_SPEED_SUB = 55 // per word (subtitle)
const WORD_SPEED_BODY = 30 // per word (body)
const SECTION_GAP = 200  // gap between sections

// ─── Component ───────────────────────────────────────────────────────────────────
export default function HeroIntro() {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 800)
    return () => clearTimeout(id)
  }, [])

  // ── Pre-compute all delays ─────────────────────────────────────────────────────
  let cursor = 0

  // Name — char by char
  const nameChars = chars(NAME)
  const nameDelays = nameChars.map((_, i) => i * CHAR_SPEED)
  cursor = nameChars.length * CHAR_SPEED + SECTION_GAP

  // Subtitle — word by word
  const subtitleWords = words(SUBTITLE)
  const subtitleDelays = subtitleWords.map((_, i) => cursor + i * WORD_SPEED_SUB)
  cursor += subtitleWords.length * WORD_SPEED_SUB + SECTION_GAP * 2

  // Body — word by word across all lines & segments
  const bodyLines = BODY.map(line => {
    const lineWords: { text: string; delay: number; bold?: boolean }[] = []
    line.segments.forEach(seg => {
      words(seg.text).forEach(w => {
        lineWords.push({ text: w, delay: cursor, bold: seg.bold })
        cursor += WORD_SPEED_BODY
      })
    })
    cursor += SECTION_GAP / 2 // small pause between paragraphs
    return lineWords
  })

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <section className={`${s.hero} ${revealed ? s.revealed : ''}`}>
      {/* Name */}
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

      {/* Subtitle */}
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

      {/* Body */}
      <div className={s.body}>
        {bodyLines.map((line, li) => (
          <p key={li} className={s.bodyLine}>
            {line.map((item, wi) => (
              <span
                key={wi}
                className={`${s.word}${item.bold ? ` ${s.highlight}` : ''}`}
                style={{ transitionDelay: `${item.delay}ms` }}
              >
                {item.text}
              </span>
            ))}
          </p>
        ))}
      </div>
    </section>
  )
}
