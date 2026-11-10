'use client'

import { useEffect, useRef, useState } from 'react'
import type { HeadlineLine } from '@/content/headline'
import s from './home.module.scss'

// The hero headline cycles through languages on hover (or keyboard focus):
// BOTH lines change together, every STEP ms, and go back to the page's own
// language on leave. On touch each tap moves to the next language. Reduced
// motion = static. `lines[0]` is the page's own locale (its dictionary).
// - Layout: all languages are rendered in one grid cell (only the current one
//   visible), so the block keeps the size of the longest: no jumps below and
//   no width changes while cycling.
// - Screen readers and SEO get only the real heading (lines[0], visually
//   hidden); the visual sets are aria-hidden, no live region.
// - Each set carries its `lang`; Cyrillic and CJK fall back to system fonts
//   (home.module.scss .hcSet), no extra webfont.
// The caller owns the <h1>; aClass / bClass style the two lines.
const STEP = 450

export default function HeadlineCycle({
  lines, aClass, bClass, sep = ' ',
}: { lines: HeadlineLine[]; aClass: string; bClass: string; sep?: string }) {
  const [i, setI] = useState(0)
  const [active, setActive] = useState(false)
  const reduce = useRef(false)
  const timer = useRef(0)
  const n = lines.length

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (!active || reduce.current) return
    setI((k) => (k + 1) % n)
    timer.current = window.setInterval(() => setI((k) => (k + 1) % n), STEP)
    return () => window.clearInterval(timer.current)
  }, [active, n])

  const start = () => { if (!reduce.current) setActive(true) }
  const stop = () => { setActive(false); setI(0) }

  return (
    <span
      className={s.hc}
      tabIndex={0}
      // Keyboard focus cycles; a tap also focuses, but touch = one step per tap.
      onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) start() }}
      onBlur={stop}
      data-active={active || i > 0 || undefined}
    >
      <span className={s.srOnly}>{lines[0].a}{sep}{lines[0].b}</span>
      <span
        className={s.hcStage}
        aria-hidden="true"
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') start() }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') stop() }}
        onPointerUp={(e) => { if (e.pointerType !== 'mouse' && !reduce.current) setI((k) => (k + 1) % n) }}
      >
        {lines.map((l, k) => (
          <span key={l.lang} lang={l.lang} className={s.hcSet} data-on={k === i || undefined} data-script={l.script}>
            <span className={aClass}>{l.a}</span>
            <span className={bClass}>{l.b}</span>
          </span>
        ))}
      </span>
    </span>
  )
}
