'use client'

// ─── Gallery 2 · "More from the feed" rail ───────────────────────────────────
// The same latest IG + Dribbble items as the Latest strip, as an endless flat
// row of square-cornered cards (inspired by jesperlandberg.com, our own
// deformation: rail.ts). A normal-height section in the page flow: it is NOT
// pinned and does NOT react to the page scroll or the wheel at all.
//   · moves in HITS, one card at a time (feed-strip/hit.ts, shared with the
//     Latest strip): the next card's left edge comes to the content margin
//     with a strong ease-in-out (cubic-bezier(.76,0,.24,1), HIT_MS), then
//     rests HIT_PAUSE; the hit's velocity drives the fisheye (barrel, rubber
//     bend, bulge, stretch, squash) and the RGB split, clean and flat at rest;
//   · drag only (mouse / pen / horizontal touch swipe; touch-action: pan-y so
//     vertical page scroll always passes through): the row follows the
//     pointer 1:1 and deforms with the drag speed; the release snaps with the
//     same ease to the card nearest to where the throw would land, leaving at
//     the throw's speed (inertia);
//   · hover / drag / focus pause the hits; they resume RESUME_MS after;
//   · cards are real <a> links (new tab) laid over the canvas at the rest
//     rect of their nearest repeat; a click without drag opens the post;
//     captions `IG · MM/YYYY` fade while moving; focusing a card centres it;
//   · paused off-screen / hidden tab; the loop sleeps between hits; dpr ≤ 2.
//   · reduced motion or no WebGL2: a plain horizontally scrollable row (the
//     same links with <img>), no auto-advance, no deformation.
import { useEffect, useRef, useState } from 'react'
import type { LatestItem } from '@/content/latest-feed'
import { parseColor, splitMag } from '@/components/wip/bg/theme'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import { MAX_CARDS } from '@/components/feed-strip/strip'
import { HIT_MS, HIT_PAUSE, MAXV, RESUME_MS, THROW_MS, tweenAt, type Tween } from '@/components/feed-strip/hit'
import { createRail, hitRail, layoutRail, type Rail, type RailFx, type RailGeo } from './rail'
import s from './rail.module.scss'

const ratio = (w: number, h: number) => Math.min(1.5, Math.max(0.56, w / h))
const mmyyyy = (d: string) => `${d.slice(5, 7)}/${d.slice(0, 4)}`
const thumb = (src: string) => (src.startsWith('/feed/') ? src.replace('/feed/', '/feed/t/') : src)
const tag = (it: LatestItem) => (it.source === 'instagram' ? 'IG' : 'DRB')

const AMT_V = 22      // px/frame where the deformation reaches ≈ 63 %

export default function FeedRail({ items, ariaLabel, label }: { items: LatestItem[]; ariaLabel: string; label: string }) {
  const [mode, setMode] = useState<'row' | 'gl'>('row')
  const secRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const cvRef = useRef<HTMLCanvasElement>(null)
  const rowRef = useRef<HTMLUListElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const api = useRef<{ focus: (i: number) => void; blur: () => void } | null>(null)
  const list = items.slice(0, MAX_CARDS)

  // Decide the mode once on the client.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const probe = document.createElement('canvas').getContext('webgl2')
    if (probe) setMode('gl')
  }, [])

  useEffect(() => {
    if (mode !== 'gl' || !list.length) return
    const sec = secRef.current!, stage = stageRef.current!, cv = cvRef.current!, row = rowRef.current!, head = headRef.current!, probe = probeRef.current!
    const links = Array.from(row.querySelectorAll<HTMLAnchorElement>('a'))
    const small = window.innerWidth <= 800
    const cards = list.map((it) => ({ src: small ? thumb(it.src) : it.src, ratio: ratio(it.w, it.h) }))
    let rail: Rail | null = null
    try { rail = createRail(cv, cards, small, () => wake()) } catch { rail = null }
    if (!rail) { setMode('row'); return }
    const rl = rail
    const offs: (() => void)[] = []
    const on = <T extends EventTarget>(t: T, ev: string, fn: (e: never) => void, opt?: AddEventListenerOptions) => {
      t.addEventListener(ev, fn as EventListener, opt)
      offs.push(() => t.removeEventListener(ev, fn as EventListener, opt))
    }

    let g: RailGeo = { W: 1, H: 1, cy: 0, hc: 1 }
    let L = layoutRail(cards, 1, 16)
    let m = 20
    let colors = { bg: [0, 0, 0] as [number, number, number], stage: [0.05, 0.05, 0.05] as [number, number, number] }
    const readColors = () => {
      const cs = getComputedStyle(stage)
      colors = { bg: parseColor(cs.getPropertyValue('--c-bg'), [0.063, 0.063, 0.055]), stage: parseColor(cs.getPropertyValue('--c-stage'), [0.05, 0.05, 0.045]) }
    }
    readColors()

    // off = strip px at the canvas's left edge (card i's left edge on screen = xs[i] − off).
    let off = 0, poff = 0, sv = 0
    let tw: Tween | null = null
    let dragging = false, inside = false, focusIdx = -1
    let lastTouch = -Infinity
    let nextHit = performance.now() + HIT_PAUSE
    let last = performance.now()
    let onScreen = false
    const fx: RailFx = { off: 0, amt: 0, bend: 0, split: 0 }

    // Snap points: a card's left edge on the content margin, every repeat.
    const snaps = (x: number) => {
      const P = L.period
      const base = x - (((x % P) + P) % P)
      const out: number[] = []
      for (let k = -1; k <= 2; k++) for (let i = 0; i < L.xs.length; i++) out.push(base + k * P + L.xs[i] - m)
      return out
    }
    const nearestSnap = (x: number) => snaps(x).reduce((a, c) => (Math.abs(c - x) < Math.abs(a - x) ? c : a), Infinity)
    const nextSnap = (x: number) => Math.min(...snaps(x).filter((c) => c > x + 0.5))
    // Card i centred on screen, the repeat nearest to x.
    const centreOf = (i: number, x: number) => {
      const c = L.xs[i] + L.ws[i] / 2 - g.W / 2
      return c + Math.round((x - c) / L.period) * L.period
    }
    const go = (to: number, v0 = 0) => {
      if (Math.abs(to - off) < 0.5) { off = to; tw = null; return }
      tw = { from: off, to, t0: performance.now(), dur: HIT_MS, v0 }
    }

    function resize() {
      const W = stage.clientWidth, H = stage.clientHeight
      if (!W || !H) return
      // Card height = --rail-card, read from a probe (rail.module.scss).
      const hc = probe.offsetHeight || Math.round(H / 1.5)
      const frac = (off + m) / L.period
      g = { W, H, cy: H / 2, hc }
      L = layoutRail(cards, hc, Math.round(Math.max(12, hc * 0.06)))
      m = parseFloat(getComputedStyle(head).paddingLeft) || 20
      off = poff = nearestSnap(frac * L.period - m)
      tw = null
      cv.style.width = `${W}px`; cv.style.height = `${H}px`
      rl.resize(W, H, Math.min(2, window.devicePixelRatio || 1))
      links.forEach((a, i) => { a.style.width = `${L.ws[i]}px`; a.style.height = `${hc}px` })
      frame(performance.now(), true)
    }

    function frame(now: number, force = false) {
      const dt = Math.min(4, Math.max(0.25, (now - last) / 16.667))
      last = now
      const idle = !dragging && !inside && focusIdx < 0 && now - lastTouch > RESUME_MS
      if (idle && !tw && now >= nextHit) {
        go(nextSnap(off))
        nextHit = now + HIT_MS + HIT_PAUSE
      }
      if (!idle) nextHit = Math.max(nextHit, lastTouch + RESUME_MS)
      if (!dragging && tw) {
        const [o, done] = tweenAt(tw, now)
        off = o
        if (done) tw = null
      }
      // Velocity (px/frame) → deformation + split; clean at rest.
      const d = off - poff
      poff = off
      sv += (d / dt - sv) * (1 - Math.pow(0.5, dt))
      if (!dragging && !tw && Math.abs(sv) < 0.02) sv = 0
      const sp = Math.abs(sv)
      fx.off = off
      fx.amt = 1 - Math.exp(-sp / AMT_V)
      fx.bend = Math.max(-g.hc * 0.32, Math.min(g.hc * 0.32, sv * 2.2))
      fx.split = splitMag(sp) * Math.sign(sv)
      rl.draw(g, L, fx, colors.bg, colors.stage)
      // Links at the rest rect of the repeat nearest the screen centre.
      const top = g.cy - g.hc / 2, P = L.period
      for (let i = 0; i < links.length; i++) {
        let c = L.xs[i] + L.ws[i] / 2 - off - g.W / 2
        c -= Math.round(c / P) * P
        links[i].style.transform = `translate3d(${(c + g.W / 2 - L.ws[i] / 2).toFixed(1)}px, ${top}px, 0)`
      }
      row.style.setProperty('--rail-cap', (1 - Math.min(1, fx.amt * 1.6)).toFixed(3))
      ;(window as unknown as { __rail?: object }).__rail = { off, v: sv, amt: fx.amt, bend: fx.bend, split: fx.split, hit: !!tw, dragging, nextHit } // QA probe
      if (force) return false
      return dragging || tw !== null || sp > 0 || rl.pending()
    }

    let raf = 0, resumeT = 0
    function tick(now: number) {
      raf = 0
      if (document.hidden || !onScreen) return
      if (frame(now)) { raf = requestAnimationFrame(tick); return }
      // Asleep between hits: wake when the next one is due.
      clearTimeout(resumeT)
      const wait = Math.max(nextHit, lastTouch + RESUME_MS) - performance.now()
      if (!inside && focusIdx < 0) resumeT = window.setTimeout(wake, Math.max(16, wait + 16))
    }
    function wake() { if (!raf && !document.hidden && onScreen) { last = performance.now() - 16.7; raf = requestAnimationFrame(tick) } }
    const touch = () => { lastTouch = performance.now() }

    // ── drag (the only pointer motion input) ──
    let pid: number | null = null, x0 = 0, y0 = 0, lx = 0, moved = false, suppress = false
    let hist: { x: number; t: number }[] = []
    on(stage, 'pointerdown', (e: PointerEvent) => {
      if (e.button > 0 || pid !== null) return
      pid = e.pointerId; x0 = lx = e.clientX; y0 = e.clientY; moved = false; suppress = false
      hist = [{ x: lx, t: e.timeStamp }]
      touch(); wake()
    })
    on(window, 'pointermove', (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      let dx = e.clientX - lx
      lx = e.clientX
      if (!moved) {
        const ax = Math.abs(lx - x0), ay = Math.abs(e.clientY - y0)
        if (ax > 6 && ax > ay) {
          moved = true; dragging = true; suppress = true; dx = lx - x0; tw = null
          try { stage.setPointerCapture(e.pointerId) } catch {}
          document.documentElement.classList.add(s.dragging)
          window.getSelection()?.removeAllRanges()
        } else if (ay > 10 && e.pointerType !== 'mouse') { pid = null; return }
      }
      if (!moved) return
      hist.push({ x: lx, t: e.timeStamp }); if (hist.length > 6) hist.shift()
      off -= dx
      touch(); wake()
    })
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      pid = null
      document.documentElement.classList.remove(s.dragging)
      if (!moved) return
      dragging = false
      // Snap (same ease) to the card nearest to where the throw would land.
      const h0 = hist[0], h1 = hist[hist.length - 1], dt = Math.max(16, h1.t - h0.t)
      const v = e.timeStamp - h1.t <= 120 ? -Math.max(-MAXV, Math.min(MAXV, (h1.x - h0.x) / dt)) : 0
      go(nearestSnap(off + v * THROW_MS), v)
      touch(); wake()
    }
    on(window, 'pointerup', up)
    on(window, 'pointercancel', up)
    on(stage, 'dragstart', (e: Event) => e.preventDefault())
    // A drag never ends in a click (links included); a plain click on the
    // canvas between links opens the card under it with the deformed map.
    on(stage, 'click', (e: MouseEvent) => {
      if (suppress) { suppress = false; e.preventDefault(); e.stopPropagation(); return }
      if ((e.target as HTMLElement).closest('a')) return
      const r = stage.getBoundingClientRect()
      const i = hitRail(g, L, fx, e.clientX - r.left, e.clientY - r.top)
      if (i >= 0) window.open(list[i].url, '_blank', 'noopener,noreferrer')
    }, { capture: true })
    on(stage, 'pointerenter', (e: PointerEvent) => { if (e.pointerType === 'mouse') { inside = true; touch(); wake() } })
    on(stage, 'pointerleave', () => { inside = false; touch(); wake() })
    on(document, 'visibilitychange', () => { if (!document.hidden) wake() })

    // Keyboard: focusing a card centres it.
    api.current = {
      focus(i) { focusIdx = i; go(centreOf(i, off)); touch(); wake() },
      blur() { focusIdx = -1; touch(); wake() },
    }

    const mo = new MutationObserver(() => { readColors(); wake() })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-page-theme'] })
    const ro = new ResizeObserver(() => resize())
    ro.observe(stage)
    const io = new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) wake() }, { rootMargin: '100px 0px' })
    io.observe(sec)

    resize()
    nextHit = performance.now() + HIT_PAUSE
    return () => {
      cancelAnimationFrame(raf); clearTimeout(resumeT)
      offs.forEach((f) => f())
      mo.disconnect(); ro.disconnect(); io.disconnect()
      rl.destroy()
      api.current = null
      document.documentElement.classList.remove(s.dragging)
      links.forEach((a) => { a.style.transform = ''; a.style.width = ''; a.style.height = '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, mode])

  return (
    <section
      ref={secRef}
      className={s.band}
      data-mode={mode}
      aria-label={ariaLabel}
    >
      <div className={s.inner}>
        <div ref={headRef} className={s.head}>
          <ElasticLine className={s.rule} />
          <p className={s.label}>{label}</p>
        </div>
        <div ref={stageRef} className={s.stage} data-cursor={mode === 'gl' ? 'drag' : undefined}>
          {mode === 'gl' && <canvas ref={cvRef} className={s.gl} aria-hidden="true" data-cursor="drag" />}
          <span ref={probeRef} className={s.probe} aria-hidden="true" />
          <ul ref={rowRef} className={s.row}>
            {list.map((it, i) => (
              <li key={it.id} className={s.item} style={{ ['--r' as string]: ratio(it.w, it.h) }}>
                <a
                  className={s.card}
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-no-transition=""
                  data-cursor="view"
                  draggable={false}
                  aria-label={`${it.title} · ${it.source === 'instagram' ? 'Instagram' : 'Dribbble'} · ${mmyyyy(it.date)}`}
                  onFocus={() => api.current?.focus(i)}
                  onBlur={() => api.current?.blur()}
                >
                  {mode === 'row' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb(it.src)} alt="" loading="lazy" decoding="async" draggable={false} />
                  )}
                  <span className={s.cap} aria-hidden="true">
                    <span className={s.dot} />
                    {tag(it)} · {mmyyyy(it.date)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
