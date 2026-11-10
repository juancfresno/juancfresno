'use client'

import { forwardRef, useEffect, useRef, useState } from 'react'
import { useUi } from '@/i18n/client'
import { prefersReduced } from './useOverlay'
import { FichaList, Chips } from './Ficha'
import type { WorkItem } from './types'
import s from './open.module.scss'

// ─── ?open=expand ─────────────────────────────────────────────────────────────
// The row opens in place. WorkArchive runs the FLIP (rows below slide down
// over the panel: rows have the page background, so they work as the curtain);
// this is the panel: lead + ficha + chips, then a horizontal strip of every
// image at one height that bleeds to the right edge. Drag (mouse / touch /
// pen) with inertia and rubber-band edges, horizontal wheel / trackpad, ← / →
// when focused (one image per step). Progress: `03 / 16` + hairline bar.
// All movement is transform on the track.
const ExpandPanel = forwardRef<HTMLDivElement, { it: WorkItem; id: string; onClose: () => void }>(function ExpandPanel({ it, id, onClose }, ref) {
  const t = useUi().work
  const viewRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const [cur, setCur] = useState(1)
  const [dragging, setDragging] = useState(false)
  const st = useRef({ x: 0, v: 0, min: 0, raf: 0, down: false, sx: 0, sy: 0, ox: 0, lastX: 0, lastT: 0, axis: '' as '' | 'x' | 'y', moved: false, target: null as number | null })

  const bounds = () => {
    const v = viewRef.current, tr = trackRef.current
    if (!v || !tr) return
    st.current.min = Math.min(0, v.clientWidth - tr.scrollWidth)
  }

  const render = () => {
    const p = st.current
    const tr = trackRef.current
    if (!tr) return
    tr.style.transform = `translate3d(${p.x.toFixed(2)}px, 0, 0)`
    const k = p.min < 0 ? Math.min(1, Math.max(0, p.x / p.min)) : 1
    if (barRef.current) barRef.current.style.transform = `scaleX(${Math.max(0.04, k)})`
    // Current image = the one whose left edge is nearest the viewport's left.
    const kids = Array.from(tr.children) as HTMLElement[]
    let best = 0, bd = Infinity
    kids.forEach((el, i) => { const d = Math.abs(el.offsetLeft + p.x); if (d < bd) { bd = d; best = i } })
    setCur(best + 1)
  }

  const loop = () => {
    const p = st.current
    const rubber = p.x > 0 ? -p.x : p.x < p.min ? p.min - p.x : 0
    if (p.target !== null) {
      const d = p.target - p.x
      p.x += d * 0.16
      if (Math.abs(d) < 0.4) { p.x = p.target; p.target = null }
    } else if (!p.down) {
      p.v *= 0.94
      p.x += p.v
      if (rubber) { p.x += rubber * 0.18; p.v *= 0.6 }
    }
    render()
    const still = p.target === null && !p.down && Math.abs(p.v) < 0.05 && Math.abs(rubber) < 0.3
    if (still) { p.raf = 0; return }
    p.raf = requestAnimationFrame(loop)
  }
  const wake = () => { if (!st.current.raf) st.current.raf = requestAnimationFrame(loop) }

  useEffect(() => {
    bounds()
    const ro = new ResizeObserver(() => { bounds(); render() })
    if (viewRef.current) ro.observe(viewRef.current)
    if (trackRef.current) ro.observe(trackRef.current)
    const p = st.current
    return () => { ro.disconnect(); cancelAnimationFrame(p.raf) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goTo = (i: number) => {
    const tr = trackRef.current
    if (!tr) return
    const kids = Array.from(tr.children) as HTMLElement[]
    const el = kids[Math.max(0, Math.min(kids.length - 1, i))]
    if (!el) return
    const p = st.current
    p.v = 0
    const x = Math.max(p.min, Math.min(0, -el.offsetLeft))
    if (prefersReduced()) { p.x = x; render() } else { p.target = x; wake() }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const p = st.current
    p.down = true; p.axis = ''; p.moved = false
    p.sx = e.clientX; p.sy = e.clientY; p.ox = p.x
    p.lastX = e.clientX; p.lastT = performance.now(); p.v = 0; p.target = null
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const p = st.current
    if (!p.down) return
    const dx = e.clientX - p.sx, dy = e.clientY - p.sy
    if (!p.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      p.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (p.axis === 'x') { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDragging(true) }
    }
    if (p.axis !== 'x') return
    p.moved = true
    let x = p.ox + dx
    if (x > 0) x *= 0.35
    else if (x < p.min) x = p.min + (x - p.min) * 0.35
    const now = performance.now()
    const dt = Math.max(1, now - p.lastT)
    p.v = ((e.clientX - p.lastX) / dt) * 16
    p.v = Math.max(-60, Math.min(60, p.v))
    p.lastX = e.clientX; p.lastT = now
    p.x = x
    render()
  }
  const onPointerUp = () => {
    const p = st.current
    if (!p.down) return
    p.down = false
    setDragging(false)
    wake()
  }
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    const p = st.current
    p.target = null
    p.x = Math.max(p.min - 40, Math.min(40, p.x - e.deltaX))
    p.v = 0
    render(); wake()
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(cur) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(cur - 2) }
  }
  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
  }

  const n = it.images.length
  return (
    <div ref={ref} id={id} className={s.xPanel} role="region" aria-label={t.dialog(it.title)} tabIndex={-1} onKeyDown={onPanelKeyDown}>
      <div className={s.xHead}>
        <div className={s.xIntro}>
          <p className={s.dKind}>{it.year} · {it.kind}</p>
          <p className={s.xLead}>{it.lead}</p>
          <Chips chips={it.chips} />
        </div>
        <FichaList it={it} className={s.xFicha} />
        <button type="button" className={`${s.ctl} ${s.xClose}`} onClick={onClose}>{t.close} <kbd>{t.esc}</kbd></button>
      </div>

      <div
        ref={viewRef}
        className={s.xView}
        data-dragging={dragging ? '' : undefined}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={t.strip(it.title)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onDragStart={(e) => e.preventDefault()}
      >
        <div ref={trackRef} className={s.xTrack}>
          {it.images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.src}
              src={img.src}
              width={img.w}
              height={img.h}
              style={{ aspectRatio: `${img.w} / ${img.h}` }}
              alt={t.image(it.title, i + 1, n)}
              loading={i < 2 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          ))}
        </div>
      </div>

      <div className={s.xFoot}>
        <span className={s.xCount}>{String(cur).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
        <span className={s.xBar}><span ref={barRef} /></span>
        <span className={s.xHint}>{t.drag} ↔</span>
        <span className={s.xArrows}>
          <button type="button" className={s.ctl} onClick={() => goTo(cur - 2)} aria-label={t.prevImg}>←</button>
          <button type="button" className={s.ctl} onClick={() => goTo(cur)} aria-label={t.nextImg}>→</button>
        </span>
      </div>
    </div>
  )
})

export default ExpandPanel
