'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { scrambleTo } from '@/lib/scramble'
import type { WorkItem } from './types'
import s from './archive.module.scss'

// ─── Row hover preview ────────────────────────────────────────────────────────
// ONE floating cover for the whole list (same voice as ui/SocialPreview):
// follows the cursor on a spring (k 380, ζ 0.62, slight overshoot), skews with
// its own horizontal velocity (≤ 9°) and splits into R / G / B at speed. The
// split is real: three copies of the cover, each one channel (SVG
// feColorMatrix), screen-blended on black = the exact image at rest; at speed
// R moves along the velocity and B against it. All per-frame work is
// transform-only; the loop sleeps when it settles.
// Label chip under it: `NN / 30 · NAME`, the number ticks and the name decodes.
// Keyboard focus anchors it to the row's right side. Touch: never mounted.
// Reduced motion: no spring, skew, split or decode (instant follow).

export type PreviewHandle = {
  show: (i: number, x: number, y: number) => void
  move: (x: number, y: number) => void
  anchor: (i: number, rect: DOMRect) => void
  hide: (instant?: boolean) => void
  // Rect of the cover as it is now (stage FLIP origin), null when hidden.
  rect: () => DOMRect | null
}

const SPRING = { k: 380, zeta: 0.62 }
const SKEW_MAX = 9
const SPLIT_MAX = 14 // px
const GAP = 28 // cursor → preview

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// `calm`: the editorial hovers use the same cover without the velocity skew
// and the RGB split (it only follows on its spring).
const HoverPreview = forwardRef<PreviewHandle, { items: WorkItem[]; total: string; calm?: boolean }>(function HoverPreview({ items, total, calm = false }, ref) {
  const calmRef = useRef(calm)
  calmRef.current = calm
  const [mounted, setMounted] = useState(false)
  const [cur, setCur] = useState<number | null>(null)
  const [prev, setPrev] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const layers = useRef(new Map<number, { r: HTMLImageElement | null; b: HTMLImageElement | null }>())

  const st = useRef({
    x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0,
    on: false, raf: 0, last: 0, cur: -1, flipLeft: false,
    reduce: false, cancelName: () => {}, cancelNum: 0,
  })

  // The outgoing slot is dropped once its fade (0.22s) is over: no invisible layers painting.
  useEffect(() => {
    if (prev === null) return
    const id = window.setTimeout(() => setPrev(null), 300)
    return () => window.clearTimeout(id)
  }, [prev, cur])

  useEffect(() => {
    setMounted(true)
    st.current.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const size = () => {
    const el = frameRef.current
    return el ? { w: el.offsetWidth, h: el.offsetHeight } : { w: 400, h: 300 }
  }

  const tick = useCallback((now: number) => {
    const p = st.current
    const root = rootRef.current
    if (!root) return
    const dt = Math.min(0.034, (now - (p.last || now)) / 1000) || 0.016
    p.last = now
    if (p.reduce) {
      p.x = p.tx; p.y = p.ty; p.vx = 0; p.vy = 0
    } else {
      const c = 2 * SPRING.zeta * Math.sqrt(SPRING.k)
      p.vx += (SPRING.k * (p.tx - p.x) - c * p.vx) * dt
      p.vy += (SPRING.k * (p.ty - p.y) - c * p.vy) * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
    const still = p.reduce || calmRef.current
    const skew = still ? 0 : clamp(-p.vx / 110, -SKEW_MAX, SKEW_MAX)
    root.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) skewX(${skew.toFixed(2)}deg) rotate(${(skew * 0.12).toFixed(3)}deg)`

    // RGB split along the velocity, device-pixel snapped.
    const speed = Math.hypot(p.vx, p.vy) / 60 // px per frame @60
    const amt = still ? 0 : clamp((speed - 0.6) * 0.6, 0, SPLIT_MAX)
    const dpr = window.devicePixelRatio || 1
    const ux = speed > 0.01 ? p.vx / 60 / speed : 0
    const uy = speed > 0.01 ? p.vy / 60 / speed : 0
    const ox = Math.round(ux * amt * dpr) / dpr
    const oy = Math.round(uy * amt * dpr) / dpr
    const L = layers.current.get(p.cur)
    if (L?.r) L.r.style.transform = `translate3d(${ox}px, ${oy}px, 0)`
    if (L?.b) L.b.style.transform = `translate3d(${-ox}px, ${-oy}px, 0)`
    if (amt > 0) root.dataset.moving = ''
    else delete root.dataset.moving

    const settled = Math.abs(p.tx - p.x) < 0.1 && Math.abs(p.ty - p.y) < 0.1 && Math.abs(p.vx) < 0.5 && Math.abs(p.vy) < 0.5
    if (settled && amt === 0) { p.raf = 0; p.last = 0; return }
    p.raf = requestAnimationFrame(tick)
  }, [])

  const wake = useCallback(() => {
    const p = st.current
    if (!p.raf) p.raf = requestAnimationFrame(tick)
  }, [tick])

  const target = (x: number, y: number) => {
    const p = st.current
    const { w, h } = size()
    // Stays on one side of the cursor; flips (with hysteresis) near the right edge.
    if (!p.flipLeft && x + GAP + w > window.innerWidth - 16) p.flipLeft = true
    else if (p.flipLeft && x - GAP - w < 16) p.flipLeft = false
    p.tx = p.flipLeft ? x - GAP - w : x + GAP
    p.ty = clamp(y - h * 0.5, 80, window.innerHeight - h - 56)
  }

  const label = (i: number) => {
    const p = st.current
    const it = items[i]
    const nameEl = nameRef.current
    const numEl = numRef.current
    if (!it || !nameEl || !numEl) return
    p.cancelName()
    if (p.reduce || !nameEl.textContent) nameEl.textContent = it.name
    else p.cancelName = scrambleTo(nameEl, nameEl.textContent, it.name, 320)
    // Index number ticks from the previous to the new one.
    cancelAnimationFrame(p.cancelNum)
    const max = Math.max(1, parseInt(total, 10) || items.length)
    const to = clamp(parseInt(it.n, 10) || 1, 1, max)
    const shown = parseInt(numEl.textContent || '', 10)
    const from = Number.isFinite(shown) ? clamp(shown, 1, max) : to
    if (p.reduce || from === to) { numEl.textContent = it.n; return }
    const t0 = performance.now()
    const run = (now: number) => {
      const k = Math.min(1, (now - t0) / 260)
      const e = 1 - Math.pow(1 - k, 3)
      numEl.textContent = String(clamp(Math.round(from + (to - from) * e), 1, max)).padStart(2, '0')
      if (k < 1) p.cancelNum = requestAnimationFrame(run)
    }
    p.cancelNum = requestAnimationFrame(run)
  }

  const activate = (i: number) => {
    const p = st.current
    if (p.cur === i && p.on) return
    if (p.cur !== i) {
      setPrev(p.on ? p.cur : null)
      setCur(i)
      p.cur = i
      label(i)
    }
    if (!p.on) { p.on = true; setVisible(true) }
  }

  useImperativeHandle(ref, () => ({
    show(i, x, y) {
      const p = st.current
      const wasOn = p.on
      target(x, y)
      if (!wasOn) { p.x = p.tx; p.y = p.ty + 18; p.vx = 0; p.vy = 0 }
      activate(i)
      wake()
    },
    move(x, y) {
      if (!st.current.on) return
      target(x, y)
      wake()
    },
    anchor(i, rect) {
      const p = st.current
      const { w, h } = size()
      p.flipLeft = false
      p.tx = rect.right - w - 120
      p.ty = clamp(rect.top + rect.height / 2 - h / 2, 80, window.innerHeight - h - 56)
      if (!p.on) { p.x = p.tx; p.y = p.ty + 18; p.vx = 0; p.vy = 0 }
      activate(i)
      wake()
    },
    hide(instant) {
      const p = st.current
      if (!p.on) return
      p.on = false
      setVisible(false)
      if (instant && rootRef.current) {
        const el = rootRef.current
        el.dataset.instant = ''
        requestAnimationFrame(() => requestAnimationFrame(() => { delete el.dataset.instant }))
      }
    },
    rect() {
      const p = st.current
      if (!p.on || !frameRef.current) return null
      return frameRef.current.getBoundingClientRect()
    },
  }))

  // Scroll or blur hides it (the rows moved away from under the cursor).
  useEffect(() => {
    const off = () => {
      const p = st.current
      if (p.on) { p.on = false; setVisible(false) }
    }
    window.addEventListener('scroll', off, { passive: true })
    window.addEventListener('blur', off)
    return () => {
      window.removeEventListener('scroll', off)
      window.removeEventListener('blur', off)
      cancelAnimationFrame(st.current.raf)
      st.current.cancelName()
    }
  }, [])

  if (!mounted) return null

  const slots = [prev, cur].filter((v, i, a): v is number => v !== null && a.indexOf(v) === i)

  return createPortal(
    <div ref={rootRef} className={s.preview} data-on={visible ? '' : undefined} aria-hidden="true">
      <svg width="0" height="0" className={s.svgDefs} focusable="false">
        <filter id="wk-ch-r" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" /></filter>
        <filter id="wk-ch-g" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" /></filter>
        <filter id="wk-ch-b" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" /></filter>
      </svg>
      <div ref={frameRef} className={s.pvFrame}>
        {slots.map((i) => {
          const it = items[i]
          return (
            <div key={it.slug} className={s.pvSlot} data-cur={i === cur ? '' : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={(el) => { const L = layers.current.get(i) ?? { r: null, b: null }; L.r = el; layers.current.set(i, L) }} className={s.pvR} src={it.cover.src} alt="" decoding="async" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.pvG} src={it.cover.src} alt="" decoding="async" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={(el) => { const L = layers.current.get(i) ?? { r: null, b: null }; L.b = el; layers.current.set(i, L) }} className={s.pvB} src={it.cover.src} alt="" decoding="async" />
            </div>
          )
        })}
        <i className={s.pvTick} data-c="tl" /><i className={s.pvTick} data-c="tr" />
        <i className={s.pvTick} data-c="bl" /><i className={s.pvTick} data-c="br" />
      </div>
      <div className={s.pvLabel}>
        <span><span ref={numRef} /> / {total}</span>
        <span className={s.pvDot} />
        <span ref={nameRef} className={s.pvName} />
      </div>
    </div>,
    document.body,
  )
})

export default HoverPreview
