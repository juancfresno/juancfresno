'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import { FEATURED_FRAME as F, FEATURED_LABEL, type FeaturedPiece } from '@/content/featured-preview'
import { PixelCover } from './entrance'
import { createCloth, type Cloth } from './cloth'
import s from './featured.module.scss'

// Home · featured projects — Figma "04 · Archivo" (7173:7118). Free layout
// on the 1680 frame (percentages, liquid), stacked on mobile.
//  · Entrance: a trigger line at LINE × the viewport height. When a piece's
//    top crosses it going down, the piece clears in Bayer-dithered pixels
//    sweeping left → right (entrance.ts); scrolling back above the line it
//    covers again the same way, played backwards. Pieces that cross in the
//    same moment (load, fast scroll) go one after another, GAP apart.
//  · Scroll: every piece has its own speed (parallax) and follows the page
//    with a little lag (lerp), plus a slight skew from the scroll velocity.
//  · Press: the piece turns into cloth (cloth.ts) and settles when let go.
//  · Video (optional, per piece): a muted loop over the screen inside the
//    frame; plays only while near the viewport, shows once the first frame
//    is playing (the image underneath is the poster). The cloth uses the image.
// Reduced motion: no pixels, no parallax, no cloth.

const GAP = 260 // ms between two pieces starting their entrance (or exit)
const DUR = 760 // ms for a full pixel sweep
const LINE = 0.8 // trigger line, fraction of the viewport height
const HYST = 24 // px below the line before a piece leaves again (no flicker)

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`

export default function FeaturedProjects({ pieces, label }: { pieces: FeaturedPiece[]; label: string }) {
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-piece]'))
    if (reduced) {
      cards.forEach((c) => { c.dataset.in = '1'; c.dataset.shown = '1' })
      return
    }

    // ── Videos: loop while on screen, paused (and not downloaded) otherwise ──
    const videos = Array.from(el.querySelectorAll<HTMLVideoElement>('[data-video]'))
    const vio = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const v = en.target as HTMLVideoElement
        if (en.isIntersecting) {
          v.play().then(() => { v.dataset.playing = '1' }).catch(() => { /* autoplay blocked: the image stays */ })
        } else v.pause()
      }
    }, { rootMargin: '200px 0px' })
    videos.forEach((v) => vio.observe(v))

    // ── Entrance on a screen line (reversible pixels) ──
    const ent = cards.map((c) => ({ c, cover: new PixelCover(c.querySelector<HTMLElement>('[data-media]')!), p: 0, target: 0, startAt: 0 }))
    let lastIn = 0, lastOut = 0
    let araf = 0, alast = 0
    const animate = (t: number) => {
      araf = 0
      const dt = alast ? Math.min(64, t - alast) : 16.7
      alast = t
      const now = performance.now()
      let busy = false
      for (const e of ent) {
        if (e.p === e.target) continue
        busy = true
        if (now < e.startAt) continue
        const step = dt / DUR
        e.p = e.target > e.p ? Math.min(e.target, e.p + step) : Math.max(e.target, e.p - step)
        e.cover.draw(e.p)
        const isIn = e.p > 0, isShown = e.p >= 1
        if (isIn !== ('in' in e.c.dataset)) { if (isIn) e.c.dataset.in = '1'; else delete e.c.dataset.in }
        if (isShown !== ('shown' in e.c.dataset)) { if (isShown) e.c.dataset.shown = '1'; else delete e.c.dataset.shown }
      }
      if (busy) araf = requestAnimationFrame(animate)
      else alast = 0
    }
    // The home entrance (wip/Intro.tsx) goes first: no piece comes in while the
    // wireframe is still up; the first ones follow the copy once it hands over.
    const html = document.documentElement
    const held = () => (html.dataset.intro === 'full' || html.dataset.intro === 'fast') && !('introGo' in html.dataset)
    let goTimer = 0
    const onGo = () => { goTimer = window.setTimeout(check, html.dataset.intro === 'fast' ? 200 : 400) }
    window.addEventListener('wip:intro-go', onGo)
    const check = () => {
      if (held()) return
      const now = performance.now()
      const line = window.innerHeight * LINE
      const rs = ent.map((e) => ({ e, top: e.c.getBoundingClientRect().top }))
      const ins = rs.filter(({ e, top }) => e.target === 0 && top < line).sort((a, b) => a.top - b.top)
      const outs = rs.filter(({ e, top }) => e.target === 1 && top > line + HYST).sort((a, b) => b.top - a.top)
      for (const { e } of ins) { e.target = 1; e.startAt = Math.max(now, lastIn + GAP); lastIn = e.startAt }
      for (const { e } of outs) { e.target = 0; e.startAt = Math.max(now, lastOut + GAP); lastOut = e.startAt }
      if ((ins.length || outs.length) && !araf) araf = requestAnimationFrame(animate)
    }
    ent.forEach((e) => e.cover.draw(0))

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
      check()
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
        if (e.button !== 0 || !img.complete || !c.dataset.shown) return
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
      window.removeEventListener('wip:intro-go', onGo)
      window.clearTimeout(goTimer)
      vio.disconnect()
      cancelAnimationFrame(araf)
      ent.forEach((e) => e.cover.destroy())
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
        <div className={s.label} data-in="fade" data-wire="LABEL" style={{ left: pct(FEATURED_LABEL.x, F.w), width: pct(FEATURED_LABEL.w, F.w), top: pct(FEATURED_LABEL.y, F.h), '--in-d': '460ms' } as CSSProperties}>
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
                {p.video && (
                  <video
                    className={s.video}
                    data-video=""
                    src={p.video.src}
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-hidden="true"
                    tabIndex={-1}
                    style={{ left: pct(p.video.box.x, p.w), top: pct(p.video.box.y, p.h), width: pct(p.video.box.w, p.w), height: pct(p.video.box.h, p.h) }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
