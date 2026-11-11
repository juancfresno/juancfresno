'use client'

import { useEffect, useRef } from 'react'
import type { LatestItem } from '@/content/latest-feed'
import s from './latestFeed.module.scss'

const ratio = (w: number, h: number) => Math.min(1.5, Math.max(0.56, w / h))
const mmyyyy = (d: string) => `${d.slice(5, 7)}/${d.slice(0, 4)}`

function Cards({ items, dup }: { items: LatestItem[]; dup?: boolean }) {
  return (
    <ul className={s.set} aria-hidden={dup || undefined}>
      {items.map((it) => (
        <li key={it.id} className={s.cell} style={{ aspectRatio: ratio(it.w, it.h) }}>
          <a
            className={s.item}
            href={it.url}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={dup ? -1 : undefined}
            aria-label={`${it.title} · ${it.source === 'instagram' ? 'Instagram' : 'Dribbble'}`}
            data-no-transition=""
          >
            <span className={s.media}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.src.startsWith('/feed/') ? it.src.replace('/feed/', '/feed/t/') : it.src} alt="" loading="lazy" decoding="async" draggable={false} />
            </span>
            <span className={s.cap}>
              <span className={s.dot} aria-hidden="true" />
              {it.source === 'instagram' ? 'IG' : 'DRB'} · {mmyyyy(it.date)}
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

// One continuous row. The track holds two identical sets and a CSS animation
// moves it -50% (seamless). Page scroll velocity nudges the animation's
// playbackRate and eases back. Reduced motion / touch: native horizontal scroll.
export default function LatestMarquee({ items, ariaLabel }: { items: LatestItem[]; ariaLabel: string }) {
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = track.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce), (hover: none)').matches) return
    let anim: Animation | undefined
    let raf = 0
    let rate = 1
    let target = 1
    let lastY = window.scrollY
    let lastT = performance.now()
    let visible = true

    const frame = (t: number) => {
      raf = 0
      const dt = Math.max(1, t - lastT)
      const y = window.scrollY
      const v = (y - lastY) / dt // px per ms
      lastY = y
      lastT = t
      // Scroll down speeds the row up, scroll up slows it (never reverses).
      target = Math.max(0.35, Math.min(4, 1 + v * 2.2))
      rate += (target - rate) * 0.08
      if (Math.abs(rate - 1) < 0.01 && Math.abs(target - 1) < 0.01) rate = 1
      anim ??= el.getAnimations()[0]
      if (anim) anim.updatePlaybackRate(rate)
      if (visible && (rate !== 1 || Math.abs(v) > 0.001)) raf = requestAnimationFrame(frame)
    }
    const kick = () => { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(frame) } }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick() })
    io.observe(el)
    window.addEventListener('scroll', kick, { passive: true })
    return () => { io.disconnect(); window.removeEventListener('scroll', kick); cancelAnimationFrame(raf) }
  }, [])

  return (
    <div className={s.viewport} role="region" aria-label={ariaLabel} tabIndex={-1}>
      <div ref={track} className={s.track}>
        <Cards items={items} />
        <Cards items={items} dup />
      </div>
    </div>
  )
}
