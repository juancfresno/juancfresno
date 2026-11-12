'use client'

// ─── Gallery 3 · "More from the feed · 03" one-surface block ─────────────────
// The same latest IG + Dribbble items as galleries 1 and 2, as an endless flat
// row of square-cornered cards. Unlike gallery 2 (feed-rail, effect per card,
// driven by the page scroll) the deformation runs over the WHOLE BLOCK as one
// surface (block.ts: compose to a framebuffer, then one lens pass).
//   · drag only (mouse / pen / horizontal touch swipe; vertical swipes stay
//     native scroll, touch-action: pan-y). The page scroll never moves it.
//     Release projects the throw and settles on the nearest card, its left
//     edge on the page margin (--m).
//   · untouched: eased auto-advance "hits" (one card, HIT_MS in-out: it
//     accelerates and brakes), PAUSE_MS between hits; hover, focus and drag
//     pause them, they come back RESUME_MS after.
//   · velocity → fisheye on the block, rubber bend, stretch, RGB split and a
//     short smear; rest = clean, flat, 1:1.
//   · cards are real <a> links (new tab) over the canvas at the rest rect;
//     captions `IG · MM/YYYY` fade while moving; focus brings a card in;
//     ← → on a focused card step the row.
//   · cursor: `data-cursor="drag"` on the stage (site Cursor).
//   · paused off-screen / hidden tab; the loop sleeps at rest (a timer wakes it
//     for the next hit); dpr ≤ 2.
//   · reduced motion or no WebGL2: a plain horizontally scrollable row (same
//     links with <img>), no effect, no hits.
import { useEffect, useRef, useState } from 'react'
import type { LatestItem } from '@/content/latest-feed'
import { parseColor, splitMag } from '@/components/wip/bg/theme'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import { MAX_CARDS } from '@/components/feed-strip/strip'
import { createBlock, hitBlock, layoutBlock, type Block, type BlockFx, type BlockGeo } from './block'
import s from './block.module.scss'

const ratio = (w: number, h: number) => Math.min(1.5, Math.max(0.56, w / h))
const mmyyyy = (d: string) => `${d.slice(5, 7)}/${d.slice(0, 4)}`
const thumb = (src: string) => (src.startsWith('/feed/') ? src.replace('/feed/', '/feed/t/') : src)
const tag = (it: LatestItem) => (it.source === 'instagram' ? 'IG' : 'DRB')
const wrap = (v: number, n: number) => ((v % n) + n) % n

const HIT_MS = 860      // one hit: accelerate + brake
const PAUSE_MS = 2400   // still time between hits
const RESUME_MS = 2400  // hits come back this long after the last interaction
const SNAP_MS = 720     // release / focus settle
const THROW = 14        // frames of release velocity projected before snapping
const AMT_V = 16        // px/frame where the effect reaches ≈ 63 %
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export default function FeedBlock({ items, ariaLabel, label }: { items: LatestItem[]; ariaLabel: string; label: string }) {
  const [mode, setMode] = useState<'row' | 'gl'>('row')
  const secRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const cvRef = useRef<HTMLCanvasElement>(null)
  const rowRef = useRef<HTMLUListElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const api = useRef<{ focus: (i: number) => void; step: (d: number) => void } | null>(null)
  const list = items.slice(0, MAX_CARDS)

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
    let block: Block | null = null
    try { block = createBlock(cv, cards, small, () => wake()) } catch { block = null }
    if (!block) { setMode('row'); return }
    const bl = block
    const offs: (() => void)[] = []
    const on = <T extends EventTarget>(t: T, ev: string, fn: (e: never) => void, opt?: AddEventListenerOptions | boolean) => {
      t.addEventListener(ev, fn as EventListener, opt)
      offs.push(() => t.removeEventListener(ev, fn as EventListener, opt))
    }

    let g: BlockGeo = { W: 1, H: 1, cy: 0, hc: 1 }
    let L = layoutBlock(cards, 1, 16)
    let m = 20, maxW = 1
    let colors = { bg: [0, 0, 0] as [number, number, number], stage: [0.05, 0.05, 0.05] as [number, number, number] }
    const readColors = () => {
      const cs = getComputedStyle(stage)
      colors = { bg: parseColor(cs.getPropertyValue('--c-bg'), [0.063, 0.063, 0.055]), stage: parseColor(cs.getPropertyValue('--c-stage'), [0.05, 0.05, 0.045]) }
    }
    readColors()

    // off = strip px at the canvas's left edge (unbounded; wrapped on use).
    let off = 0, prev = 0, sv = 0, idx = 0
    let tw: { from: number; to: number; t0: number; dur: number; ease: (t: number) => number } | null = null
    let dragging = false, inside = false, focused = false
    let lastTouch = -1e9, nextHit = 0
    let last = performance.now()
    let onScreen = false
    const fx: BlockFx = { off: 0, amt: 0, dir: 1, bend: 0, split: 0 }

    // Snap: card i's left edge on the margin. Nearest copy of i to `near`.
    const snapOf = (i: number, near: number) => {
      const base = L.xs[i] - m
      return base + Math.round((near - base) / L.len) * L.len
    }
    const nearestIdx = (o: number) => {
      const u = wrap(o + m, L.len)
      let best = 0, bd = Infinity
      for (let i = 0; i < L.xs.length; i++) {
        const d = Math.min(Math.abs(u - L.xs[i]), L.len - Math.abs(u - L.xs[i]))
        if (d < bd) { bd = d; best = i }
      }
      return best
    }
    const go = (to: number, dur: number, ease: (t: number) => number) => { tw = { from: off, to, t0: performance.now(), dur, ease }; wake() }

    function resize() {
      const W = stage.clientWidth, H = stage.clientHeight
      if (!W || !H) return
      const hc = probe.offsetHeight || Math.round(H / 1.5)
      g = { W, H, cy: H / 2, hc }
      L = layoutBlock(cards, hc, Math.round(Math.max(12, hc * 0.06)))
      maxW = Math.max(...L.ws)
      m = parseFloat(getComputedStyle(head).paddingLeft) || 20
      cv.style.width = `${W}px`; cv.style.height = `${H}px`
      bl.resize(W, H, Math.min(2, window.devicePixelRatio || 1))
      links.forEach((a, i) => { a.style.width = `${L.ws[i]}px`; a.style.height = `${hc}px` })
      tw = null
      off = prev = snapOf(idx, off); sv = 0
      frame(performance.now(), true)
    }

    function frame(now: number, force = false) {
      const dtr = Math.max(0.25, (now - last) / 16.667) // real frames elapsed
      const dt = Math.min(4, dtr)
      last = now
      const idle = !dragging && !inside && !focused && now - lastTouch > RESUME_MS
      // Auto-advance: one eased hit, then PAUSE_MS still.
      if (idle && !tw && onScreen && now >= nextHit) {
        idx = (nearestIdx(off) + 1) % L.xs.length
        go(snapOf(idx, off + L.ws[0]), HIT_MS, inOut)
        nextHit = now + HIT_MS + PAUSE_MS
      }
      if (!dragging && tw) {
        const t = Math.min(1, (now - tw.t0) / tw.dur)
        off = tw.from + (tw.to - tw.from) * tw.ease(t)
        if (t >= 1) tw = null
      }
      const v = (off - prev) / dtr // true screen speed, px per 60 Hz frame
      prev = off
      sv += (v - sv) * (1 - Math.pow(0.35, dt))
      if (!dragging && !tw && Math.abs(sv) < 0.02) sv = 0
      const sp = Math.abs(sv)
      fx.off = off
      // Phones: a swipe is a far bigger share of the screen, so the effect
      // tops out lower there.
      fx.amt = (1 - Math.exp(-sp / AMT_V)) * (g.W < 769 ? 0.65 : 1)
      fx.dir = sv >= 0 ? 1 : -1
      fx.bend = Math.max(-g.hc * 0.3, Math.min(g.hc * 0.3, sv * 2.6 * (g.hc / 420) * (g.W < 769 ? 0.65 : 1)))
      fx.split = splitMag(sp) * fx.dir
      bl.draw(g, L, fx, colors.bg, colors.stage)
      // Links at the rest rect (copy of each card nearest the view).
      const top = g.cy - g.hc / 2
      for (let i = 0; i < links.length; i++) {
        const x = wrap(L.xs[i] - off + maxW, L.len) - maxW
        links[i].style.transform = `translate3d(${x.toFixed(1)}px, ${top}px, 0)`
      }
      row.style.setProperty('--blk-cap', (1 - Math.min(1, fx.amt * 1.8)).toFixed(3))
      ;(window as unknown as { __block?: object }).__block = { off, v: sv, amt: fx.amt, bend: fx.bend, split: fx.split, idx, hit: !!tw, dragging, idle, onScreen, nextHit: Math.round(nextHit) } // QA probe
      if (force) return false
      return dragging || tw !== null || sp > 0 || bl.pending()
    }

    let raf = 0, timer = 0, inTick = false
    function tick(now: number) {
      raf = 0
      if (document.hidden || !onScreen) return
      inTick = true
      const more = frame(now)
      inTick = false
      if (more) { raf = requestAnimationFrame(tick); return }
      // Asleep: wake for the next hit (or the end of the resume delay).
      const due = Math.max(nextHit, lastTouch + RESUME_MS) - performance.now()
      clearTimeout(timer)
      timer = window.setTimeout(() => wake(), Math.max(16, due + 4))
    }
    function wake() { if (!raf && !inTick && !document.hidden && onScreen) { last = performance.now() - 16.7; raf = requestAnimationFrame(tick) } }
    const touch = () => { lastTouch = performance.now(); nextHit = Math.max(nextHit, lastTouch + RESUME_MS) }

    // ── drag ──
    let pid: number | null = null, x0 = 0, y0 = 0, lx = 0, lt = 0, pv = 0, off0 = 0, moved = false, suppress = false
    on(stage, 'pointerdown', (e: PointerEvent) => {
      if (e.button !== 0 || pid !== null) return
      pid = e.pointerId; x0 = lx = e.clientX; y0 = e.clientY; lt = performance.now(); pv = 0
      off0 = off; moved = false; suppress = false
      touch()
    })
    on(window, 'pointermove', (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      const dx = e.clientX - x0, dy = e.clientY - y0
      if (!moved) {
        if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
          moved = true; dragging = true; suppress = true; tw = null
          off0 = off + dx // continue from where it is, no jump
          try { stage.setPointerCapture(e.pointerId) } catch {}
          document.documentElement.classList.add(s.dragging)
          wake()
        } else if (Math.abs(dy) > 10 && e.pointerType !== 'mouse') { pid = null; return }
        else return
      }
      const now = performance.now()
      const dtf = Math.max(0.5, (now - lt) / 16.667)
      pv = pv * 0.4 + (-(e.clientX - lx) / dtf) * 0.6
      lx = e.clientX; lt = now
      off = off0 - dx
      touch()
    })
    const end = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      pid = null
      document.documentElement.classList.remove(s.dragging)
      if (!dragging) return
      dragging = false
      // A stale velocity (pointer held still) doesn't throw.
      const vel = performance.now() - lt > 80 ? 0 : pv
      idx = nearestIdx(off + vel * THROW)
      go(snapOf(idx, off + vel * THROW), SNAP_MS, outCubic)
      touch()
    }
    on(window, 'pointerup', end)
    on(window, 'pointercancel', end)
    on(stage, 'dragstart', (e: DragEvent) => e.preventDefault())
    // After a drag, swallow the click (links don't open).
    on(stage, 'click', (e: MouseEvent) => {
      if (suppress) { e.preventDefault(); e.stopPropagation(); suppress = false; return }
      if ((e.target as HTMLElement).closest('a')) return
      const r = stage.getBoundingClientRect()
      const i = hitBlock(g, L, fx, e.clientX - r.left, e.clientY - r.top)
      if (i >= 0) window.open(list[i].url, '_blank', 'noopener,noreferrer')
    }, true)
    on(stage, 'pointerenter', (e: PointerEvent) => { if (e.pointerType === 'mouse') { inside = true; touch() } })
    on(stage, 'pointerleave', (e: PointerEvent) => { if (e.pointerType === 'mouse') { inside = false; touch(); wake() } })

    api.current = {
      // Only keyboard focus counts (a mouse press on a card focuses its link too).
      focus(i) {
        if (!links[i]?.matches(':focus-visible')) return
        focused = true; touch(); idx = i; go(snapOf(i, off), SNAP_MS, outCubic)
      },
      step(d) { touch(); idx = wrap(nearestIdx(off) + d, L.xs.length); go(snapOf(idx, off + d * L.ws[0]), SNAP_MS, outCubic); links[idx]?.focus({ preventScroll: true }) },
    }
    on(row, 'focusout', (e: FocusEvent) => { if (!row.contains(e.relatedTarget as Node)) { focused = false; touch(); wake() } })

    on(document, 'visibilitychange', () => { if (!document.hidden) wake() })
    const mo = new MutationObserver(() => { readColors(); wake() })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-page-theme'] })
    const ro = new ResizeObserver(() => resize())
    ro.observe(stage)
    const io = new IntersectionObserver(([en]) => {
      onScreen = en.isIntersecting
      if (onScreen) { nextHit = Math.max(nextHit, performance.now() + PAUSE_MS); wake() }
    }, { rootMargin: '100px 0px' })
    io.observe(sec)

    nextHit = performance.now() + PAUSE_MS
    resize()
    return () => {
      cancelAnimationFrame(raf); clearTimeout(timer)
      offs.forEach((f) => f())
      mo.disconnect(); ro.disconnect(); io.disconnect()
      bl.destroy()
      api.current = null
      document.documentElement.classList.remove(s.dragging)
      links.forEach((a) => { a.style.transform = ''; a.style.width = ''; a.style.height = '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, mode])

  return (
    <section ref={secRef} className={s.band} data-mode={mode} aria-label={ariaLabel}>
      <div ref={headRef} className={s.head}>
        <ElasticLine className={s.rule} />
        <p className={s.label}>{label}</p>
      </div>
      <div ref={stageRef} className={s.stage} data-cursor={mode === 'gl' ? 'drag' : undefined} data-wf="media">
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
                draggable={false}
                data-no-transition=""
                aria-label={`${it.title} · ${it.source === 'instagram' ? 'Instagram' : 'Dribbble'} · ${mmyyyy(it.date)}`}
                onFocus={() => api.current?.focus(i)}
                onKeyDown={(e) => {
                  if (!api.current) return
                  if (e.key === 'ArrowRight') { e.preventDefault(); api.current.step(1) }
                  else if (e.key === 'ArrowLeft') { e.preventDefault(); api.current.step(-1) }
                }}
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
    </section>
  )
}
