'use client'

import { useEffect, useState } from 'react'
import s from './HeroIntro.module.scss'

const NAME = 'Juan C. Fresno'
const SUBTITLE = 'Independent Designer — Art Direction, Brand, Interactive'
const YEAR = '2012 — 2026'

const chars = (text: string) => [...text]
const words = (text: string) => text.match(/\S+\s?/g) || []

const CHAR_SPEED = 35
const WORD_SPEED_SUB = 55

export default function HeroIntro() {
  const [revealed, setRevealed] = useState(false)

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
  )
}
