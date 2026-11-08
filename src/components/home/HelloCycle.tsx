'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import s from './home.module.scss'

// "Hello" in the hero: on hover (or keyboard focus) it cycles through the
// greetings every ~350 ms in a loop and goes back to "Hello" on leave. On
// touch, each tap advances one word. Reduced motion = static "Hello".
// The slot's width eases to each word's measured width, so the rest of the
// line glides instead of jumping (and there is no gap at rest). Screen
// readers get the first word only ("Hello," / "Hola,"); the variants are
// aria-hidden. `words` = HOME.greetings of the locale (the first one is home).
const STEP = 350
const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function HelloCycle({ words: WORDS }: { words: string[] }) {
  const [i, setI] = useState(0)
  const [active, setActive] = useState(false)
  const [widths, setWidths] = useState<number[] | null>(null)
  const measure = useRef<HTMLSpanElement>(null)
  const timer = useRef<number>(0)
  const reduce = useRef(false)

  // Measure every greeting once fonts are ready (and on resize: fluid type).
  useIsoLayout(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const run = () => {
      const el = measure.current
      if (!el) return
      setWidths([...el.children].map((c) => (c as HTMLElement).getBoundingClientRect().width))
    }
    run()
    document.fonts?.ready.then(run).catch(() => {})
    window.addEventListener('resize', run)
    return () => window.removeEventListener('resize', run)
  }, [])

  useEffect(() => {
    if (!active || reduce.current) return
    setI((n) => (n + 1) % WORDS.length)
    timer.current = window.setInterval(() => setI((n) => (n + 1) % WORDS.length), STEP)
    return () => window.clearInterval(timer.current)
  }, [active])

  const start = () => setActive(true)
  const stop = () => { setActive(false); setI(0) }

  return (
    <span
      className={s.hello}
      tabIndex={0}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') start() }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') stop() }}
      onPointerUp={(e) => { if (e.pointerType !== 'mouse' && !reduce.current) setI((n) => (n + 1) % WORDS.length) }}
      // Keyboard focus cycles; a tap also focuses the span, but that must not
      // start the loop (touch = one word per tap), so only :focus-visible counts.
      onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) start() }}
      onBlur={stop}
      data-active={active || undefined}
    >
      <span className={s.srOnly}>{WORDS[0]},</span>
      <span className={s.helloSlot} aria-hidden="true" style={widths ? { width: widths[i] } : undefined}>
        <span key={i} className={s.helloWord}>{WORDS[i]},</span>
      </span>
      <span ref={measure} className={s.helloMeasure} aria-hidden="true">
        {WORDS.map((w) => <span key={w}>{w},</span>)}
      </span>
    </span>
  )
}
