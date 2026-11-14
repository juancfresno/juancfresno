'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ACCENT, EASE, EASE_DROP, EASE_ENTER, EASE_OUT, EASE_SOFT, gridProbe, prog, scramble } from '@/components/transition/effects'
import type { IntroGrid } from './introScript'
import s from './wip.module.scss'

// ─── WIP entrance: from structure to design ───────────────────────────────────
// The site transition's language (Lab 002 · 11a "Cae la retícula",
// components/transition/effects.ts: same grid probe, eases, blue, glyphs)
// played once over the landing, then resolved into the real page:
//   1. the 12 grid lines drop, the gutters open, the columns fill;
//   2. outlined boxes with mono labels appear where the real elements are
//      (measured: NAV, LOGO, H1 · 40/46, P · 11 MONO, P · 18, FOOTER);
//   3. GO: boxes fade out in reading order while the page takes their place
//      (CSS [data-in] animations, paused until html[data-intro-go]): header
//      pieces, the greeting decodes (HeadlineCycle), role and lines rise
//      through masks, footer last; the lens background fades in underneath;
//      the grid fades away.
// Motion (full run; "fast" = ×0.5): every phase overlaps the next, nothing
// pops. Lines fall from the top (ease-out, 28 ms stagger left → right,
// a bright head that dims as each line lands), the gutters open while the
// lines are still falling, the columns fill downward behind them, the boxes
// grow in, and at GO (≈1.1 s) the page takes over while the grid dissolves.
// Readable ≈1.5 s, canvas gone ≈1.7 s. Reduced motion = a plain fade (no
// wireframe). Any input skips to the end. The head script (introScript.ts)
// decides the mode before paint and releases the page after 3.5 s if this
// never runs.
// Since Nov 2026 the grid itself is drawn by the inline head script
// (introScript.ts → window.__introGrid), from the first paint, and leaves by
// falling out of the bottom; this component adds the boxes, times GO from the
// grid's clock and lets each box go as its own element comes in (--in-d).
// The grid code below is the fallback when that script did not run.
const T = {
  drop: 520, dropStagger: 28,             // per line: top → bottom (ease-out: visible at once)
  splitAt: 300, split: 520,               // gutters open (per line, same stagger)
  fillAt: 420, fill: 620, fillStagger: 0,  // all columns fill down together (no staircase)
  boxesAt: 680, boxIn: 380, boxStagger: 30, type: 380,
  go: 1100,
  boxOut: 320,                            // each box leaves as its element enters (GO + its --in-d)
  gridOutAt: 880, gridOut: 420,           // grid gone before the background enters
}
const HEAD = 72 // px of brighter "falling head" on each line
const TAIL = { full: 1180, fast: 1180 } // ms after GO until the CSS run is over (×k)

// d = the element's own entrance delay after GO (--in-d): its box leaves then.
type Box = { x: number; y: number; w: number; h: number; label: string; d: number }

function labelFor(el: Element): string {
  const own = el.getAttribute('data-wire')
  if (own) return own
  const cs = getComputedStyle(el)
  const fs = Math.round(parseFloat(cs.fontSize) || 16)
  const lh = Math.round(parseFloat(cs.lineHeight) || fs * 1.2)
  if (el.closest('h1')) return `H1 · ${fs}/${lh}`
  return `P · ${fs}${/mono/i.test(cs.fontFamily) ? ' MONO' : ''}`
}

// Final geometry of every block, whatever its entrance transform is doing:
// masks are measured on the (untransformed) mask, text hugs its glyphs.
function measure(): Box[] {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-wire]'))
  const out: Box[] = []
  for (const el of els) {
    let r = el.getBoundingClientRect()
    if (el.hasAttribute('data-wire-text')) {
      const range = document.createRange()
      range.selectNodeContents(el)
      const t = range.getBoundingClientRect()
      if (t.width > 0) r = new DOMRect(t.left, r.top, Math.min(t.width, r.width), r.height)
    }
    if (r.width < 6 || r.height < 6 || r.bottom < 0 || r.top > window.innerHeight) continue
    const inner = el.querySelector('[data-in]') ?? el
    const d = parseFloat(getComputedStyle(inner).getPropertyValue('--in-d')) || 0
    out.push({ x: r.left, y: r.top, w: r.width, h: r.height, label: labelFor(inner), d })
  }
  out.sort((a, b) => (Math.round(a.y / 8) - Math.round(b.y / 8)) || a.x - b.x)
  return out
}

export default function Intro() {
  const cv = useRef<HTMLCanvasElement>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => setHost(document.body), [])

  useEffect(() => {
    if (!host) return
    const r = document.documentElement
    const mode = r.dataset.intro
    if (!mode) return
    const go = () => { if (!('introGo' in r.dataset)) { r.dataset.introGo = ''; window.dispatchEvent(new Event('wip:intro-go')) } }
    const clear = () => { delete r.dataset.intro; delete r.dataset.introGo; delete r.dataset.introSkip }
    if (mode === 'reduced') {
      go()
      const t = window.setTimeout(clear, 500)
      return () => window.clearTimeout(t)
    }
    const k = mode === 'fast' ? 0.5 : 1
    // The grid has been falling since the first paint (introScript.ts). If the
    // page was already released (slow connection: the 2.4 s safety), nothing
    // is left for the boxes: let the grid go and stop here.
    const grid = (window as unknown as { __introGrid?: IntroGrid }).__introGrid
    if ('introGo' in r.dataset) {
      grid?.out()
      const t = window.setTimeout(clear, TAIL.full * k)
      return () => window.clearTimeout(t)
    }
    const canvas = cv.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) { go(); grid?.out(); return }

    const W = document.documentElement.clientWidth, H = window.innerHeight
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
    const probe = gridProbe()
    const cols = probe.cols
    const gap = cols.length > 1 ? cols[1].x - (cols[0].x + cols[0].w) : 16
    const ink = getComputedStyle(r).getPropertyValue('--c-text').trim() || '#fcfcf7'
    const bg = getComputedStyle(r).getPropertyValue('--c-bg').trim() || '#10100e'
    const boxes = measure()

    // With the early grid the clock is its clock; boxes, GO and the exit shift
    // by however late the bundle arrived (0 on a normal load).
    const late = grid?.t0 ? (performance.now() - grid.t0) / k : 0
    const shift = Math.max(0, late - T.boxesAt + 40)
    const maxD = boxes.reduce((m, b) => Math.max(m, b.d), 0)

    let raf = 0, t0 = grid?.t0 ?? 0, done = false
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    const off = () => evs.forEach((e) => window.removeEventListener(e, skip, true))
    const finish = () => {
      if (done) return
      done = true
      cancelAnimationFrame(raf)
      off()
      g.clearRect(0, 0, canvas.width, canvas.height)
      canvas.style.display = 'none'
    }
    let endTimer = 0
    function skip() {
      r.dataset.introSkip = ''
      go()
      grid?.kill()
      window.dispatchEvent(new Event('wip:intro-skip'))
      finish()
      window.clearTimeout(endTimer)
      endTimer = window.setTimeout(clear, 60)
    }

    const frame = (now: number) => {
      if (!t0) t0 = now
      const t = (now - t0) / k - shift
      if (t >= T.go) go()
      if (t >= T.gridOutAt) grid?.out()
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, W, H)

      // Grid: lines fall from the top, gutters open, columns fill downward;
      // then it dissolves. Everything eased, no step changes in alpha.
      const gridA = grid ? 0 : 1 - EASE_SOFT(prog(t, T.gridOutAt, T.gridOut))
      const n = cols.length
      const step = n > 1 ? 11 / (n - 1) : 0 // same total stagger for 24 (or 4 phone) columns
      if (gridA > 0) {
        for (let i = 0; i < n; i++) {
          const c = cols[i], o = i * step
          const pf = EASE_SOFT(prog(t, T.fillAt + o * T.fillStagger, T.fill))
          if (pf > 0) {
            g.globalAlpha = gridA * Math.min(1, pf * 2)
            g.fillStyle = `rgba(${ACCENT}, 0.04)`
            g.fillRect(c.x, 0, c.w, H * pf)
          }
          const rd = prog(t, o * T.dropStagger, T.drop)
          if (rd <= 0) continue
          const pd = EASE_DROP(rd)
          const ps = EASE_SOFT(prog(t, T.splitAt + o * T.dropStagger, T.split))
          const left = c.x + (i > 0 ? -gap / 2 : 0) * (1 - ps)
          const right = c.x + c.w - 1 + (i < n - 1 ? gap / 2 : 0) * (1 - ps)
          const yEnd = H * pd
          const head = 1 - EASE_OUT(prog(t, o * T.dropStagger + T.drop * 0.85, 260)) // dims as it lands
          for (const lx of [left, right]) {
            const x = Math.round(lx * dpr) / dpr
            // body (fades in over the first few frames, no pop)
            g.globalAlpha = gridA * Math.min(1, rd * 6)
            g.fillStyle = `rgba(${ACCENT}, 0.55)`
            g.fillRect(x, 0, 1, yEnd)
            // falling head: brighter gradient at the leading edge
            if (head > 0 && yEnd > 2) {
              const h0 = Math.max(0, yEnd - HEAD)
              const grd = g.createLinearGradient(0, h0, 0, yEnd)
              grd.addColorStop(0, `rgba(${ACCENT}, 0)`)
              grd.addColorStop(1, `rgba(${ACCENT}, 1)`)
              g.globalAlpha = gridA * head
              g.fillStyle = grd
              g.fillRect(x, h0, 1, yEnd - h0)
            }
          }
        }
      }

      // Boxes: in with re-typing labels, out in reading order at GO.
      g.font = `10px ${probe.font || 'monospace'}`
      boxes.forEach((b, j) => {
        const pin = EASE_ENTER(prog(t, T.boxesAt + j * T.boxStagger, T.boxIn))
        const pout = EASE_SOFT(prog(t, T.go + b.d, T.boxOut))
        const a = pin * (1 - pout)
        if (a <= 0.003) return
        const grow = 0.96 + 0.04 * EASE(pin)
        const w = b.w * grow, h = b.h * grow
        const x = b.x + (b.w - w) / 2, y = b.y + (b.h - h) / 2
        g.globalAlpha = a * 0.06
        g.fillStyle = ink
        g.fillRect(x, y, w, h)
        g.globalAlpha = a * 0.85
        g.strokeStyle = ink
        g.lineWidth = 1
        g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
        if (w < 36 || h < 12) return
        const label = scramble(b.label.replace(/./g, ' '), b.label, prog(t, T.boxesAt + j * T.boxStagger, T.type))
        const lw = Math.min(w, g.measureText(b.label).width + 10)
        g.globalAlpha = a
        g.fillRect(x, y, lw, 16)
        g.save()
        g.beginPath(); g.rect(x, y, lw, 16); g.clip()
        g.fillStyle = bg
        g.fillText(label, x + 5, y + 11.5)
        g.restore()
      })
      g.globalAlpha = 1

      const last = Math.max(grid ? 0 : T.gridOutAt + T.gridOut, T.go + maxD + T.boxOut)
      if (t >= last) { finish(); return }
      raf = requestAnimationFrame(frame)
    }

    evs.forEach((e) => window.addEventListener(e, skip, { capture: true, passive: true }))
    raf = requestAnimationFrame(frame)
    endTimer = window.setTimeout(clear, (shift + T.go + maxD + TAIL[mode === 'fast' ? 'fast' : 'full']) * k - (grid?.t0 ? performance.now() - grid.t0 : 0) + 200)
    return () => { finish(); grid?.kill(); window.clearTimeout(endTimer) }
  }, [host])

  // Over everything (header and footer too), under the grain.
  return host ? createPortal(<canvas ref={cv} className={s.wire} aria-hidden="true" />, host) : null
}
