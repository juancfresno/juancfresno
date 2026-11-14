'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DONUT, startLogoDonut, type LogoDonutHandle } from './donutGl'
import FresnoLogo from './FresnoLogo'
import { DOCK_W, DOCK_W_SMALL, dockY, pageMargin } from './dock'
import a from './about.module.scss'

// Docked ring: its width in the header corner (the place of the nav wordmark,
// which About hides while the donut is alive: [data-logo-dock] in globals.scss).
// The trip to the corner, as the page scrolls (e: 0 hero → 1 docked):
const GROW = 0.8       // first part of the trip: it grows and grows until you pass through it
const CLEAR = 1        // how far past the screen corners its hole opens before it is gone (1 = just)
const OPEN_END = 0.25  // extra tip towards the viewer by the end of the growth (rad; π/2 − tilt = seen from above)
const TURNS = 0.75     // turns the small ring spins on screen as it pops into the corner

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t) }

// The FRESNO© wordmark as a floating, turning 3D donut (donutGl.ts): move over
// it and it leans towards the cursor; take it and drag to turn it by hand
// (a ripple leaves the point you took it from). Its colour is the CSS
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

    const place = () => {
      const W = document.documentElement.clientWidth, H = window.innerHeight
      const r = s.getBoundingClientRect()
      const d0 = DONUT.size * r.width
      const d1 = W <= 768 ? DOCK_W_SMALL : DOCK_W
      const x1 = W - pageMargin(W) - d1 / 2
      const y1 = dockY(W)
      // The trip lasts well past its slot (half a screen more), so the ring is
      // still on screen, growing over the bio and the blue band, while they go
      // by. Never longer than the page can scroll, or it would not reach the corner.
      const maxScroll = document.documentElement.scrollHeight - H
      const range = Math.max(1, Math.min(r.top + window.scrollY + r.height * 1.2 + H * 0.5 - y1, maxScroll * 0.92))
      p = clamp01(window.scrollY / range)
      // 1. It comes straight at the screen: it grows and grows, drifting to the
      //    middle, until its hole is wider than the screen: you pass
      //    through it and it is gone. 2. It pops into the header corner, spinning.
      const t = clamp01(e / GROW)
      const g = t * t * (0.55 + 0.45 * t) // steady growth, a little faster at the end
      if (e < GROW) {
        const yNat = r.top + r.height / 2
        // It keeps its pose (only tips OPEN_END more, as a ring does when it comes
        // at you) and grows until the hole, an ellipse leaning with the ring,
        // holds the four screen corners: the letters pass by huge and it is gone.
        const tube = 1 / (DONUT.ratio + 1) / 2                       // tube radius / diameter
        const ax = (DONUT.ratio - 1) * tube                          // hole half-width / diameter
        const by = Math.max(0.02, DONUT.ratio * tube * Math.sin(DONUT.tilt + OPEN_END) - tube) // hole half-height / diameter
        const cl = Math.cos(DONUT.lean), sl = Math.sin(DONUT.lean)
        let need = 0
        for (const sx of [-1, 1]) {
          const x = (sx * W) / 2, y = H / 2
          need = Math.max(need, Math.hypot((x * cl + y * sl) / ax, (y * cl - x * sl) / by))
        }
        const end = Math.max(d0 * 1.6, need * CLEAR)
        const big = d0 + (end - d0) * g
        const x0 = r.left + r.width / 2
        handle.current?.setPlace(x0 + (W / 2 - x0) * g, yNat + (H / 2 - yNat) * smooth(t * 1.6), big, 0, OPEN_END * g, 1 - smooth((t - 0.88) / 0.12))
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
