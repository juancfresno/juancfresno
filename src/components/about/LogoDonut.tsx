'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DONUT, startLogoDonut, type LogoDonutHandle } from './donutGl'
import FresnoLogo from './FresnoLogo'
import a from './about.module.scss'

// Docked ring: its width in the header corner (the place of the nav wordmark,
// which About hides while the donut is alive: [data-logo-dock] in globals.scss).
const DOCK_W = 128
const DOCK_W_SMALL = 84
const HEADER_H = 72
// The trip to the corner, as the page scrolls (e: 0 hero → 1 docked):
const GROW = 0.8       // first part of the trip: it grows and grows until you pass through it
const CLEAR = 1.12     // how far past the screen corners its hole opens before it is gone (1 = just)
const TURNS = 0.75     // turns the small ring spins on screen as it pops into the corner

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t) }

// The FRESNO© wordmark as a floating, turning 3D donut (donutGl.ts): move over
// it to throw its spin, click it for a liquid ripple. Its colour is the CSS
// `color` of the canvas. No WebGL2 = the flat SVG logo instead.
//
// The canvas covers the whole viewport, above everything except the page
// transition and the cursor, and never takes the pointer (portalled to <body>),
// so the ring is never cropped. The ring is placed inside it: at the top of the
// page it sits on its slot in the hero; as the page scrolls it grows until you
// pass through its hole, then pops into the header's top-right corner, centred
// on the header line, and stays there. The canvas blends in `difference`, so
// the ring turns negative over text and over the blue band.
export default function LogoDonut() {
  const ref = useRef<HTMLCanvasElement>(null)
  const slot = useRef<HTMLDivElement>(null)
  const handle = useRef<LogoDonutHandle | null>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [flat, setFlat] = useState(false)

  useEffect(() => setHost(document.body), [])

  useEffect(() => {
    if (!host || !ref.current) return
    const h = startLogoDonut(ref.current)
    if (!h) { setFlat(true); return }
    handle.current = h
    return () => { handle.current = null; h.stop() }
  }, [host])

  useLayoutEffect(() => {
    const c = ref.current, s = slot.current
    if (!host || !c || !s) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0, last = 0
    let p = 0          // where the scroll says it should be (0 hero → 1 docked)
    let e = 0, ev = 0  // where it is: follows p on a soft spring
    let lastY = window.scrollY

    const place = () => {
      const W = document.documentElement.clientWidth, H = window.innerHeight
      const r = s.getBoundingClientRect()
      const d0 = DONUT.size * r.width
      const d1 = W <= 768 ? DOCK_W_SMALL : DOCK_W
      const x1 = W - Math.max(20, 0.02381 * W) - d1 / 2 // page margin (--m)
      const y1 = HEADER_H
      // The trip lasts well past its slot (half a screen more), so the ring is
      // still on screen, growing over the bio and the blue band, while they go
      // by. Never longer than the page can scroll, or it would not reach the corner.
      const maxScroll = document.documentElement.scrollHeight - H
      const range = Math.max(1, Math.min(r.top + window.scrollY + r.height * 1.2 + H * 0.5 - y1, maxScroll * 0.92))
      p = clamp01(window.scrollY / range)
      // 1. It grows and grows, opening up to face you and drifting to the middle
      //    of the screen, until its hole is wider than the screen: you pass
      //    through it and it is gone. 2. It pops into the header corner, spinning.
      const t = clamp01(e / GROW)
      const g = t * t * (0.55 + 0.45 * t) // steady growth, a little faster at the end
      if (e < GROW) {
        const yNat = r.top + r.height / 2
        // Face on, the hole is 0.357 × the diameter across ((ratio − 1) / (ratio + 1) / 2 … for ratio 6):
        // it ends just wide enough to clear the screen corners, on any screen.
        const hole = (DONUT.ratio - 1) / (DONUT.ratio + 1) / 2
        const end = Math.max(d0 * 1.6, (Math.hypot(W, H) / 2 / hole) * CLEAR)
        const big = d0 + (end - d0) * g
        const x0 = r.left + r.width / 2
        handle.current?.setPlace(x0 + (W / 2 - x0) * g, yNat + (H / 2 - yNat) * smooth(t * 1.6), big, 0, (Math.PI / 2 - DONUT.tilt) * g, 1 - smooth((t - 0.9) / 0.1))
      } else {
        const k = smooth((e - GROW) / (1 - GROW))
        handle.current?.setPlace(x1, y1, d1 * k, (1 - k) * TURNS * Math.PI * 2, (1 - k) * 0.8, k)
      }
      c.style.visibility = 'visible'
      return Math.abs(e - p) < 0.001 && Math.abs(ev) < 0.005
    }
    const frame = (now: number) => {
      raf = 0
      const dt = Math.min(0.05, (now - (last || now)) / 1000)
      last = now
      if (reduced.matches) { e = p; ev = 0 } else {
        // Soft spring (k 60, almost critically damped): it trails the scroll and settles without bouncing.
        ev += ((p - e) * 60 - ev * 14) * dt
        e += ev * dt
      }
      if (!place()) raf = requestAnimationFrame(frame)
      else { e = p; ev = 0; last = 0; place() }
    }
    const ask = () => { if (!raf) raf = requestAnimationFrame(frame) }
    const onScroll = () => {
      // Scrolling also throws the ring: down = faster, up = against its spin.
      const dy = window.scrollY - lastY
      lastY = window.scrollY
      if (!reduced.matches) handle.current?.kick(dy * 0.006)
      place()
      ask()
    }
    place()
    e = p
    place()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    const ro = new ResizeObserver(onScroll)
    ro.observe(s)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      ro.disconnect()
    }
  }, [host])

  if (flat) return <FresnoLogo />
  return (
    <>
      <div ref={slot} className={a.donutSlot} data-logo-dock="" />
      {host && createPortal(<canvas ref={ref} className={a.donut} role="img" aria-label="Fresno©" />, host)}
    </>
  )
}
