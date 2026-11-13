'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import { FEATURED_FRAME as F, FEATURED_LABEL, FEATURED_PICKER, type FeaturedPiece } from '@/content/featured-preview'
import { DEFAULT_FX, FX, FX_LABEL, FX_STORE, isFx, pixelReveal, type Fx } from './entrance'
import { createCloth, type Cloth } from './cloth'
import s from './featured.module.scss'

// Home · featured projects — Figma "04 · Archivo" (7173:7118). Free layout
// on the 1680 frame (percentages, liquid), stacked on mobile.
//  · Entrance: each piece comes in from the left (variants in entrance.ts,
//    compared with the on-page picker), one piece after another as they
//    reach the viewport.
//  · Scroll: every piece has its own speed (parallax) and follows the page
//    with a little lag (lerp), plus a slight skew from the scroll velocity.
//  · Press: the piece turns into cloth (cloth.ts) and settles when let go.
// Reduced motion: no wipe, no parallax, no cloth.

const BANDS = 12 // slats / steps
const GAP = 170 // ms between two pieces starting their entrance

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`

export default function FeaturedProjects({ pieces, label }: { pieces: FeaturedPiece[]; label: string }) {
  const root = useRef<HTMLElement>(null)
  const [fx, setFx] = useState<Fx>(DEFAULT_FX)
  const picker = FEATURED_PICKER

  // Variant: ?in= wins, then the last pick (localStorage), then DEFAULT_FX.
  useEffect(() => {
    let v: string | null = new URLSearchParams(location.search).get('in')
    if (!isFx(v)) { try { v = localStorage.getItem(FX_STORE) } catch { v = null } }
    if (isFx(v) && v !== DEFAULT_FX) setFx(v)
  }, [])

  const pick = useCallback((f: Fx) => {
    setFx(f)
    try { localStorage.setItem(FX_STORE, f) } catch { /* private mode */ }
    const u = new URL(location.href)
    u.searchParams.set('in', f)
    history.replaceState(history.state, '', u)
    // Let React write data-fx first, then replay.
    requestAnimationFrame(() => root.current?.dispatchEvent(new Event('featured:replay')))
  }, [])

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-piece]'))
    if (reduced) {
      cards.forEach((c) => (c.dataset.in = '1'))
      return
    }

    // ── Entrance queue (variant = el.dataset.fx, see entrance.ts) ──
    let nextAt = 0
    let gen = 0 // bumps on replay so pending timers from a previous run are ignored
    const timers: number[] = []
    const show = (c: HTMLElement) => {
      if (el.dataset.fx === 'pixel') {
        const media = c.querySelector<HTMLElement>('[data-media]')!
        void pixelReveal(media)
      }
      c.dataset.in = '1'
    }
    const queue = (c: HTMLElement) => {
      const now = performance.now()
      const at = Math.max(now, nextAt)
      nextAt = at + GAP
      const g = gen
      timers.push(window.setTimeout(() => { if (g === gen) show(c) }, at - now))
    }
    const order = (a: DOMRect, b: DOMRect) => a.top - b.top || a.left - b.left
    const io = new IntersectionObserver(
      (entries) => {
        const hits = entries.filter((e) => e.isIntersecting).sort((a, b) => order(a.boundingClientRect, b.boundingClientRect))
        for (const e of hits) {
          io.unobserve(e.target)
          queue(e.target as HTMLElement)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    )
    cards.forEach((c) => io.observe(c))

    // Replay (picker): hide everything, then bring back what is on screen in
    // order; the rest waits for the viewport again.
    const replay = () => {
      gen++
      timers.forEach(clearTimeout)
      timers.length = 0
      nextAt = performance.now() + 120
      el.querySelectorAll('[data-media] > canvas:not([class])').forEach((n) => n.remove())
      // Back to the hidden state instantly (no reverse transition), then on.
      el.dataset.reset = ''
      cards.forEach((c) => { delete c.dataset.in; io.unobserve(c) })
      void el.offsetWidth
      delete el.dataset.reset
      const vis = cards
        .map((c) => ({ c, r: c.getBoundingClientRect() }))
        .filter(({ r }) => r.bottom > 0 && r.top < window.innerHeight * 0.88)
        .sort((a, b) => order(a.r, b.r))
      vis.forEach(({ c }) => queue(c))
      cards.filter((c) => !vis.some((v) => v.c === c)).forEach((c) => io.observe(c))
    }
    el.addEventListener('featured:replay', replay)

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
      gen++
      timers.forEach(clearTimeout)
      el.removeEventListener('featured:replay', replay)
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
    <section ref={root} className={s.module} data-fx={fx} aria-label={label.replace(/^\/\s*/, '')} style={{ '--fh': F.h, '--fw': F.w } as CSSProperties}>
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
                <span className={s.fx} aria-hidden="true">
                  {Array.from({ length: BANDS }, (_, c) => (
                    <span key={c} style={{ '--c': c } as CSSProperties} />
                  ))}
                </span>
                <span className={s.edge} aria-hidden="true" />
              </div>
            </li>
          ))}
        </ul>
      </div>
      {picker && <EntrancePicker fx={fx} onPick={pick} onReplay={() => root.current?.dispatchEvent(new Event('featured:replay'))} />}
    </section>
  )
}

function EntrancePicker({ fx, onPick, onReplay }: { fx: Fx; onPick: (f: Fx) => void; onReplay: () => void }) {
  return (
    <div className={s.picker} role="group" aria-label="Entrance">
      <span className={s.pickerLabel}>Entrance</span>
      {FX.map((f, i) => (
        <button key={f} type="button" className={s.pickerBtn} aria-pressed={f === fx} onClick={() => onPick(f)}>
          {String(i + 1).padStart(2, '0')} {FX_LABEL[f]}
        </button>
      ))}
      <button type="button" className={s.pickerBtn} onClick={onReplay}>↺ Replay</button>
    </div>
  )
}
