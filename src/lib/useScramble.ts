'use client'

import { useState, useEffect, useRef } from 'react'

// Nav hover text effect (moved out of layout/Nav so every chip button shares it).
// ─── Scramble character pool ───────────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%?'

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

// ─── useScramble ───────────────────────────────────────────────────────────────
// Cicla aleatoriamente sobre los caracteres y los resuelve de izquierda a derecha.
// active=true → arranca la animación; active=false → resetea al texto original.
export function useScramble(text: string, active: boolean, lettersOnly = false): string {
  const [display, setDisplay] = useState(text)
  const rafRef = useRef<number>(undefined)
  const t0Ref  = useRef<number | null>(null)

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!active || reduce) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      t0Ref.current = null
      setDisplay(text)
      return
    }

    const DURATION = 420 // ms — tiempo hasta que todos los chars se resuelven

    const frame = (ts: number) => {
      if (!t0Ref.current) t0Ref.current = ts
      const elapsed  = ts - t0Ref.current
      const progress = Math.min(elapsed / DURATION, 1)
      const resolved = Math.floor(progress * text.length)

      setDisplay(
        text.split('').map((ch, i) => {
          if (ch === ' ') return ' '
          if (i < resolved) return ch
          if (lettersOnly) {
            if (!/[a-z]/i.test(ch)) return ch
            const L = LETTERS[Math.floor(Math.random() * LETTERS.length)]
            return ch === ch.toUpperCase() ? L.toUpperCase() : L
          }
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        }).join('')
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

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active, text, lettersOnly])

  return display
}
