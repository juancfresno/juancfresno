'use client'

// ─── Latest from Instagram & Dribbble · curved strip ─────────────────────────
// One WebGL2 canvas (feed-strip/strip.ts): the latest posts on a convex drum,
// centre card largest, sides bending away (ref. mathiasadolfsson.dev), with
// the home lens's RGB split while it moves. Used on Home and Work.
//   · moves in HITS, one card at a time (feed-strip/hit.ts, shared with
//     gallery 2): the next card comes to the centre with a strong ease-in-out
//     (cubic-bezier(.76,0,.24,1), HIT_MS), then rests HIT_PAUSE; the RGB
//     split flashes with the hit's speed and settles clean;
//   · NO page-scroll or wheel input at all: interaction = drag only (mouse /
//     pen / horizontal touch swipe, touch-action: pan-y so vertical scroll
//     stays the page's); the release SNAPS with the same ease to the card
//     nearest to where the throw would land, leaving at the throw's speed;
//   · hover / drag / focus pause the hits; they resume RESUME_MS after;
//   · click without drag opens the post (new tab); hover = mono caption
//     `IG · MM/YYYY` under the card; every card keeps its brightness;
//   · keyboard: the real links live in a visually hidden list; focusing one
//     centres its card and draws a ring around it;
//   · paused off-screen / hidden tab; dpr ≤ 2; the loop sleeps between hits;
//     reduced motion = no auto-advance, instant snaps, no split;
//     no WebGL2 = the CSS marquee.
import { useEffect, useRef, useState } from 'react'
import type { LatestItem } from '@/content/latest-feed'
import LatestMarquee from '@/components/home/LatestMarquee'
import { parseColor, splitMag } from '@/components/wip/bg/theme'
import { createStrip, hitTest, layoutStrip, project, MAX_CARDS, type Strip, type StripGeo } from './strip'
import { HIT_MS, HIT_PAUSE, MAXV, RESUME_MS, THROW_MS, tweenAt, type Tween } from './hit'
import s from './strip.module.scss'

const ratio = (w: number, h: number) => Math.min(1.5, Math.max(0.56, w / h))
const mmyyyy = (d: string) => `${d.slice(5, 7)}/${d.slice(0, 4)}`
const thumb = (src: string) => (src.startsWith('/feed/') ? src.replace('/feed/', '/feed/t/') : src)
const tag = (it: LatestItem) => (it.source === 'instagram' ? 'IG' : 'DRB')


export default function LatestStrip({ items, ariaLabel }: { items: LatestItem[]; ariaLabel: string }) {
  const [fallback, setFallback] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const cvRef = useRef<HTMLCanvasElement>(null)
  const capRef = useRef<HTMLSpanElement>(null)
  const ringRef = useRef<HTMLSpanElement>(null)
  const api = useRef<{ focus: (i: number) => void; blur: () => void } | null>(null)
  const list = items.slice(0, MAX_CARDS)

  useEffect(() => {
    if (fallback || !list.length) return
    const stage = stageRef.current!, cv = cvRef.current!, cap = capRef.current!, ring = ringRef.current!
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cards = list.map((it) => ({ src: thumb(it.src), ratio: ratio(it.w, it.h) }))
    let strip: Strip | null = null
    try { strip = createStrip(cv, cards, window.innerWidth <= 800, () => wake()) } catch { strip = null }
    if (!strip) { setFallback(true); return }
    const st = strip
    const offs: (() => void)[] = []
    const on = <T extends EventTarget>(t: T, ev: string, fn: (e: never) => void, opt?: AddEventListenerOptions) => {
      t.addEventListener(ev, fn as EventListener, opt)
      offs.push(() => t.removeEventListener(ev, fn as EventListener, opt))
    }

    let g: StripGeo = { W: 1, H: 1, cy: 0, hc: 1, gap: 16, R: 1, Z0: 1, lens: 0 }
    let L = layoutStrip(cards, 1, 16)
    let colors = { bg: [0, 0, 0] as [number, number, number], stage: [0.05, 0.05, 0.05] as [number, number, number] }
    const readColors = () => {
      const cs = getComputedStyle(stage)
      colors = { bg: parseColor(cs.getPropertyValue('--c-bg'), [0.063, 0.063, 0.055]), stage: parseColor(cs.getPropertyValue('--c-stage'), [0.05, 0.05, 0.045]) }
    }
    readColors()

    let cam = 0, pcam = 0
    // The one tween (hit, snap, focus): cam goes from → to over dur ms.
    let tw: Tween | null = null
    let dragging = false, inside = false, focusIdx = -1, hover = -1
    let px = -1, py = -1
    let lastTouch = -Infinity // last interaction (ms)
    let nextHit = performance.now() + HIT_PAUSE
    let sv = 0 // smoothed screen velocity, px/frame
    let last = performance.now()
    let onScreen = true

    function resize() {
      const W = stage.clientWidth, H = stage.clientHeight
      if (!W || !H) return
      const hc = Math.max(120, H - 24)
      const phone = W <= 768
      // Edge of the screen ≈ 41° round the drum, side cards at ≈ 0.84 (the ref.).
      const R = W * (phone ? 1.05 : 0.9)
      // Keep the card under the centre fixed while the strip re-lays out.
      const frac = cam / L.len
      g = { W, H, cy: H / 2, hc, gap: Math.round(Math.max(12, hc * 0.1)), R, Z0: R * 1.3, lens: phone ? 0.03 : 0.05 }
      L = layoutStrip(cards, hc, g.gap)
      cam = pcam = frac * L.len
      if (tw) { cam = pcam = tw.to; tw = null }
      cv.style.width = `${W}px`; cv.style.height = `${H}px`
      st.resize(W, H, Math.min(2, window.devicePixelRatio || 1))
      frame(performance.now(), true)
    }

    // Arc u (relative to cam) + vertical offset → screen point, with the barrel (first order).
    const toScreen = (du: number, dy: number) => {
      const P = project(g, du)
      let x = P.x, y = dy * P.sc
      const rr = Math.hypot(x / (g.W / 2), y / ((g.W / 2) * 0.6))
      const k = 1 + g.lens * rr * rr
      x /= k; y /= k
      return { x: g.W / 2 + x, y: g.cy + y }
    }
    const cardBox = (u0: number, i: number) => {
      const a = toScreen(u0 - cam, -g.hc / 2), b = toScreen(u0 + L.ws[i] - cam, g.hc / 2)
      const c = toScreen(u0 + L.ws[i] / 2 - cam, g.hc / 2)
      return { l: a.x, t: a.y, r: b.x, b: Math.max(b.y, c.y) }
    }

    // Card centres (world u) around the loop: the one nearest x, or the first
    // one strictly after / before x.
    const centres = (x: number) => {
      const base = x - (((x % L.len) + L.len) % L.len)
      const out: number[] = []
      for (let k = -1; k <= 1; k++) for (let i = 0; i < L.xs.length; i++) out.push(base + k * L.len + L.xs[i] + L.ws[i] / 2)
      return out
    }
    const nearestCentre = (x: number) => centres(x).reduce((a, c) => (Math.abs(c - x) < Math.abs(a - x) ? c : a), Infinity)
    const stepCentre = (x: number, dir: 1 | -1) => {
      const ref = tw ? tw.to : nearestCentre(x)
      const cs = centres(ref).filter((c) => (dir > 0 ? c > ref + 0.5 : c < ref - 0.5))
      return dir > 0 ? Math.min(...cs) : Math.max(...cs)
    }
    const go = (to: number, v0 = 0) => {
      if (reduce || Math.abs(to - cam) < 0.5) { cam = to; tw = null; return }
      tw = { from: cam, to, t0: performance.now(), dur: HIT_MS, v0 }
    }

    function frame(now: number, force = false) {
      const dt = Math.min(4, Math.max(0.25, (now - last) / 16.667))
      last = now
      const idle = !dragging && !inside && focusIdx < 0 && now - lastTouch > RESUME_MS
      // Auto-advance: one hit, then HIT_PAUSE of rest, while idle (never with reduced motion).
      if (!reduce && idle && !tw && now >= nextHit) {
        go(stepCentre(cam, 1))
        nextHit = now + HIT_MS + HIT_PAUSE
      }
      if (!idle) nextHit = Math.max(nextHit, lastTouch + RESUME_MS)
      if (!dragging && tw) {
        const [c, done] = tweenAt(tw, now)
        cam = c
        if (done) tw = null
      }
      // Screen speed → split (the feed curve): it flashes during a hit.
      const d = cam - pcam
      pcam = cam
      sv += (d / dt - sv) * (1 - Math.pow(0.65, dt))
      const mag = reduce ? 0 : splitMag(Math.abs(sv))
      hover = -1
      let box: ReturnType<typeof cardBox> | null = null
      if (inside && px >= 0 && !dragging) {
        const h = hitTest(g, L, cam, px, py)
        if (h) { hover = h.i; box = cardBox(h.u0, h.i) }
      }
      st.draw(g, L, { cam, split: mag * Math.sign(sv), bg: colors.bg, stage: colors.stage })

      // Caption (hover) / focus ring (keyboard), both under the card.
      let capIdx = hover
      if (capIdx < 0 && focusIdx >= 0) {
        capIdx = focusIdx
        const u0 = nearest(focusIdx, L.xs[focusIdx])
        box = cardBox(u0, focusIdx)
        ring.style.transform = `translate3d(${box.l}px, ${box.t}px, 0)`
        ring.style.width = `${box.r - box.l}px`; ring.style.height = `${box.b - box.t}px`
        ring.dataset.on = ''
      } else delete ring.dataset.on
      if (capIdx >= 0 && box) {
        const it = list[capIdx]
        const txt = `${tag(it)} · ${mmyyyy(it.date)}`
        if (cap.dataset.t !== txt) { cap.dataset.t = txt; cap.lastChild!.textContent = txt }
        cap.style.transform = `translate3d(${Math.max(0, box.l)}px, ${box.b + 8}px, 0)`
        cap.dataset.on = ''
      } else delete cap.dataset.on
      stage.style.cursor = dragging ? 'grabbing' : hover >= 0 ? 'pointer' : 'grab'
      const cur = hover >= 0 && !dragging ? 'view' : 'drag' // site cursor hint
      if (stage.dataset.cursor !== cur) stage.dataset.cursor = cur

      ;(window as unknown as { __strip?: object }).__strip = { cam, speed: Math.abs(sv), split: mag, hover, hit: !!tw, nextHit } // QA probe
      if (force) return false
      return dragging || tw !== null || mag > 0 || Math.abs(sv) > 0.05 || st.pending()
    }
    // World u of card i's left edge, the repeat nearest the centre.
    const nearest = (i: number, x0: number) => {
      const c = x0 + L.ws[i] / 2
      const k = Math.round((cam - c) / L.len)
      return c + k * L.len - L.ws[i] / 2
    }

    let raf = 0, resumeT = 0
    function tick(now: number) {
      raf = 0
      if (document.hidden || !onScreen) return
      if (frame(now)) { raf = requestAnimationFrame(tick); return }
      // Asleep between hits: wake when the next one is due.
      if (!reduce) {
        clearTimeout(resumeT)
        const wait = Math.max(nextHit, lastTouch + RESUME_MS) - performance.now()
        if (!inside && focusIdx < 0) resumeT = window.setTimeout(wake, Math.max(16, wait + 16))
      }
    }
    function wake() { if (!raf && !document.hidden && onScreen) { last = performance.now() - 16.7; raf = requestAnimationFrame(tick) } }
    const touch = () => { lastTouch = performance.now() }

    // ── drag ──
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
      cam -= dx
      touch(); wake()
    })
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      pid = null
      document.documentElement.classList.remove(s.dragging)
      if (!moved) return
      dragging = false
      // Snap: to the card nearest to where the throw would land.
      const h0 = hist[0], h1 = hist[hist.length - 1], dt = Math.max(16, h1.t - h0.t)
      const v = e.timeStamp - h1.t <= 120 ? -Math.max(-MAXV, Math.min(MAXV, (h1.x - h0.x) / dt)) : 0
      go(nearestCentre(cam + (reduce ? 0 : v * THROW_MS)), reduce ? 0 : v)
      touch(); wake()
    }
    on(window, 'pointerup', up)
    on(window, 'pointercancel', up)
    on(stage, 'dragstart', (e: Event) => e.preventDefault())
    // Click without drag = open the card under the pointer.
    on(stage, 'click', (e: MouseEvent) => {
      if (suppress) { suppress = false; return }
      const r = stage.getBoundingClientRect()
      const h = hitTest(g, L, cam, e.clientX - r.left, e.clientY - r.top)
      if (!h) return
      window.open(list[h.i].url, '_blank', 'noopener,noreferrer')
    })
    on(stage, 'pointerenter', (e: PointerEvent) => { if (e.pointerType === 'mouse') { inside = true; wake() } })
    on(stage, 'pointerleave', () => { inside = false; px = py = -1; touch(); wake() })
    on(stage, 'pointermove', (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = stage.getBoundingClientRect()
      px = e.clientX - r.left; py = e.clientY - r.top; inside = true
      wake()
    })
    api.current = {
      focus(i) { focusIdx = i; go(nearest(i, L.xs[i]) + L.ws[i] / 2); touch(); wake() },
      blur() { focusIdx = -1; touch(); wake() },
    }

    const mo = new MutationObserver(() => { readColors(); wake() })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-page-theme'] })
    const ro = new ResizeObserver(() => resize())
    ro.observe(stage)
    const io = new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) wake() }, { rootMargin: '100px 0px' })
    io.observe(stage)
    on(document, 'visibilitychange', () => { if (!document.hidden) wake() })

    resize()
    // Start with the first card centred; the first hit comes HIT_PAUSE later.
    cam = pcam = L.ws[0] ? L.ws[0] / 2 : 0
    nextHit = performance.now() + HIT_PAUSE
    wake()
    return () => {
      cancelAnimationFrame(raf); clearTimeout(resumeT)
      offs.forEach((f) => f())
      mo.disconnect(); ro.disconnect(); io.disconnect()
      st.destroy()
      api.current = null
      document.documentElement.classList.remove(s.dragging)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, fallback])

  if (fallback) return <LatestMarquee items={items} ariaLabel={ariaLabel} />

  return (
    <div className={s.wrap} role="region" aria-label={ariaLabel}>
      <div ref={stageRef} className={s.stage} data-cursor="drag">
        <canvas ref={cvRef} className={s.gl} aria-hidden="true" data-cursor="drag" />
        <span ref={ringRef} className={s.ring} aria-hidden="true" />
        <span ref={capRef} className={s.cap} aria-hidden="true">
          <span className={s.dot} />
          <span />
        </span>
      </div>
      <ul className={s.links}>
        {list.map((it, i) => (
          <li key={it.id}>
            <a
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              data-no-transition=""
              onFocus={() => api.current?.focus(i)}
              onBlur={() => api.current?.blur()}
            >
              {it.title} · {it.source === 'instagram' ? 'Instagram' : 'Dribbble'} · {mmyyyy(it.date)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
