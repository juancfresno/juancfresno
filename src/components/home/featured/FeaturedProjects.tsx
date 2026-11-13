'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import { FEATURED_FRAME as F, FEATURED_LABEL, type FeaturedPiece } from '@/content/featured-preview'
import { createCloth, type Cloth } from './cloth'
import s from './featured.module.scss'

// Home · featured projects — Figma "04 · Archivo" (7173:7118). Free layout
// on the 1680 frame (percentages, liquid), stacked on mobile.
//  · Entrance: each piece drops in through 12 columns, staggered left → right
//    (the social-clip wipe from SocialPreview), one piece after another as
//    they reach the viewport.
//  · Scroll: every piece has its own speed (parallax) and follows the page
//    with a little lag (lerp), plus a slight skew from the scroll velocity.
//  · Press: the piece turns into cloth (cloth.ts) and settles when let go.
// Reduced motion: no wipe, no parallax, no cloth.

const COLS = 12
const GAP = 170 // ms between two pieces starting their wipe

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`

export default function FeaturedProjects({ pieces, label }: { pieces: FeaturedPiece[]; label: string }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-piece]'))
    if (reduced) {
      cards.forEach((c) => (c.dataset.in = '1'))
      return
    }

    // ── Entrance queue ──
    let nextAt = 0
    const io = new IntersectionObserver(
      (entries) => {
        const hits = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        for (const e of hits) {
          const c = e.target as HTMLElement
          io.unobserve(c)
          const now = performance.now()
          const at = Math.max(now, nextAt)
          nextAt = at + GAP
          window.setTimeout(() => (c.dataset.in = '1'), at - now)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    )
    cards.forEach((c) => io.observe(c))

    // ── Parallax with lag ──
    const mobile = window.matchMedia('(max-width: 768px)')
    const st = cards.map((c) => ({ c, speed: +(c.dataset.speed || 1), y: 0, base: 0 }))
    let vh = window.innerHeight
    const measure = () => {
      vh = window.innerHeight
      const sy = window.scrollY
      for (const p of st) {
        // Layout position without the current transform.
        const r = p.c.getBoundingClientRect()
        p.base = r.top + sy - p.y + r.height / 2
      }
    }
    measure()
    let raf = 0
    let last = 0
    let lastY = window.scrollY
    let vel = 0
    let skew = 0
    const tick = (t: number) => {
      raf = 0
      const dt = last ? Math.min(64, t - last) : 16.7
      last = t
      const sy = window.scrollY
      const k = 1 - Math.exp(-dt / 110) // lag
      vel += ((sy - lastY) / dt - vel) * (1 - Math.exp(-dt / 80))
      lastY = sy
      skew += (Math.max(-1.6, Math.min(1.6, vel * 0.9)) - skew) * k
      const amt = mobile.matches ? 0.45 : 1
      let moving = Math.abs(skew) > 0.01
      for (const p of st) {
        const target = (p.base - sy - vh / 2) * (1 - p.speed) * amt
        p.y += (target - p.y) * k
        if (Math.abs(target - p.y) > 0.1) moving = true
        p.c.style.transform = `translate3d(0, ${p.y.toFixed(2)}px, 0) skewY(${(skew * (p.speed - 0.8)).toFixed(3)}deg)`
      }
      if (moving) raf = requestAnimationFrame(tick)
      else last = 0
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick) }
    const onResize = () => { measure(); kick() }
    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(onResize)
    ro.observe(el)
    kick()

    // ── Cloth on press ──
    const cloths = new Map<HTMLElement, Cloth | null>()
    const offs: (() => void)[] = []
    for (const c of cards) {
      const media = c.querySelector<HTMLElement>('[data-media]')!
      const img = media.querySelector('img')!
      let cloth: Cloth | null | undefined
      let canvas: HTMLCanvasElement | null = null
      let active = false
      const local = (e: PointerEvent) => {
        const r = media.getBoundingClientRect()
        return [((e.clientX - r.left) / r.width) * media.offsetWidth, ((e.clientY - r.top) / r.height) * media.offsetHeight] as const
      }
      const down = (e: PointerEvent) => {
        if (e.button !== 0 || !img.complete || !c.dataset.in) return
        if (cloth === undefined || (canvas && (canvas.dataset.w !== String(media.offsetWidth)))) {
          cloths.get(c)?.destroy()
          canvas?.remove()
          const w = media.offsetWidth, h = media.offsetHeight
          const pad = Math.round(Math.min(w, h) * 0.45) // room for the drag + cast shadow
          canvas = document.createElement('canvas')
          canvas.className = s.cloth
          canvas.dataset.w = String(w)
          canvas.style.cssText = `left:${-pad}px;top:${-pad}px;width:${w + pad * 2}px;height:${h + pad * 2}px`
          media.appendChild(canvas)
          cloth = createCloth({
            canvas, img, w, h, pad,
            onSleep: () => { active = false; media.dataset.cloth = '' },
          })
          cloths.set(c, cloth)
        }
        if (!cloth) return
        e.preventDefault()
        try { media.setPointerCapture(e.pointerId) } catch { /* synthetic / already gone */ }
        const [x, y] = local(e)
        cloth.press(x, y)
        active = true
        media.dataset.cloth = '1'
        media.dataset.held = '1'
      }
      const move = (e: PointerEvent) => {
        if (!active || !cloth || !media.dataset.held) return
        const [x, y] = local(e)
        cloth.move(x, y)
      }
      const up = () => {
        if (!media.dataset.held) return
        media.dataset.held = ''
        cloth?.release()
      }
      media.addEventListener('pointerdown', down)
      media.addEventListener('pointermove', move)
      media.addEventListener('pointerup', up)
      media.addEventListener('pointercancel', up)
      media.addEventListener('lostpointercapture', up)
      offs.push(() => {
        media.removeEventListener('pointerdown', down)
        media.removeEventListener('pointermove', move)
        media.removeEventListener('pointerup', up)
        media.removeEventListener('pointercancel', up)
        media.removeEventListener('lostpointercapture', up)
      })
    }

    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', onResize)
      offs.forEach((f) => f())
      cloths.forEach((c) => c?.destroy())
    }
  }, [])

  return (
    <section ref={root} className={s.module} aria-label={label.replace(/^\/\s*/, '')} style={{ '--fh': F.h, '--fw': F.w } as CSSProperties}>
      <div className={s.frame}>
        <div className={s.label} style={{ left: pct(FEATURED_LABEL.x, F.w), width: pct(FEATURED_LABEL.w, F.w), top: pct(FEATURED_LABEL.y, F.h) }}>
          <ElasticLine className={s.rule} />
          <p className={s.labelText}>{label}</p>
        </div>
        <ul className={s.list}>
          {pieces.map((p, i) => (
            <li
              key={p.key}
              data-piece=""
              data-speed={p.speed}
              className={`${s.piece} ${p.w > p.h * 1.3 ? s.wide : s.tall} ${i % 2 ? s.odd : s.even}`}
              style={{ left: pct(p.x, F.w), top: pct(p.y, F.h), width: pct(p.w, F.w), '--ar': `${p.w} / ${p.h}` } as CSSProperties}
            >
              <div className={s.media} data-media="">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt="" width={p.w * 2} height={p.h * 2} className={s.img} loading="lazy" decoding="async" draggable={false} />
                <span className={s.cols} aria-hidden="true">
                  {Array.from({ length: COLS }, (_, c) => (
                    <span key={c} style={{ '--c': c } as CSSProperties} />
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
