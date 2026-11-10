'use client'

// ─── WIP background · sphere / tunnel / lens (?bg=) ───────────────────────────
// Same stage, veil and grain as the plane (CanvasBackdrop); the picture comes
// from bg/orb.ts. Motion per mode:
//   sphere · turns slowly on its own; drag turns it (yaw / pitch) with
//            inertia; pitch eases back to a slight tilt when released.
//   tunnel · drifts inwards; drag left/right turns it, up/down travels.
//   lens   · the plane's slow pan seen through a fisheye; drag pans.
// Wheel / trackpad drive the same axes. RGB split from the screen speed, the
// feed curve. Loop: full rate while dragging or gliding, ≤ 30 fps while only
// drifting, paused when hidden. Reduced motion: one still frame (drag still
// moves it, without inertia or split). No WebGL2 → the plane (DOM fallback).
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import type { FeedItem } from '@/content/feed'
import { createOrb, type Orb, type OrbMode } from './orb'
import { pageBg, splitMag, INTERACTIVE } from './theme'
import s from '../wip.module.scss'

const CanvasBackdrop = dynamic(() => import('../CanvasBackdrop'), { ssr: false })

const IDLE_MS = 33
const MAXV = 1.8 // px/ms release cap, as the feed

function geometry(mode: OrbMode, W: number, H: number) {
  const phone = W <= 768
  if (mode === 'sphere') {
    return phone ? { cx: W * 0.5, cy: H * 0.74, r: W * 0.66 } : { cx: W * 0.69, cy: H * 0.52, r: Math.min(H * 0.43, W * 0.29) }
  }
  if (mode === 'tunnel') {
    return phone ? { cx: W * 0.5, cy: H * 0.66, r: Math.max(W, H) * 0.5 } : { cx: W * 0.68, cy: H * 0.5, r: Math.max(W, H) * 0.5 }
  }
  return { cx: W * (phone ? 0.5 : 0.62), cy: H * 0.5, r: Math.hypot(W, H) * 0.5 }
}

export default function OrbBackdrop({ items, mode }: { items: FeedItem[]; mode: OrbMode }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [fallback, setFallback] = useState(false)
  const glRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    setHost(document.body)
    const html = document.documentElement
    html.dataset.bg = mode
    return () => { delete html.dataset.bg }
  }, [mode])

  useEffect(() => {
    if (!host || fallback || !items.length) return
    const cv = glRef.current!
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fx = reduce ? 0 : 1
    let W = window.innerWidth, H = window.innerHeight
    let orb: Orb | null = null
    try { orb = createOrb(cv, items, W <= 800, () => wake()) } catch { orb = null }
    if (!orb) { setFallback(true); return }
    const o = orb
    const offs: (() => void)[] = []
    const on = <T extends EventTarget>(t: T, ev: string, fn: (e: never) => void, opt?: AddEventListenerOptions) => {
      t.addEventListener(ev, fn as EventListener, opt)
      offs.push(() => t.removeEventListener(ev, fn as EventListener, opt))
    }

    let g = geometry(mode, W, H)
    let bg = pageBg()
    // a, b = the mode's two axes; va, vb = their velocities per 60 Hz frame.
    let a = mode === 'sphere' ? 0.6 : 0, b = mode === 'sphere' ? 0.18 : 0
    let va = 0, vb = 0
    let dragging = false
    let last = performance.now(), lastDraw = 0
    let sx = 0, sy = 0 // smoothed screen velocity (px/frame) for the split
    let pa = a, pb = b // axes at the previous frame (drags move a/b between frames)

    // Screen px → axis units.
    const toA = (dx: number) => (mode === 'sphere' ? -dx / g.r : mode === 'tunnel' ? -dx / (W * 1.4) : -dx)
    const toB = (dy: number) => (mode === 'sphere' ? dy / g.r : mode === 'tunnel' ? dy / (H * 0.45) : -dy)
    const auto = mode === 'sphere' ? [0.0016, 0] : mode === 'tunnel' ? [0.00025, 0.0032] : [0.28, 0.12]

    function resize() {
      W = window.innerWidth; H = window.innerHeight
      g = geometry(mode, W, H)
      cv.style.width = `${W}px`; cv.style.height = `${H}px`
      o.resize(W, H, Math.min(1.5, window.devicePixelRatio || 1))
      frame(performance.now(), true)
    }

    function frame(now: number, force = false) {
      const dt = Math.min(4, Math.max(0.25, (now - last) / 16.667))
      last = now
      if (!dragging) {
        if (!reduce) {
          a += (auto[0] + va) * dt
          b += (auto[1] + vb) * dt
          const k = Math.pow(0.94, dt)
          va *= k; vb *= k
          if (Math.abs(va) < 1e-6) va = 0
          if (Math.abs(vb) < 1e-6) vb = 0
          if (mode === 'sphere') b += (0.18 - b) * (1 - Math.pow(0.985, dt))
        }
      }
      if (mode === 'sphere') b = Math.max(-1.1, Math.min(1.1, b))
      // Screen velocity of the motion that is NOT the slow drift.
      const da = a - pa - (dragging || reduce ? 0 : auto[0] * dt), db = b - pb - (dragging || reduce ? 0 : auto[1] * dt)
      const scrA = mode === 'sphere' ? -da * g.r : mode === 'tunnel' ? -da * W * 1.4 : -da
      const scrB = mode === 'sphere' ? db * g.r : mode === 'tunnel' ? db * H * 0.45 : -db
      pa = a; pb = b
      const sk = 1 - Math.pow(1 - 0.35, dt)
      sx += (scrA / dt - sx) * sk; sy += (scrB / dt - sy) * sk
      const sp = Math.hypot(sx, sy)
      const mag = splitMag(sp) * fx
      const split: [number, number] = sp > 0.001 ? [(sx / sp) * mag, (sy / sp) * mag] : [0, 0]
      o.draw({ mode, a, b, cx: g.cx, cy: g.cy, r: g.r, split, bg })
      lastDraw = now
      if (force) return false
      return dragging || Math.abs(va) > 1e-4 || Math.abs(vb) > 1e-4 || sp > 0.8 || o.pending()
    }

    let raf = 0
    function tick(now: number) {
      raf = 0
      if (document.hidden) return
      const busy = dragging || Math.abs(va) > 1e-4 || Math.abs(vb) > 1e-4
      if (busy || now - lastDraw >= IDLE_MS) {
        const live = frame(now)
        if (reduce && !live) return
      }
      raf = requestAnimationFrame(tick)
    }
    function wake() { if (!raf && !document.hidden) { last = performance.now() - 16.7; raf = requestAnimationFrame(tick) } }

    // ── drag ──
    let pid: number | null = null, x0 = 0, y0 = 0, lx = 0, ly = 0, moved = false
    let hist: { x: number; y: number; t: number }[] = []
    on(window, 'pointerdown', (e: PointerEvent) => {
      if (e.button > 0 || pid !== null) return
      if ((e.target as Element | null)?.closest?.(INTERACTIVE)) return
      pid = e.pointerId; x0 = lx = e.clientX; y0 = ly = e.clientY; moved = false
      hist = [{ x: lx, y: ly, t: e.timeStamp }]
      va = vb = 0
    })
    on(window, 'pointermove', (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      let dx = e.clientX - lx, dy = e.clientY - ly
      lx = e.clientX; ly = e.clientY
      if (!moved && Math.hypot(lx - x0, ly - y0) > 6) {
        moved = true; dragging = true; dx = lx - x0; dy = ly - y0
        document.documentElement.classList.add(s.canvasDragging)
        window.getSelection()?.removeAllRanges()
      }
      if (!moved) return
      hist.push({ x: lx, y: ly, t: e.timeStamp }); if (hist.length > 6) hist.shift()
      a += toA(dx); b += toB(dy)
      wake()
    })
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      pid = null
      document.documentElement.classList.remove(s.canvasDragging)
      if (!moved) return
      dragging = false
      const h0 = hist[0], h1 = hist[hist.length - 1], dt = Math.max(16, h1.t - h0.t)
      if (e.timeStamp - h1.t <= 90 && !reduce) {
        const vx = Math.max(-MAXV, Math.min(MAXV, (h1.x - h0.x) / dt)) * 16.667
        const vy = Math.max(-MAXV, Math.min(MAXV, (h1.y - h0.y) / dt)) * 16.667
        va = toA(vx); vb = toB(vy)
      }
      wake()
    }
    on(window, 'pointerup', up)
    on(window, 'pointercancel', up)
    on(window, 'dragstart', (e: Event) => { if (pid !== null) e.preventDefault() })
    on(window, 'wheel', (e: WheelEvent) => {
      if (e.ctrlKey) return
      e.preventDefault()
      const f = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1
      const dx = Math.max(-120, Math.min(120, e.deltaX * f)), dy = Math.max(-120, Math.min(120, e.deltaY * f))
      if (reduce) { a += toA(-dx); b += toB(-dy) }
      else { va += toA(-dx) * 0.06; vb += toB(-dy) * 0.06 }
      wake()
    }, { passive: false })

    const mo = new MutationObserver(() => { bg = pageBg(); frame(performance.now(), true) })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    on(window, 'resize', resize)
    on(document, 'visibilitychange', () => { if (!document.hidden) wake() })

    resize()
    wake()
    return () => {
      cancelAnimationFrame(raf)
      offs.forEach((f) => f())
      mo.disconnect()
      o.destroy()
      document.documentElement.classList.remove(s.canvasDragging)
    }
  }, [host, items, mode, fallback])

  if (fallback) return <CanvasBackdrop items={items} />
  if (!host) return null
  return createPortal(
    <div className={s.canvasStage} aria-hidden="true">
      <canvas ref={glRef} className={s.canvasGl} />
      <div className={s.canvasVeil} />
    </div>,
    host,
  )
}
