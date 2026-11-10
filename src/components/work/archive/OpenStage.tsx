'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUi } from '@/i18n/client'
import { useOverlay, prefersReduced } from './useOverlay'
import { FichaList, Chips } from './Ficha'
import type { WorkItem } from './types'
import s from './open.module.scss'

// ─── ?open=stage ──────────────────────────────────────────────────────────────
// A full-viewport stage under the header. The clicked row's floating preview
// FLIPs (uniform scale, same aspect) from where it was into the stage while
// the site grid comes in the Lab 002 · 11a way: the 12 columns' lines drop
// (0–190 ms, 14 ms stagger), the gutters open (120–290), the columns fill
// (190–360), then the grid settles to a faint guide. Images browse with
// ← / →, the buttons or a swipe; ficha overlaid in mono. Close: the image
// flies back into its row (a 44 px-tall thumbnail at the project name) while
// the lines retract. No preview (keyboard / touch): it rises from the row.
// Reduced motion = fades only.
const EASE = 'cubic-bezier(0.19, 1, 0.22, 1)'
const OPEN_MS = 680
const CLOSE_MS = 520

type R = { left: number; top: number; width: number; height: number }

export default function OpenStage({ items, index, origin, rowEl, onClose, onClosed }: {
  items: WorkItem[]
  index: number | null
  origin: DOMRect | null // preview rect at click time
  rowEl: HTMLElement | null // the row (close target)
  onClose: () => void
  onClosed: () => void
}) {
  const t = useUi().work
  const [idx, setIdx] = useState<number | null>(index)
  const [phase, setPhase] = useState<'enter' | 'open' | 'closing'>('enter')
  const [img, setImg] = useState(0)
  const [rect, setRect] = useState<R | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const flew = useRef(false)

  const it = idx !== null ? items[idx] : null

  // Fit the current image (contain) into the box.
  const fit = useCallback((i: number): R | null => {
    const box = boxRef.current?.getBoundingClientRect()
    const im = it?.images[i]
    if (!box || !im) return null
    const k = Math.min(box.width / im.w, box.height / im.h)
    const width = im.w * k, height = im.h * k
    return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height }
  }, [it])

  useEffect(() => { if (index !== null) { setIdx(index); setImg(0); setPhase('enter'); flew.current = false } }, [index])

  // Measure, place, then FLIP in from the origin.
  useLayoutEffect(() => {
    if (idx === null || flew.current) return
    const r = fit(0)
    if (!r) return
    setRect(r)
    flew.current = true
    requestAnimationFrame(() => {
      setPhase('open')
      const w = wrapRef.current
      if (!w || prefersReduced()) return
      let from: R
      if (origin) {
        // Same aspect as the target, centred on the preview: uniform scale.
        const h = origin.width * (r.height / r.width)
        from = { left: origin.left, top: origin.top + (origin.height - h) / 2, width: origin.width, height: h }
      } else if (rowEl) {
        const rr = rowEl.getBoundingClientRect()
        const h = 44, wd = h * (r.width / r.height)
        from = { left: rr.left, top: rr.top, width: wd, height: h }
      } else return
      const sc = from.width / r.width
      w.animate(
        [
          { transform: `translate3d(${from.left - r.left}px, ${from.top - r.top}px, 0) scale(${sc})`, opacity: origin ? 1 : 0 },
          { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
        ],
        { duration: OPEN_MS, easing: EASE, fill: 'backwards' },
      )
    })
  }, [idx, fit, origin, rowEl])

  // Keep the rect right on resize.
  useEffect(() => {
    if (idx === null) return
    const on = () => { const r = fit(img); if (r) setRect(r) }
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [idx, img, fit])

  // Preload the next image.
  useEffect(() => {
    const nx = it?.images[img + 1]
    if (nx) { const im = new Image(); im.src = nx.src }
  }, [it, img])

  const browse = useCallback((dir: 1 | -1) => {
    if (!it || busy.current || phase !== 'open') return
    const n = it.images.length
    const next = (img + dir + n) % n
    const w = wrapRef.current
    const r = fit(next)
    if (!r) return
    if (!w || prefersReduced()) { setImg(next); setRect(r); return }
    busy.current = true
    const out = w.animate(
      [{ transform: 'none', opacity: 1 }, { transform: `translate3d(${-48 * dir}px,0,0)`, opacity: 0 }],
      { duration: 170, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'forwards' },
    )
    out.onfinish = () => {
      setImg(next)
      setRect(r)
      requestAnimationFrame(() => {
        out.cancel()
        const inn = w.animate(
          [{ transform: `translate3d(${64 * dir}px,0,0)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 460, easing: EASE },
        )
        inn.onfinish = () => { busy.current = false }
      })
    }
  }, [it, img, phase, fit])

  // Close: fly back into the row, retract the grid, then unmount.
  const close = useCallback(() => {
    if (phase === 'closing' || idx === null) return
    setPhase('closing')
    const w = wrapRef.current
    const done = () => { setIdx(null); setRect(null); onClosed() }
    if (!w || !rect || prefersReduced() || !rowEl) { window.setTimeout(done, 200); onClose(); return }
    const rr = (rowEl.querySelector('[data-name]') as HTMLElement | null ?? rowEl).getBoundingClientRect()
    const rowBox = rowEl.getBoundingClientRect()
    const h = rowBox.height
    const wd = h * (rect.width / rect.height)
    const sc = wd / rect.width
    const a = w.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: `translate3d(${rr.left - rect.left}px, ${rowBox.top - rect.top}px, 0) scale(${sc})`, opacity: 1, offset: 0.85 },
        { transform: `translate3d(${rr.left - rect.left}px, ${rowBox.top - rect.top}px, 0) scale(${sc})`, opacity: 0 },
      ],
      { duration: CLOSE_MS, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', fill: 'forwards' },
    )
    a.onfinish = done
    onClose()
  }, [phase, idx, rect, rowEl, onClose, onClosed])

  // Swipe (touch / pen).
  const sw = useRef({ x: 0, y: 0, on: false })
  const onPointerDown = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') sw.current = { x: e.clientX, y: e.clientY, on: true } }
  const onPointerUp = (e: React.PointerEvent) => {
    const p = sw.current
    if (!p.on) return
    p.on = false
    const dx = e.clientX - p.x, dy = e.clientY - p.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) browse(dx < 0 ? 1 : -1)
  }

  useOverlay(idx !== null && phase !== 'closing', rootRef, close, (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); browse(1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); browse(-1) }
  })

  if (!it || typeof document === 'undefined') return null
  const n = it.images.length
  const total = String(items.length).padStart(2, '0')
  const im = it.images[img]

  return createPortal(
    <div
      ref={rootRef}
      className={s.stage}
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label={t.dialog(it.title)}
      tabIndex={-1}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div className={s.stBg} aria-hidden="true" />
      <div className={s.stGrid} aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={s.stCol} style={{ '--i': i } as React.CSSProperties}><i /></span>
        ))}
      </div>

      <div className={s.stLayout}>
        <div className={s.stInfo}>
          <p className={s.stMono}><b>{it.n}</b> / {total} — {it.kind}</p>
          <h2 className={s.stTitle}>{it.title}</h2>
          <p className={s.stLead}>{it.lead}</p>
          <FichaList it={it} className={s.stFicha} />
          <Chips chips={it.chips} />
        </div>
        <div ref={boxRef} className={s.stBox} />
        <div className={s.stFoot}>
          <span className={s.stMono}>IMG {String(img + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
          <span className={s.stTicks} aria-hidden="true">
            {it.images.map((x, i) => <i key={x.src} data-on={i === img ? '' : undefined} />)}
          </span>
          <span className={s.stArrows}>
            <button type="button" className={s.ctl} onClick={() => browse(-1)} aria-label={t.prevImg}>←</button>
            <button type="button" className={s.ctl} onClick={() => browse(1)} aria-label={t.nextImg}>→</button>
          </span>
        </div>
        <button type="button" className={`${s.ctl} ${s.stClose}`} onClick={close} data-autofocus>{t.close} <kbd>{t.esc}</kbd></button>
      </div>

      {rect && (
        <div
          ref={wrapRef}
          className={s.stImg}
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={im.src} width={im.w} height={im.h} alt={t.image(it.title, img + 1, n)} decoding="async" />
          <span className={s.stTag} aria-hidden="true">IMG {im.w}×{im.h}</span>
        </div>
      )}
    </div>,
    document.body,
  )
}
