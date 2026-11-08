'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePageTransition } from '@/providers/PageTransition'
import s from './arco.module.scss'

// ─── Arco · featured cases on a drum (port of Lab 003 · 01 "Arco") ────────────
// The covers sit on the inside of a cylinder (CSS 3D, each cover cut into
// vertical strips so it curves). Page scroll turns it while the section is
// pinned under the header; drag (with inertia) and ← → turn it too, and it
// always settles on one case. At rest the centred cover is in colour, the rest
// in monochrome; while it moves everything goes monochrome. Click the centred
// cover (or Enter) to open the case; click a side cover to bring it to the
// centre. One rAF loop that sleeps at rest.
// Reduced motion: no drum, a still grid of covers (CSS swaps them).
// Reusable: pass any list of { href, title, meta, src, th, w, h }.

export type ArcoItem = { key: string; href: string; title: string; meta: string; src: string; th: string; w: number; h: number }

const S = 8 // strips per card
const PX = 170 // page scroll per card while pinned
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/'

const mod = (n: number, m: number) => ((n % m) + m) % m
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const pad = (n: number) => String(n).padStart(2, '0')

export default function Arco({ items, label = 'Featured work', start = 0, hint = 'Drag ↔ · Scroll' }: { items: ArcoItem[]; label?: string; start?: number; hint?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const ticksRef = useRef<SVGGElement>(null)
  const nRef = useRef<HTMLSpanElement>(null)
  const tRef = useRef<HTMLAnchorElement>(null)
  const dRef = useRef<HTMLSpanElement>(null)
  const { navigate } = usePageTransition()
  const navRef = useRef(navigate)
  navRef.current = navigate

  useEffect(() => {
    const wrap = wrapRef.current!, inner = innerRef.current!, view = viewRef.current!, ring = ringRef.current!
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const N = items.length
    if (!N) return
    const RANGE = N - 1
    const offs: (() => void)[] = []
    const on = <K extends keyof WindowEventMap>(el: EventTarget, ev: K | string, fn: EventListener, opt?: AddEventListenerOptions | boolean) => {
      el.addEventListener(ev, fn, opt)
      offs.push(() => el.removeEventListener(ev, fn, opt))
    }

    type Card = { el: HTMLDivElement; strips: HTMLSpanElement[]; i: number | null; mono: boolean | null; vis: boolean | null; b: number }
    let G = { W: 0, H: 0, CW: 0, CH: 0, R: 0, dTh: 0, HALF: 0, g: 16, small: false }
    let pool: Card[] = []
    let r = 0, prevR = 0, offset = start, lastInput = 0, cur = -1, raf = 0, top = 72

    // ── Pin: wrapper tall enough for RANGE cards of page scroll ──
    const size = () => {
      wrap.style.height = `calc(var(--arco-pin-h) + ${Math.round(RANGE * PX)}px)`
      top = parseFloat(getComputedStyle(inner).top) || 0
    }
    const progress = () => {
      const b = wrap.getBoundingClientRect(), span = b.height - inner.offsetHeight
      return span > 0 ? clamp((top - b.top) / span, 0, 1) : 0
    }

    // ── Geometry: card size from the stage, ring radius, strips ──
    const coverFit = (it: ArcoItem, W: number, H: number) => {
      const ar = it.w / it.h
      let bw, bh
      if (ar > W / H) { bh = H; bw = H * ar } else { bw = W; bh = W / ar }
      return { bw, bh, ox: (bw - W) / 2, oy: (bh - H) / 2 }
    }
    const geo = () => {
      const W = inner.clientWidth, H = view.clientHeight, small = W <= 720
      const g = small ? 16 : 22
      // Portrait panels (Figma: 500 × 625 at 1680, 4:5).
      const AR = 0.8
      let CW = small ? W * 0.66 : W * 0.3, CH = CW / AR
      if (CH > H * 0.86) { CH = H * 0.86; CW = CH * AR }
      const R = CW * (small ? 2.2 : 3.4) // flat oval: 3 panels each side (Figma)
      const K = Math.max(8, Math.floor((2 * Math.PI * R) / (CW + g))), dTh = (2 * Math.PI) / K
      const st = CW / R / S, sw = 2 * R * Math.sin(st / 2) + 1.2
      const HALF = Math.ceil((Math.PI * 0.55) / dTh)
      G = { W, H, CW, CH, R, dTh, HALF, g, small }
      view.style.perspective = `${Math.round(CW * (small ? 2.4 : 3.2))}px`
      ring.textContent = ''
      pool = []
      for (let p = 0; p < HALF * 2 + 2; p++) {
        const el = document.createElement('div')
        el.className = s.card
        const strips: HTMLSpanElement[] = []
        for (let k = 0; k < S; k++) {
          const sp = document.createElement('span')
          sp.className = s.strip
          sp.style.width = `${sw}px`; sp.style.height = `${CH}px`
          sp.style.left = `${-sw / 2}px`; sp.style.top = `${-CH / 2}px`
          sp.style.transform = `rotateY(${(k - (S - 1) / 2) * st}rad) translateZ(${R}px)`
          el.appendChild(sp); strips.push(sp)
        }
        ring.appendChild(el)
        pool.push({ el, strips, i: null, mono: null, vis: null, b: -1 })
      }
    }
    const assign = (c: Card, i: number) => {
      c.i = i
      const it = items[mod(i, N)]
      const f = coverFit(it, G.CW, G.CH)
      const url = `url("${G.small ? it.th : it.src}")`
      c.el.dataset.i = String(i)
      c.strips.forEach((sp, k) => {
        sp.style.backgroundImage = url
        sp.style.backgroundSize = `${f.bw}px ${f.bh}px`
        sp.style.backgroundPosition = `${-(k * G.CW) / S - f.ox}px ${-f.oy}px`
      })
    }

    // ── Readout under the drum (number, scrambled title, meta) ──
    let scrambleRaf = 0
    const read = (j: number) => {
      const it = items[j]
      nRef.current!.textContent = `${pad(j + 1)} / ${pad(N)}`
      dRef.current!.textContent = `— ${it.meta}`
      ticksRef.current?.querySelectorAll('circle').forEach((c, k) => c.setAttribute('data-on', String(k === j)))
      const t = tRef.current!
      t.href = it.href
      t.setAttribute('aria-label', `${it.title} · ${it.meta} · open the case`)
      cancelAnimationFrame(scrambleRaf)
      const text = it.title, t0 = performance.now(), dur = 280
      const f = (now: number) => {
        const p = Math.min(1, (now - t0) / dur), n = Math.floor(p * text.length)
        let out = text.slice(0, n)
        for (let q = n; q < text.length; q++) out += text[q] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]
        t.textContent = out
        if (p < 1) scrambleRaf = requestAnimationFrame(f)
      }
      scrambleRaf = requestAnimationFrame(f)
    }

    const target = () => {
      const raw = progress() * RANGE + offset
      return performance.now() - lastInput > 160 ? Math.round(raw) : raw
    }
    const step = () => {
      raf = 0
      const t = target()
      r += (t - r) * 0.1
      if (Math.abs(t - r) < 0.0005) r = t
      const v = r - prevR
      prevR = r
      const base = Math.floor(r), moving = Math.abs(v) > 0.004
      for (let i = base - G.HALF; i <= base + G.HALF + 1; i++) {
        const c = pool[mod(i, pool.length)]
        if (c.i !== i) assign(c, i)
        const a = (i - r) * G.dTh, vis = Math.abs(a) < Math.PI * 0.55 && Math.abs(i - r) < N / 2
        if (vis !== c.vis) { c.vis = vis; c.el.style.visibility = vis ? '' : 'hidden' }
        if (!vis) continue
        c.el.style.transform = `translateZ(${-G.R}px) rotateY(${a}rad)`
        // Sides dim by distance from the centre (Figma: 0.29 · 0.55 · 0.74).
        const b = Math.round((1 - Math.min(0.74, Math.abs(i - r) * 0.29)) * 100) / 100
        if (b !== c.b) { c.b = b; c.el.style.setProperty('--b', String(b)) }
        if (moving !== c.mono) { c.mono = moving; c.el.classList.toggle(s.mono, moving) }
      }
      const ci = Math.round(r)
      if (ci !== cur) { cur = ci; read(mod(ci, N)) }
      if (r !== t || performance.now() - lastInput < 400) raf = requestAnimationFrame(step)
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(step) }

    // ── Drag with a 6 px threshold, inertia and click suppression ──
    let pid: number | null = null, sx = 0, lx = 0, moved = false, justDragged = false
    let hist: { x: number; t: number }[] = []
    on(view, 'pointerdown', ((e: PointerEvent) => {
      if (e.button > 0 || pid !== null) return
      pid = e.pointerId; sx = lx = e.clientX; moved = false; hist = [{ x: lx, t: e.timeStamp }]
    }) as EventListener)
    on(view, 'pointermove', ((e: PointerEvent) => {
      if (e.pointerId !== pid) return
      let dx = e.clientX - lx
      lx = e.clientX
      if (!moved && Math.abs(lx - sx) > 6) {
        moved = true; dx = lx - sx
        try { view.setPointerCapture(pid) } catch {}
        view.classList.add(s.dragging)
      }
      if (!moved) return
      hist.push({ x: lx, t: e.timeStamp }); if (hist.length > 6) hist.shift()
      lastInput = performance.now(); offset -= dx / (G.CW + G.g); wake()
    }) as EventListener)
    const up = (e: PointerEvent, cancel: boolean) => {
      if (e.pointerId !== pid) return
      pid = null; view.classList.remove(s.dragging)
      if (!moved) { if (!cancel) tap(e); return }
      const a = hist[0], b = hist[hist.length - 1], dt = Math.max(16, b.t - a.t)
      const vx = e.timeStamp - b.t > 90 ? 0 : (b.x - a.x) / dt
      offset += clamp(-vx * 1.2, -4, 4); lastInput = performance.now(); wake()
      justDragged = true; setTimeout(() => { justDragged = false }, 0)
    }
    on(view, 'pointerup', ((e: PointerEvent) => up(e, false)) as EventListener)
    on(view, 'pointercancel', ((e: PointerEvent) => up(e, true)) as EventListener)
    on(view, 'click', ((e: Event) => { if (justDragged) { e.preventDefault(); e.stopPropagation() } }) as EventListener, true)
    on(view, 'dragstart', ((e: Event) => e.preventDefault()) as EventListener)
    const open = (i: number) => navRef.current(items[mod(i, N)].href)
    const tap = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest?.(`.${s.card}`) as HTMLElement | null
      if (!card || card.dataset.i === undefined) return
      const i = Number(card.dataset.i), c = Math.round(r)
      if (i === c) open(i)
      else { offset += i - c; lastInput = 0; wake() }
    }
    on(view, 'keydown', ((e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); offset = Math.round(offset) + 1; lastInput = 0; wake() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); offset = Math.round(offset) - 1; lastInput = 0; wake() }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(Math.round(r)) }
    }) as EventListener)
    on(window, 'scroll', wake, { passive: true })
    let rz = 0
    on(window, 'resize', () => {
      cancelAnimationFrame(rz)
      rz = requestAnimationFrame(() => { size(); geo(); cur = -1; wake() })
    })

    size(); geo(); r = prevR = target(); wake()
    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(scrambleRaf); cancelAnimationFrame(rz)
      offs.forEach((f) => f())
      ring.textContent = ''
      wrap.style.height = ''
    }
  }, [items])

  const first = items[0]

  return (
    <div className={s.arco}>
      <div ref={wrapRef} className={s.pin}>
        <div ref={innerRef} className={s.inner}>
          <div
            ref={viewRef}
            className={s.view}
            tabIndex={0}
            role="group"
            aria-roledescription="carousel"
            aria-label={`${label}: drag, scroll or use ← →. Enter opens the case in the centre.`}
          >
            <div ref={ringRef} className={s.ring} />
          </div>
          <svg viewBox="0 0 1552 80" className={s.dial} aria-hidden="true">
            <path d="M0 76 Q776 -20 1552 76" fill="none" stroke="currentColor" strokeOpacity="0.35" vectorEffect="non-scaling-stroke" />
            <g ref={ticksRef}>
              {items.map((it, k) => {
                const t = 0.17 + (0.66 * k) / Math.max(1, items.length - 1)
                const x = 1552 * t, y = (1 - t) * (1 - t) * 76 + 2 * (1 - t) * t * -20 + t * t * 76
                return <circle key={it.key} cx={x} cy={y} r={k === start ? 4.5 : 2.5} data-on={String(k === start)} />
              })}
            </g>
          </svg>
          <div className={s.hud}>
            <span ref={nRef} className={s.readN}>{first ? `${pad(start + 1)} / ${pad(items.length)}` : ''}</span>
            <p className={s.read} aria-live="polite">
              <a ref={tRef} href={items[start]?.href ?? '/work'} className={s.readT}>{items[start]?.title}</a>{' '}
              <span ref={dRef} className={s.readD}>— {items[start]?.meta}</span>
            </p>
            <span className={s.hint} aria-hidden="true">{hint}</span>
          </div>
        </div>
      </div>

      {/* Reduced motion (and no JS): a still grid of covers. */}
      <ul className={s.still}>
        {items.map((it, i) => (
          <li key={it.key}>
            <Link href={it.href} className={s.stillLink}>
              <span className={s.stillMedia}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.th} width={it.w} height={it.h} alt="" loading={i < 2 ? 'eager' : 'lazy'} decoding="async" />
              </span>
              <span className={s.stillMeta}>
                <span>{pad(i + 1)} · {it.title}</span>
                <span>{it.meta}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
