'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { SOCIAL_PREVIEWS, type SocialId } from '@/content/site'
import s from './SocialPreview.module.scss'

// ─── Social hover preview ─────────────────────────────────────────────────────
// One global instance (mounted in the root layout). Any link with
// `data-social="<id>"` (footer logo row, ContactBlock text links) shows a small
// floating clip of that profile scrolling: above the cursor with the mouse,
// anchored above the link on keyboard focus. Same family as the Work
// HoverIndex preview. Rules:
// - only on hover-capable fine pointers; touch gets nothing;
// - no bytes until the first hover: a network's <video> mounts on its first
//   hover and then stays mounted (and keeps its buffer);
// - prefers-reduced-motion: poster only, no playback;
// - Esc, blur or leave hides it, pauses and rewinds.
const W = 256
const H = 160
const GAP = 20
const EDGE = 16

const isSocialId = (v: string | undefined): v is SocialId => !!v && v in SOCIAL_PREVIEWS

export default function SocialPreview() {
  const [active, setActive] = useState<SocialId | null>(null)
  const [mounted, setMounted] = useState<SocialId[]>([])
  const [reduce, setReduce] = useState(false)
  const floatRef = useRef<HTMLDivElement>(null)
  const videos = useRef<Partial<Record<SocialId, HTMLVideoElement | null>>>({})
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0, snap: true })
  const activeRef = useRef<SocialId | null>(null)

  const place = useCallback((tx: number, ty: number) => {
    const p = pos.current
    p.tx = Math.max(EDGE, Math.min(tx, window.innerWidth - W - EDGE))
    p.ty = ty < EDGE ? ty + H + GAP * 2 : ty // no room above → below
    if (p.snap) { p.x = p.tx; p.y = p.ty; p.snap = false }
  }, [])

  const show = useCallback((id: SocialId) => {
    activeRef.current = id
    setMounted((m) => (m.includes(id) ? m : [...m, id]))
    setActive(id)
  }, [])

  const hide = useCallback(() => {
    activeRef.current = null
    pos.current.snap = true
    setActive(null)
  }, [])

  // Delegated listeners on the document.
  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)')
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduce(rm.matches)
    const onRm = () => setReduce(rm.matches)
    rm.addEventListener('change', onRm)

    const linkOf = (t: EventTarget | null) =>
      t instanceof Element ? (t.closest('[data-social]') as HTMLElement | null) : null

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !canHover.matches) return
      const a = linkOf(e.target)
      const id = a?.dataset.social
      if (!a || !isSocialId(id)) return
      if (activeRef.current === id) return
      place(e.clientX - W / 2, e.clientY - H - GAP)
      show(id)
    }
    const onOut = (e: PointerEvent) => {
      const a = linkOf(e.target)
      if (!a || (e.relatedTarget instanceof Node && a.contains(e.relatedTarget))) return
      hide()
    }
    const onMove = (e: PointerEvent) => {
      if (activeRef.current && e.pointerType === 'mouse') place(e.clientX - W / 2, e.clientY - H - GAP)
    }
    const onFocusIn = (e: FocusEvent) => {
      if (!canHover.matches) return
      const a = linkOf(e.target)
      const id = a?.dataset.social
      if (!a || !isSocialId(id) || !a.matches(':focus-visible')) return
      const r = a.getBoundingClientRect()
      pos.current.snap = true
      place(r.left + r.width / 2 - W / 2, r.top - H - GAP / 2)
      show(id)
    }
    const onFocusOut = (e: FocusEvent) => { if (linkOf(e.target)) hide() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && activeRef.current) hide() }
    const onScroll = () => { if (activeRef.current) hide() }

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      rm.removeEventListener('change', onRm)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [place, show, hide])

  // Follow with a little easing while visible (instant with reduced motion).
  useEffect(() => {
    if (!active) return
    let raf = 0
    const loop = () => {
      const p = pos.current
      const k = reduce ? 1 : 0.25
      p.x += (p.tx - p.x) * k
      p.y += (p.ty - p.y) * k
      if (floatRef.current) floatRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [active, reduce])

  // Play the active clip from the start; pause and rewind the rest.
  useEffect(() => {
    for (const [id, v] of Object.entries(videos.current) as [SocialId, HTMLVideoElement | null][]) {
      if (!v) continue
      if (id === active && !reduce) {
        v.currentTime = 0
        v.play().catch(() => {})
      } else {
        v.pause()
        v.currentTime = 0
      }
    }
  }, [active, reduce, mounted])

  return (
    <div ref={floatRef} className={clsx(s.float, active && s.on)} aria-hidden="true">
      {mounted.map((id) => {
        const m = SOCIAL_PREVIEWS[id]
        if (!m) return null
        const on = id === active
        if (reduce || (!m.webm && !m.mp4)) {
          return m.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={id} src={m.poster} alt="" className={clsx(s.media, on && s.mediaOn)} decoding="async" />
          ) : null
        }
        return (
          <video
            key={id}
            ref={(el) => { videos.current[id] = el }}
            className={clsx(s.media, on && s.mediaOn)}
            poster={m.poster}
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            tabIndex={-1}
          >
            {m.webm && <source src={m.webm} type="video/webm" />}
            {m.mp4 && <source src={m.mp4} type="video/mp4" />}
          </video>
        )
      })}
    </div>
  )
}
