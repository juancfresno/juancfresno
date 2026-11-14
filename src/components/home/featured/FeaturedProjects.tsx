'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import { FEATURED_FRAME as F, FEATURED_LABEL, type FeaturedPiece } from '@/content/featured-preview'
import { PixelCover } from './entrance'
import { createMaterial, isMaterial, MATERIAL_PAD, type Material, type MaterialId } from './materials'
import MaterialMenu from './MaterialMenu'
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
//  · Press: the piece turns into its material and settles when let go. The
//    side tab (MaterialMenu) picks it: cloth, silk, liquid or paper
//    (materials.ts); the choice is kept in localStorage['featured:material'].
//  · Video (optional, per piece): a muted loop over the screen inside the
//    frame; plays only while near the viewport, shows once the first frame
//    is playing (the image underneath is the poster). The material uses the image.
// Reduced motion: no pixels, no parallax, no cloth.

const GAP = 260 // ms between two pieces starting their entrance (or exit)
const DUR = 760 // ms for a full pixel sweep
const LINE = 0.8 // trigger line, fraction of the viewport height
const HYST = 24 // px below the line before a piece leaves again (no flicker)

const MAT_KEY = 'featured:material'

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`

export default function FeaturedProjects({ pieces, label }: { pieces: FeaturedPiece[]; label: string }) {
  const root = useRef<HTMLElement>(null)
  const [mat, setMat] = useState<MaterialId>('cloth')
  const matRef = useRef<MaterialId>('cloth')
  const api = useRef<{ swap: () => void } | null>(null)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MAT_KEY)
      if (isMaterial(saved)) { matRef.current = saved; setMat(saved) }
    } catch { /* storage blocked */ }
  }, [])
  const pick = useCallback((m: MaterialId) => {
    matRef.current = m
    setMat(m)
    try { localStorage.setItem(MAT_KEY, m) } catch { /* storage blocked */ }
    api.current?.swap()
  }, [])
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

    // ── Material on press (side tab: cloth / silk / liquid / paper) ──
    type Slot = { c: HTMLElement; media: HTMLElement; img: HTMLImageElement; inst?: Material | null; canvas: HTMLCanvasElement | null; kind?: MaterialId; active: boolean }
    const slots: Slot[] = cards.map((c) => {
      const media = c.querySelector<HTMLElement>('[data-media]')!
      return { c, media, img: media.querySelector('img')!, canvas: null, active: false }
    })
    const drop = (k: Slot) => { k.inst?.destroy(); k.canvas?.remove(); k.inst = undefined; k.canvas = null; k.active = false; k.media.dataset.cloth = '' }
    const ensure = (k: Slot) => {
      const kind = matRef.current
      if (k.inst !== undefined && k.kind === kind && k.canvas?.dataset.w === String(k.media.offsetWidth)) return k.inst
      drop(k)
      const w = k.media.offsetWidth, h = k.media.offsetHeight
      const pad = Math.round(Math.min(w, h) * MATERIAL_PAD[kind]) // room for the drag + cast shadow
      const canvas = document.createElement('canvas')
      canvas.className = s.cloth
      canvas.dataset.w = String(w)
      canvas.style.cssText = `left:${-pad}px;top:${-pad}px;width:${w + pad * 2}px;height:${h + pad * 2}px`
      k.media.appendChild(canvas)
      k.canvas = canvas
      k.kind = kind
      k.inst = createMaterial(kind, { canvas, img: k.img, w, h, pad, onSleep: () => { k.active = false; k.media.dataset.cloth = '' } })
      return k.inst
    }
    const start = (k: Slot, x: number, y: number) => {
      if (!k.img.complete || !k.c.dataset.shown) return false
      const inst = ensure(k)
      if (!inst) return false
      inst.press(x, y)
      k.active = true
      k.media.dataset.cloth = '1'
      k.media.dataset.held = '1'
      return true
    }
    const end = (k: Slot) => {
      if (!k.media.dataset.held) return
      k.media.dataset.held = ''
      k.inst?.release()
    }
    const offs: (() => void)[] = []
    for (const k of slots) {
      const { media } = k
      const local = (e: PointerEvent) => {
        const r = media.getBoundingClientRect()
        return [((e.clientX - r.left) / r.width) * media.offsetWidth, ((e.clientY - r.top) / r.height) * media.offsetHeight] as const
      }
      const down = (e: PointerEvent) => {
        if (e.button !== 0) return
        const [x, y] = local(e)
        if (!start(k, x, y)) return
        e.preventDefault()
        try { media.setPointerCapture(e.pointerId) } catch { /* synthetic / already gone */ }
      }
      const move = (e: PointerEvent) => {
        if (!k.active || !media.dataset.held) return
        const [x, y] = local(e)
        k.inst?.move(x, y)
      }
      const up = () => end(k)
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

    // Switching material: idle cards drop their canvas (the next press builds
    // the new one) and the card nearest the screen centre shows it once.
    let demoRaf = 0, demoTo = 0
    api.current = {
      swap() {
        cancelAnimationFrame(demoRaf); clearTimeout(demoTo)
        for (const k of slots) if (!k.media.dataset.held) drop(k)
        const vh2 = window.innerHeight / 2
        let best: Slot | null = null, bd = Infinity
        for (const k of slots) {
          const r = k.media.getBoundingClientRect()
          if (!k.c.dataset.shown || r.top < 0 || r.bottom > window.innerHeight) continue
          const d = Math.abs(r.top + r.height / 2 - vh2)
          if (d < bd) { bd = d; best = k }
        }
        if (!best) return
        const k = best, w = k.media.offsetWidth, h = k.media.offsetHeight
        const x0 = w * 0.8, y0 = h * 0.76, x1 = w * 0.52, y1 = h * 0.5
        if (!start(k, x0, y0)) return
        const t0 = performance.now(), T = 720
        const run = (t: number) => {
          const u = Math.min(1, (t - t0) / T), e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2
          k.inst?.move(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e)
          if (u < 1) demoRaf = requestAnimationFrame(run)
          else demoTo = window.setTimeout(() => end(k), 160)
        }
        demoRaf = requestAnimationFrame(run)
      },
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
      slots.forEach(drop)
      cancelAnimationFrame(demoRaf); clearTimeout(demoTo)
      api.current = null
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
      <MaterialMenu value={mat} onChange={pick} />
    </section>
  )
}
