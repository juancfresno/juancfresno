'use client'

import { useEffect, useRef } from 'react'
import { startLogoDonut, type LogoDonutHandle } from '@/components/about/donutGl'
import { DOCK_W, DOCK_W_SMALL, DOCK_Y, pageMargin } from '@/components/about/dock'
import s from './Nav.module.scss'

// The nav wordmark becomes the 3D donut while the header is hidden (scrolling
// down), on every page: the vertical FRESNO© curls from its top, closes into a
// ring (donutGl.ts, `setMorph`) a little lower in the same corner and keeps
// turning there; scrolling back up unrolls it into the wordmark again.
//
// One small canvas fixed to the top-right corner, in `difference` like the
// wordmark, never taking the pointer (the real link stays underneath, at
// opacity 0, so it is still the way home). WebGL starts on the first morph and
// sleeps whenever the flat wordmark is showing. Phones too (their top bar stays,
// the wordmark still turns into a smaller ring). Off with reduced motion, without WebGL2, and on About, whose own
// donut docks in this corner (LogoDonut, [data-logo-dock]).
const BOX = 280                   // canvas side, css px
const WORD_W = 12, WORD_LEN = 101 // the vertical wordmark's glyph box
const WHITE: [number, number, number] = [1, 1, 1]

export default function NavDonut({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const want = useRef(active)
  const wake = useRef<() => void>(() => {})
  want.current = active

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const root = document.documentElement
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let h: LogoDonutHandle | null = null
    let failed = false
    let raf = 0, last = 0
    let m = 0, mv = 0 // 0 wordmark → 1 ring, on a spring
    let ring: [number, number, number] = [0.84, 0.92, 1]

    const allowed = () => !failed && !reduced.matches && !document.querySelector('[data-logo-dock]')
    const show = (on: boolean) => {
      c.style.visibility = on ? 'visible' : 'hidden'
      if (on) root.setAttribute('data-nav-donut', '')
      else root.removeAttribute('data-nav-donut')
    }
    const frame = (now: number) => {
      raf = 0
      const to = want.current && allowed() ? 1 : 0
      const dt = Math.min(0.05, (now - (last || now)) / 1000)
      last = now
      // Spring (k 46, damping ratio ≈ 0.75): quick, lands with a hint of overshoot.
      mv += ((to - m) * 46 - mv * 10.2) * dt
      m += mv * dt
      // QA: `window.__navDonutHold = 0.4` freezes the morph at that point (undefined = live).
      const hold = (window as unknown as { __navDonutHold?: number }).__navDonutHold
      if (typeof hold === 'number') { m = hold; mv = 0 }
      if (to === 0 && m < 0.001 && Math.abs(mv) < 0.02 && typeof hold !== 'number') { // back to the real wordmark
        m = 0; mv = 0; last = 0
        h?.setPaused(true)
        show(false)
        return
      }
      const word = document.querySelector<HTMLElement>('[data-site-wordmark]')
      if (!h || !word) return
      const b = c.getBoundingClientRect(), w = word.getBoundingClientRect()
      const W = root.clientWidth
      const k = Math.min(1, Math.max(0, m))
      h.setMorph(k, w.left + WORD_W / 2 - b.left, w.top - b.top, WORD_W, WORD_LEN)
      // The ring closes a little lower, tipped towards the viewer until it settles.
      const d = W <= 768 ? DOCK_W_SMALL : DOCK_W
      h.setPlace(W - pageMargin(W) - d / 2 - b.left, DOCK_Y - b.top, d, (1 - k) * 0.9, (1 - k) * 0.5, 1)
      h.setInk([WHITE[0] + (ring[0] - 1) * k, WHITE[1] + (ring[1] - 1) * k, WHITE[2] + (ring[2] - 1) * k], k)
      show(true)
      raf = requestAnimationFrame(frame)
    }
    wake.current = () => {
      if (raf) return
      if (!(want.current && allowed()) && m === 0) return
      if (!h && !failed) {
        h = startLogoDonut(c)
        if (!h) { failed = true; return }
        const rgb = getComputedStyle(c).color.match(/[\d.]+/g)
        if (rgb && rgb.length >= 3) ring = [Number(rgb[0]) / 255, Number(rgb[1]) / 255, Number(rgb[2]) / 255]
      }
      if (m === 0 && want.current) h?.kick(-4) // it arrives spinning, then calms down
      h?.setPaused(false)
      raf = requestAnimationFrame(frame)
    }
    const onChange = () => wake.current()
    reduced.addEventListener('change', onChange)
    return () => {
      cancelAnimationFrame(raf)
      reduced.removeEventListener('change', onChange)
      root.removeAttribute('data-nav-donut')
      h?.stop()
      wake.current = () => {}
    }
  }, [])

  useEffect(() => { wake.current() }, [active])

  return <canvas ref={ref} className={s.navDonut} style={{ width: BOX, height: BOX }} aria-hidden="true" />
}
