'use client'

import { useEffect, useRef } from 'react'
import type { HeadlineLine } from '@/content/headline'
import { scrambleTo } from '@/lib/scramble'
import s from './home.module.scss'

// The hero's first line ("Hello! I'm Juan C. Fresno,") cycles through
// languages on hover / keyboard focus, and one step per tap on touch. Each
// change is a decode (lib/scramble.ts, the nav-hover family): glyphs of the
// target script resolve left to right in DECODE ms, then the line holds.
// Leaving goes back to the page's own language. The role line is NOT part
// of this: it stays in the page locale (the caller renders it).
// - Layout: every language's line is laid out invisibly in one grid cell, so
//   the slot keeps the size of the longest greeting: nothing moves.
// - Screen readers / SEO: only the real line (lines[0]) in a visually hidden
//   span; the visual part is aria-hidden, no live region.
// - Entrance (WIP intro, html[data-intro]): the line builds with the same
//   decode on first load (FastIntro shorter).
// - Reduced motion: plain swaps, no decode, no entrance build.
const DECODE = 420
const HOLD = 700

export default function HeadlineCycle({ lines, className }: { lines: HeadlineLine[]; className: string }) {
  const live = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = live.current!
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const n = lines.length
    let cur = 0
    let cancel: (() => void) | null = null
    let timer = 0

    const paint = (k: number) => {
      el.lang = lines[k].lang
      if (lines[k].script) el.dataset.script = lines[k].script
      else delete el.dataset.script
    }
    const go = (k: number, ms = DECODE, from = el.textContent || '') => {
      cancel?.()
      cur = k
      paint(k)
      if (reduce) { el.textContent = lines[k].a; return }
      cancel = scrambleTo(el, from, lines[k].a, ms)
    }
    const loop = () => {
      go((cur + 1) % n)
      timer = window.setTimeout(loop, DECODE + HOLD)
    }
    const start = () => { window.clearTimeout(timer); loop() }
    const stop = () => { window.clearTimeout(timer); if (cur !== 0) go(0) }

    // Entrance: the WIP intro builds the line from noise once the wireframe
    // hands over (html[data-intro-go] / 'wip:intro-go').
    const intro = document.documentElement.dataset.intro
    let offGo: (() => void) | null = null
    if ((intro === 'full' || intro === 'fast') && !reduce) {
      const fast = intro === 'fast'
      const len = Array.from(lines[0].a).length
      el.textContent = ''
      const build = () => {
        timer = window.setTimeout(() => {
          el.dataset.run = ''
          go(0, fast ? 200 : 360, ' '.repeat(len))
        }, fast ? 20 : 40)
      }
      if ('introGo' in document.documentElement.dataset) build()
      else {
        window.addEventListener('wip:intro-go', build, { once: true })
        offGo = () => window.removeEventListener('wip:intro-go', build)
      }
      const skip = () => { offGo?.(); window.clearTimeout(timer); cancel?.(); el.dataset.run = ''; el.textContent = lines[0].a }
      window.addEventListener('wip:intro-skip', skip, { once: true })
    } else {
      el.dataset.run = ''
    }

    const host = el.parentElement!
    const wrap = host.parentElement!
    const onEnter = (e: PointerEvent) => { if (e.pointerType === 'mouse') start() }
    const onLeave = (e: PointerEvent) => { if (e.pointerType === 'mouse') stop() }
    const onUp = (e: PointerEvent) => { if (e.pointerType !== 'mouse') go((cur + 1) % n) }
    // Keyboard focus cycles; a tap also focuses, but touch = one step per tap.
    const onFocus = () => { if (wrap.matches(':focus-visible')) start() }
    const onBlur = () => stop()
    host.addEventListener('pointerenter', onEnter)
    host.addEventListener('pointerleave', onLeave)
    host.addEventListener('pointerup', onUp)
    wrap.addEventListener('focus', onFocus)
    wrap.addEventListener('blur', onBlur)
    return () => {
      offGo?.()
      cancel?.()
      window.clearTimeout(timer)
      host.removeEventListener('pointerenter', onEnter)
      host.removeEventListener('pointerleave', onLeave)
      host.removeEventListener('pointerup', onUp)
      wrap.removeEventListener('focus', onFocus)
      wrap.removeEventListener('blur', onBlur)
    }
  }, [lines])

  return (
    <span className={`${s.hc} ${className}`} tabIndex={0}>
      <span className={s.srOnly}>{lines[0].a}</span>
      <span className={s.hcStage} aria-hidden="true">
        {lines.map((l, k) => (
          <span key={l.lang} lang={l.lang} className={s.hcSizer} data-script={l.script}
            {...(k === 0 ? { 'data-wire': '', 'data-wire-text': '' } : {})}>{l.a}</span>
        ))}
        <span ref={live} lang={lines[0].lang} className={s.hcLive}>{lines[0].a}</span>
      </span>
    </span>
  )
}
