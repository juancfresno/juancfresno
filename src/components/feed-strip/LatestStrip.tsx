'use client'

// ─── Latest from Instagram & Dribbble · curved strip ─────────────────────────
// One WebGL2 canvas (feed-strip/strip.ts): the latest posts on a convex drum,
// centre card largest, sides bending away (ref. mathiasadolfsson.dev), with
// the home lens's RGB split while it moves. Used on Home and Work.
//   · drag (mouse / pen / horizontal touch swipe) with inertia; horizontal
//     wheel / trackpad moves it, vertical wheel keeps scrolling the page
//     (touch-action: pan-y, wheel only cancelled when |dx| > |dy|);
//   · click without drag opens the post (new tab); hover = mono caption
//     `IG · MM/YYYY` under the card, the others dim;
//   · drifts slowly when idle; any interaction stops it, it resumes 3 s after;
//   · progress arc under the strip (track --c-text, position --c-g);
//   · keyboard: the real links live in a visually hidden list; focusing one
//     centres its card and draws a ring around it;
//   · paused off-screen / hidden tab; dpr ≤ 2; reduced motion = no drift,
//     inertia or split (still draggable); no WebGL2 = the CSS marquee.
import { useEffect, useRef, useState } from 'react'
import type { LatestItem } from '@/content/latest-feed'
import LatestMarquee from '@/components/home/LatestMarquee'
import { parseColor, splitMag } from '@/components/wip/bg/theme'
import { createStrip, hitTest, layoutStrip, project, MAX_CARDS, type Strip, type StripGeo } from './strip'
import s from './strip.module.scss'

const ratio = (w: number, h: number) => Math.min(1.5, Math.max(0.56, w / h))
const mmyyyy = (d: string) => `${d.slice(5, 7)}/${d.slice(0, 4)}`
const thumb = (src: string) => (src.startsWith('/feed/') ? src.replace('/feed/', '/feed/t/') : src)
const tag = (it: LatestItem) => (it.source === 'instagram' ? 'IG' : 'DRB')

const DRIFT = 0.42      // px per 60 Hz frame (≈ 25 px/s)
const RESUME_MS = 3000  // drift comes back this long after the last interaction
const MAXV = 1.8        // px/ms release cap (the feed's)
const ARC_SEG = 18      // progress segment, % of the arc

export default function LatestStrip({ items, ariaLabel }: { items: LatestItem[]; ariaLabel: string }) {
  const [fallback, setFallback] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const cvRef = useRef<HTMLCanvasElement>(null)
  const capRef = useRef<HTMLSpanElement>(null)
  const ringRef = useRef<HTMLSpanElement>(null)
  const arcRef = useRef<SVGPathElement>(null)
  const api = useRef<{ focus: (i: number) => void; blur: () => void } | null>(null)
  const list = items.slice(0, MAX_CARDS)

  useEffect(() => {
    if (fallback || !list.length) return
    const stage = stageRef.current!, cv = cvRef.current!, cap = capRef.current!, ring = ringRef.current!, arc = arcRef.current!
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

    let cam = 0, pcam = 0, vel = 0
    let target: number | null = null
    let dragging = false, inside = false, focusIdx = -1, hover = -1
    let px = -1, py = -1
    let lastTouch = -Infinity // last interaction (ms)
    let driftK = reduce ? 0 : 1
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

    function frame(now: number, force = false) {
      const dt = Math.min(4, Math.max(0.25, (now - last) / 16.667))
      last = now
      const idle = !dragging && !inside && focusIdx < 0 && now - lastTouch > RESUME_MS
      driftK = reduce ? 0 : idle ? Math.min(1, driftK + 0.02 * dt) : 0
      let drift = 0
      if (!dragging) {
        if (target !== null) {
          if (reduce) cam = target
          else cam += (target - cam) * (1 - Math.pow(0.84, dt))
          if (Math.abs(target - cam) < 0.3) { cam = target }
        } else {
          cam += vel * dt
          vel *= Math.pow(0.94, dt)
          if (Math.abs(vel) < 0.01) vel = 0
        }
        drift = DRIFT * driftK * dt
        cam += drift
      }
      // Screen speed without the drift → split (the feed curve).
      const d = cam - pcam - drift
      pcam = cam
      sv += (d / dt - sv) * (1 - Math.pow(0.65, dt))
      const mag = reduce ? 0 : splitMag(Math.abs(sv))
      hover = -1
      let box: ReturnType<typeof cardBox> | null = null
      if (inside && px >= 0 && !dragging) {
        const h = hitTest(g, L, cam, px, py)
        if (h) { hover = h.i; box = cardBox(h.u0, h.i) }
      }
      st.draw(g, L, { cam, split: mag * Math.sign(sv), hover, focus: focusIdx, bg: colors.bg, stage: colors.stage })

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

      const prog = (((cam % L.len) + L.len) % L.len) / L.len
      arc.style.strokeDashoffset = `${-prog * (100 - ARC_SEG)}`
      ;(window as unknown as { __strip?: object }).__strip = { cam, vel, speed: Math.abs(sv), split: mag, hover, drift: driftK } // QA probe
      if (force) return false
      return dragging || target !== null || vel !== 0 || driftK > 0 || mag > 0 || Math.abs(sv) > 0.05 || st.pending()
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
      // Asleep: wake when the drift is due back.
      if (!reduce) {
        clearTimeout(resumeT)
        const wait = lastTouch + RESUME_MS - performance.now()
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
      vel = 0; target = null; touch(); wake()
    })
    on(window, 'pointermove', (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      let dx = e.clientX - lx
      lx = e.clientX
      if (!moved) {
        const ax = Math.abs(lx - x0), ay = Math.abs(e.clientY - y0)
        if (ax > 6 && ax > ay) {
          moved = true; dragging = true; suppress = true; dx = lx - x0
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
      const h0 = hist[0], h1 = hist[hist.length - 1], dt = Math.max(16, h1.t - h0.t)
      if (!reduce && e.timeStamp - h1.t <= 120) vel = -Math.max(-MAXV, Math.min(MAXV, (h1.x - h0.x) / dt)) * 16.667
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
    // Horizontal wheel / trackpad only; vertical stays the page's.
    on(stage, 'wheel', (e: WheelEvent) => {
      if (e.ctrlKey) return
      const f = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? g.W : 1
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || !e.deltaX) return
      e.preventDefault()
      cam += Math.max(-160, Math.min(160, e.deltaX * f))
      vel = 0; target = null; touch(); wake()
    }, { passive: false })

    api.current = {
      focus(i) { focusIdx = i; target = nearest(i, L.xs[i]) + L.ws[i] / 2; vel = 0; touch(); wake() },
      blur() { focusIdx = -1; target = null; touch(); wake() },
    }

    const mo = new MutationObserver(() => { readColors(); wake() })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-page-theme'] })
    const ro = new ResizeObserver(() => resize())
    ro.observe(stage)
    const io = new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) wake() }, { rootMargin: '100px 0px' })
    io.observe(stage)
    on(document, 'visibilitychange', () => { if (!document.hidden) wake() })

    resize()
    // Start with the first card a little left of centre.
    cam = pcam = L.ws[0] ? L.ws[0] / 2 : 0
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
      <div ref={stageRef} className={s.stage}>
        <canvas ref={cvRef} className={s.gl} aria-hidden="true" />
        <span ref={ringRef} className={s.ring} aria-hidden="true" />
        <span ref={capRef} className={s.cap} aria-hidden="true">
          <span className={s.dot} />
          <span />
        </span>
      </div>
      <svg className={s.arc} viewBox="0 0 120 16" aria-hidden="true">
        <path className={s.track} d="M2 15 Q60 -7 118 15" pathLength={100} />
        <path ref={arcRef} className={s.pos} d="M2 15 Q60 -7 118 15" pathLength={100} strokeDasharray={`${ARC_SEG} 200`} />
      </svg>
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
