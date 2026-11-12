'use client'

// ─── Gallery 2 · "More from the feed" scroll rail ────────────────────────────
// The same latest IG + Dribbble items as the Latest strip, as a flat row of
// square-cornered cards that the PAGE SCROLL drives sideways (inspired by
// jesperlandberg.com, our own deformation: rail.ts).
//   · > 768 px: a pinned section. The panel sticks under the header
//     (top 72) while the section's extra height (= the row's overflow, 1:1)
//     scrolls by, so every vertical px moves the row one px: the whole row is
//     seen, the motion is 100 % the reader's scroll, and nothing hijacks the
//     wheel. ≤ 768 px: not pinned (keeps phone pages short); the row travels
//     while the section crosses the viewport. Native scroll in both.
//   · physics: the rendered offset follows the scroll target on an
//     under-damped spring (K, ZETA): real inertia while scrolling, overshoot
//     and a wobble when you stop. Its velocity drives the fisheye (barrel,
//     rubber bend, bulge, stretch, squash) and the RGB split: fast = crazy,
//     rest = clean and flat.
//   · cards are real <a> links (new tab) laid over the canvas at the rest
//     rect; captions `IG · MM/YYYY` (Sometype Mono) fade while moving; focus
//     scrolls the page until that card is centred.
//   · paused off-screen / hidden tab; the loop sleeps when settled; dpr ≤ 2.
//   · reduced motion or no WebGL2: a plain horizontally scrollable row (the
//     same links with <img>), no deformation, not pinned.
import { useEffect, useRef, useState } from 'react'
import type { LatestItem } from '@/content/latest-feed'
import { parseColor, splitMag } from '@/components/wip/bg/theme'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import { MAX_CARDS } from '@/components/feed-strip/strip'
import { createRail, hitRail, layoutRail, type Rail, type RailFx, type RailGeo } from './rail'
import s from './rail.module.scss'

const ratio = (w: number, h: number) => Math.min(1.5, Math.max(0.56, w / h))
const mmyyyy = (d: string) => `${d.slice(5, 7)}/${d.slice(0, 4)}`
const thumb = (src: string) => (src.startsWith('/feed/') ? src.replace('/feed/', '/feed/t/') : src)
const tag = (it: LatestItem) => (it.source === 'instagram' ? 'IG' : 'DRB')

const TOP = 72        // sticky top = header height
const K = 0.05        // spring stiffness, per 60 Hz frame²
const ZETA = 0.5      // damping ratio (< 1: overshoot ≈ 16 % of the lag)
const C = 2 * ZETA * Math.sqrt(K)
const AMT_V = 22      // px/frame where the deformation reaches ≈ 63 %
const PIN_MIN = 769   // pinned above this width

export default function FeedRail({ items, ariaLabel, label }: { items: LatestItem[]; ariaLabel: string; label: string }) {
  const [mode, setMode] = useState<'row' | 'gl'>('row')
  const [pinned, setPinned] = useState(false)
  const secRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const cvRef = useRef<HTMLCanvasElement>(null)
  const rowRef = useRef<HTMLUListElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const api = useRef<{ focus: (i: number) => void } | null>(null)
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
    let m = 20, travel = 0, pin = false, panelH = 0
    let colors = { bg: [0, 0, 0] as [number, number, number], stage: [0.05, 0.05, 0.05] as [number, number, number] }
    const readColors = () => {
      const cs = getComputedStyle(stage)
      colors = { bg: parseColor(cs.getPropertyValue('--c-bg'), [0.063, 0.063, 0.055]), stage: parseColor(cs.getPropertyValue('--c-stage'), [0.05, 0.05, 0.045]) }
    }
    readColors()

    let x = 0, v = 0, T = 0, sv = 0
    let last = performance.now()
    let onScreen = false
    const fx: RailFx = { off: 0, amt: 0, bend: 0, split: 0 }

    // Scroll → target offset.
    const target = () => {
      const r = sec.getBoundingClientRect()
      const vh = window.innerHeight
      const p = pin
        ? (TOP - r.top) / Math.max(1, r.height - panelH)
        : (vh - r.top) / Math.max(1, vh + r.height)
      return -m + Math.max(0, Math.min(1, p)) * travel
    }

    function resize() {
      const W = stage.clientWidth, H = stage.clientHeight
      if (!W || !H) return
      // Card height = --rail-card, read from a probe (rail.module.scss).
      const hc = probe.offsetHeight || Math.round(H / 1.5)
      g = { W, H, cy: H / 2, hc }
      L = layoutRail(cards, hc, Math.round(Math.max(12, hc * 0.06)))
      m = parseFloat(getComputedStyle(head).paddingLeft) || 20
      travel = Math.max(0, L.len - W + 2 * m)
      pin = window.innerWidth >= PIN_MIN
      panelH = window.innerHeight - TOP
      setPinned(pin)
      // Runway: the panel plus the row's overflow, 1:1 with the scroll.
      sec.style.height = pin ? `${Math.round(panelH + travel)}px` : ''
      cv.style.width = `${W}px`; cv.style.height = `${H}px`
      rl.resize(W, H, Math.min(2, window.devicePixelRatio || 1))
      links.forEach((a, i) => { a.style.width = `${L.ws[i]}px`; a.style.height = `${hc}px` })
      T = target(); x = T; v = 0
      frame(performance.now(), true)
    }

    function frame(now: number, force = false) {
      const dt = Math.min(4, Math.max(0.25, (now - last) / 16.667))
      last = now
      T = target()
      // Under-damped spring, semi-implicit Euler in ≤ 1-frame substeps.
      let rem = dt
      while (rem > 0) {
        const h = Math.min(1, rem); rem -= h
        v += (K * (T - x) - C * v) * h
        x += v * h
      }
      sv += (v - sv) * (1 - Math.pow(0.5, dt))
      const sp = Math.abs(sv)
      fx.off = x
      fx.amt = 1 - Math.exp(-sp / AMT_V)
      fx.bend = Math.max(-g.hc * 0.32, Math.min(g.hc * 0.32, sv * 2.2))
      fx.split = splitMag(sp) * Math.sign(sv)
      rl.draw(g, L, fx, colors.bg, colors.stage)
      // Links at the rest rect; captions fade while it moves.
      const top = g.cy - g.hc / 2
      for (let i = 0; i < links.length; i++) links[i].style.transform = `translate3d(${(L.xs[i] - x).toFixed(1)}px, ${top}px, 0)`
      row.style.setProperty('--rail-cap', (1 - Math.min(1, fx.amt * 1.6)).toFixed(3))
      ;(window as unknown as { __rail?: object }).__rail = { off: x, target: T, v: sv, amt: fx.amt, bend: fx.bend, split: fx.split, travel, pin } // QA probe
      if (force) return false
      return Math.abs(T - x) > 0.1 || Math.abs(v) > 0.02 || sp > 0.02 || rl.pending()
    }

    let raf = 0
    function tick(now: number) {
      raf = 0
      if (document.hidden || !onScreen) return
      if (frame(now)) raf = requestAnimationFrame(tick)
    }
    function wake() { if (!raf && !document.hidden && onScreen) { last = performance.now() - 16.7; raf = requestAnimationFrame(tick) } }

    on(window, 'scroll', () => wake(), { passive: true })
    on(document, 'visibilitychange', () => { if (!document.hidden) wake() })
    // Clicks between links (the canvas) still open the card under the pointer
    // with the deformed picture's own map.
    on(stage, 'click', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a')) return
      const r = stage.getBoundingClientRect()
      const i = hitRail(g, L, fx, e.clientX - r.left, e.clientY - r.top)
      if (i >= 0) window.open(list[i].url, '_blank', 'noopener,noreferrer')
    })

    // Keyboard: scroll the page until the focused card is centred.
    api.current = {
      focus(i) {
        const want = L.xs[i] + L.ws[i] / 2 - g.W / 2
        const p = travel > 0 ? Math.max(0, Math.min(1, (want + m) / travel)) : 0
        const r = sec.getBoundingClientRect()
        const vh = window.innerHeight
        const y = pin ? r.top - TOP + p * (r.height - panelH) : r.top - vh + p * (vh + r.height)
        if (Math.abs(y) > 1) window.scrollBy({ top: y, behavior: 'smooth' })
      },
    }

    const mo = new MutationObserver(() => { readColors(); wake() })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-page-theme'] })
    const ro = new ResizeObserver(() => resize())
    ro.observe(stage)
    on(window, 'resize', () => resize())
    const io = new IntersectionObserver(([en]) => {
      onScreen = en.isIntersecting
      if (onScreen) { T = target(); if (Math.abs(T - x) > g.W) { x = T; v = 0 } wake() }
    }, { rootMargin: '200px 0px' })
    io.observe(sec)

    resize()
    return () => {
      cancelAnimationFrame(raf)
      offs.forEach((f) => f())
      mo.disconnect(); ro.disconnect(); io.disconnect()
      rl.destroy()
      api.current = null
      sec.style.height = ''
      links.forEach((a) => { a.style.transform = ''; a.style.width = ''; a.style.height = '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, mode])

  return (
    <section
      ref={secRef}
      className={s.band}
      data-mode={mode}
      data-pin={pinned && mode === 'gl' ? '' : undefined}
      aria-label={ariaLabel}
    >
      <div className={s.pin}>
        <div ref={headRef} className={s.head}>
          <ElasticLine className={s.rule} />
          <p className={s.label}>{label}</p>
        </div>
        <div ref={stageRef} className={s.stage}>
          {mode === 'gl' && <canvas ref={cvRef} className={s.gl} aria-hidden="true" />}
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
                  aria-label={`${it.title} · ${it.source === 'instagram' ? 'Instagram' : 'Dribbble'} · ${mmyyyy(it.date)}`}
                  onFocus={() => api.current?.focus(i)}
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
