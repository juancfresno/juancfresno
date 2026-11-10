// ─── Site page transitions ────────────────────────────────────────────────────
// Each effect draws on one fixed <canvas> that sits over the content area
// (below the nav, under the footer and the mobile tab bar). The provider calls
// cover() before the route changes and reveal() once the new page has painted.
// To try another Lab 002 option on the real site, add it here and change
// SITE_TRANSITION. Nothing outside this file knows how an effect looks.

import grid from '@/components/ui/GridOverlay/GridOverlay.module.scss'

export type SiteTransitionId = 'wireframe-grid' | 'pixels' | 'instant'

/** The one switch: which Lab 002 option the real site uses. */
export const SITE_TRANSITION: SiteTransitionId = 'wireframe-grid'

export type CoverOptions = {
  /** Browser back (or a pop we can't place): the effect runs mirrored. */
  back?: boolean
}

export type TransitionEffect = {
  /** Animate until the content area is fully covered. */
  cover: (o?: CoverOptions) => Promise<void>
  /** Cover at once (browser back/forward: the route is already changing). */
  coverNow: (o?: CoverOptions) => void
  /** Animate the cover away, leaving the canvas empty and hidden. */
  reveal: () => Promise<void>
  /** Stop and clear immediately. */
  cancel: () => void
}

type Factory = (canvas: HTMLCanvasElement) => TransitionEffect

// ─── 05 · Disolución en píxeles (Bayer order) ─────────────────────────────────
// Same timing as the Lab piece: each block switches after its Bayer-ordered
// delay across 240 ms, plus a 40 ms step → 280 ms per half, 560 ms in total.
// 12 square blocks across the viewport; rows fill the content area height.
const PX = { cols: 12, spread: 240, step: 40 }
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

const pixels: Factory = (canvas) => {
  const g = canvas.getContext('2d')
  let raf = 0
  let cells: { x: number; y: number; w: number; h: number; at: number }[] = []
  let settle: (() => void) | null = null

  const layout = () => {
    // Top edge = bottom of the fixed header (0 when it is scrolled away).
    const header = document.querySelector<HTMLElement>('[data-site-header]')
    const top = Math.max(0, Math.round(header?.getBoundingClientRect().bottom ?? 0))
    const w = document.documentElement.clientWidth
    const h = Math.max(1, window.innerHeight - top)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.style.top = `${top}px`
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const size = w / PX.cols
    const rows = Math.ceil(h / size)
    const edge = (v: number) => Math.round(v * dpr) // integer edges: no seams between blocks
    cells = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < PX.cols; x++) {
        const x0 = edge(x * size), x1 = edge((x + 1) * size)
        const y0 = edge(y * size), y1 = edge((y + 1) * size)
        const d = ((BAYER[y % 4][x % 4] + Math.random() * 0.8) / 16) * PX.spread
        cells.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, at: d + PX.step })
      }
    }
    if (g) g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--c-text').trim() || '#fcfcf7'
  }

  const draw = (filled: (at: number) => boolean) => {
    if (!g) return
    g.clearRect(0, 0, canvas.width, canvas.height)
    for (const c of cells) if (filled(c.at)) g.fillRect(c.x, c.y, c.w, c.h)
  }

  const stop = () => {
    cancelAnimationFrame(raf)
    settle?.()
    settle = null
  }

  const play = (covering: boolean) =>
    new Promise<void>((done) => {
      stop()
      settle = done
      const total = PX.spread + PX.step
      const start = performance.now()
      const tick = (now: number) => {
        const t = now - start
        draw((at) => (covering ? t >= at : t < at))
        if (t < total) raf = requestAnimationFrame(tick)
        else {
          settle = null
          done()
        }
      }
      raf = requestAnimationFrame(tick)
    })

  return {
    cover: () => {
      layout()
      canvas.style.visibility = 'visible'
      return play(true)
    },
    coverNow: () => {
      stop()
      layout()
      canvas.style.visibility = 'visible'
      draw(() => true)
    },
    reveal: () =>
      play(false).then(() => {
        canvas.style.visibility = 'hidden'
      }),
    cancel: () => {
      stop()
      g?.clearRect(0, 0, canvas.width, canvas.height)
      canvas.style.visibility = 'hidden'
    },
  }
}

// ─── 01 · Sin transición ──────────────────────────────────────────────────────
const instant: Factory = () => ({
  cover: () => Promise.resolve(),
  coverNow: () => {},
  reveal: () => Promise.resolve(),
  cancel: () => {},
})

// ─── 11a · Cae la retícula ('wireframe-grid') ─────────────────────────────────
// Lab 002 option 11a on the real pages. Times in ms from the click:
//    0–186  one line per gutter drops (6 ms stagger across 12 columns)
//  120–286  each gutter line splits open into its gutter
//  190–355  the columns fill (5 ms stagger)
//  300–390  the old page fades under its wireframe: one outlined box per
//           visible block in <main> (≤ 40) with a mono label ("H1 · 96/96",
//           "IMG 16:9", "P · 16")  → covered: route change, wait for the page
//  +0–258   the new page is measured; the boxes travel (FLIP) to its blocks
//           in 230 ms + ≤ 28 ms stagger while the labels re-type; extra boxes
//           fade in, leftovers fade out
//  +110     content shows, grid and boxes fade.  ≈ 750 ms + the route wait.
// Browser back runs mirrored (right → left, last box first). The grid is the G
// overlay's own CSS (GridOverlay.module.scss) measured live, so it is the real
// grid at every width: 12 columns, margin 64 / gutter 16 at 1680, liquid;
// 4 columns ≤ 768 px. Grid in the G orange; boxes and labels in --c-text/--c-bg.
const WF = {
  drop: 120, dropStagger: 6, splitAt: 120, split: 100,
  fillAt: 190, fill: 110, fillStagger: 5,
  boxesAt: 300, boxes: 90,
  move: 230, moveStagger: 4, staggerCap: 28, relabel: 0.7,
  out: 110, maxBoxes: 40,
}
const ACCENT = '255, 92, 30' // GridOverlay orange
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/'

const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t
  const sy = (t: number) => ((ay * t + by) * t + cy) * t
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0, hi = 1, t = x
    for (let i = 0; i < 18; i++) {
      const v = sx(t)
      if (Math.abs(v - x) < 1e-4) break
      if (v < x) lo = t; else hi = t
      t = (lo + hi) / 2
    }
    return sy(t)
  }
}
const EASE = bezier(0.19, 1, 0.22, 1)     // Lab EASE (expo out)
const EASE_IO = bezier(0.76, 0, 0.24, 1)  // Lab EASE_IO
const EASE_OUT = bezier(0, 0, 0.58, 1)
const prog = (t: number, at: number, dur: number) => Math.max(0, Math.min(1, (t - at) / dur))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

type Block = { x: number; y: number; w: number; h: number; label: string }
type Pair = { a: Block; b: Block; born: boolean; dies: boolean }

const RATIOS: [number, number][] = [[1, 1], [5, 4], [4, 3], [3, 2], [16, 10], [16, 9], [21, 9], [4, 5], [3, 4], [2, 3], [9, 16]]
const ratio = (w: number, h: number) => {
  let best = RATIOS[0]
  for (const q of RATIOS) if (Math.abs(w / h - q[0] / q[1]) < Math.abs(w / h - best[0] / best[1])) best = q
  return `${best[0]}:${best[1]}`
}

// What counts as a block: text, media, rows and cards. Containers (rows,
// cards, links) become ONE box unless they are taller than half the screen,
// in which case their children come through instead.
const BLOCKS = 'h1,h2,h3,h4,h5,h6,p,blockquote,pre,figure,picture,img,video,canvas,svg,li,tr,dt,dd,button,a,[data-wf]'
const CONTAINERS = 'li,tr,figure,a,button,[data-wf]'
const MEDIA = 'img,video,canvas,picture'

function labelOf(el: Element, r: DOMRect, row: () => number) {
  const own = el.getAttribute('data-wf-label') // e.g. the feed canvas: "CANVAS · 201"
  if (own) return own
  const tag = el.tagName.toUpperCase()
  const cs = getComputedStyle(el)
  const fs = Math.round(parseFloat(cs.fontSize) || 16)
  const lh = Math.round(parseFloat(cs.lineHeight) || fs * 1.2)
  if (/^H[1-6]$/.test(tag)) return `${tag} · ${fs}/${lh}`
  const media = el.matches(MEDIA) ? el : el.querySelector('img,video,canvas')
  if (media) {
    const m = media.getBoundingClientRect()
    if (m.width * m.height >= 0.45 * r.width * r.height && m.height > 0) {
      return `${media.tagName === 'VIDEO' ? 'VID' : 'IMG'} ${ratio(m.width, m.height)}`
    }
  }
  if (tag === 'SVG') return 'SVG'
  const mono = /mono/i.test(cs.fontFamily) ? ' MONO' : ''
  if (/^(P|BLOCKQUOTE|PRE|DD|DT)$/.test(tag)) return `P · ${fs}${mono}`
  if (tag === 'BUTTON') return `BTN · ${fs}`
  if (tag === 'A' && r.height < 64) return `LINK · ${fs}${mono}`
  return `ROW · ${String(row()).padStart(2, '0')}`
}

// Text blocks hug their text (padding and empty line space don't count).
const TEXT = /^(H[1-6]|P|BLOCKQUOTE|PRE|DD|DT)$/
function textRect(el: Element) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const r = range.getBoundingClientRect()
  return r.width > 0 && r.height > 0 ? r : el.getBoundingClientRect()
}

// Visible blocks inside <main>, in reading order, relative to the canvas.
function collectBlocks(top: number, height: number): Block[] {
  const main = document.querySelector('main')
  if (!main) return []
  const vh = window.innerHeight
  const picked: Element[] = []
  const out: { el: Element; r: DOMRect }[] = []
  for (const el of Array.from(main.querySelectorAll(BLOCKS))) {
    if (picked.some((p) => p.contains(el))) continue
    const r = TEXT.test(el.tagName) ? textRect(el) : el.getBoundingClientRect()
    if (r.width < 8 || r.height < 6) continue
    if (r.bottom <= top || r.top >= top + height || r.right <= 0 || r.left >= window.innerWidth) continue
    if (el.closest('[aria-hidden="true"]') && !el.matches(MEDIA)) continue
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
    if (el.matches(CONTAINERS) && r.height > vh * 0.5) continue
    // Inline links inside running text belong to their paragraph.
    if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') continue
    picked.push(el)
    out.push({ el, r })
  }
  out.sort((p, q) => (Math.round(p.r.top / 6) - Math.round(q.r.top / 6)) || (p.r.left - q.r.left))
  let rows = 0
  const row = () => ++rows
  return out.slice(0, WF.maxBoxes).map(({ el, r }) => ({
    x: r.left, y: r.top - top, w: r.width, h: r.height, label: labelOf(el, r, row),
  }))
}

// A hidden copy of the G overlay: its columns ARE the site grid.
let probe: HTMLDivElement | null = null
function gridProbe() {
  if (!probe || !probe.isConnected) {
    probe = document.createElement('div')
    probe.className = grid.overlay
    probe.setAttribute('aria-hidden', 'true')
    probe.style.visibility = 'hidden'
    probe.style.fontFamily = 'var(--font-fragment-mono), ui-monospace, monospace'
    const inner = document.createElement('div')
    inner.className = grid.inner
    for (let i = 0; i < 12; i++) {
      const c = document.createElement('span')
      c.className = grid.col
      inner.appendChild(c)
    }
    probe.appendChild(inner)
    document.body.appendChild(probe)
  }
  const cols = Array.from(probe.firstElementChild!.children)
    .map((c) => c.getBoundingClientRect())
    .filter((r) => r.width > 0)
    .map((r) => ({ x: r.left, w: r.width }))
  return { cols, font: getComputedStyle(probe).fontFamily }
}

const scramble = (from: string, to: string, p: number) => {
  if (p <= 0) return from
  if (p >= 1) return to
  const n = Math.floor(p * to.length)
  let s = ''
  for (let i = 0; i < to.length; i++) {
    const ch = to[i]
    s += i < n || ch === ' ' || ch === '·' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]
  }
  return s
}

const wireframeGrid: Factory = (canvas) => {
  const g = canvas.getContext('2d')
  let raf = 0
  let W = 0, H = 0, dpr = 1
  let cols: { x: number; w: number }[] = []
  let gap = 16
  let font = 'monospace'
  let bg = '#10100e', ink = '#fcfcf7'
  let A: Block[] = []
  let pairs: Pair[] = []
  let back = false, pop = false
  let t0 = 0, t1 = -1
  let stagger = 0, outAt = 0
  let coverEnd = 0
  let onCovered: (() => void) | null = null
  let onRevealed: (() => void) | null = null
  let covered: Promise<void> = Promise.resolve()

  const layout = () => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')
    const top = Math.max(0, Math.round(header?.getBoundingClientRect().bottom ?? 0))
    W = document.documentElement.clientWidth
    H = Math.max(1, window.innerHeight - top)
    dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.style.top = `${top}px`
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    const p = gridProbe()
    cols = p.cols
    font = p.font || 'monospace'
    gap = cols.length > 1 ? cols[1].x - (cols[0].x + cols[0].w) : 16
    const root = getComputedStyle(document.documentElement)
    bg = root.getPropertyValue('--c-bg').trim() || bg
    ink = root.getPropertyValue('--c-text').trim() || ink
    return top
  }

  const box = (r: { x: number; y: number; w: number; h: number }, label: string, a: number, master: number) => {
    if (!g || a <= 0 || r.w < 1 || r.h < 1) return
    g.fillStyle = ink
    g.globalAlpha = master * a * 0.05
    g.fillRect(r.x, r.y, r.w, r.h)
    g.globalAlpha = master * a * 0.85
    g.strokeStyle = ink
    g.lineWidth = 1
    g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1)
    if (r.w < 40 || r.h < 16) return
    const tw = g.measureText(label).width
    const cw = Math.min(r.w, tw + 10)
    g.globalAlpha = master * a
    g.fillRect(r.x, r.y, cw, 16)
    g.save()
    g.beginPath()
    g.rect(r.x, r.y, cw, 16)
    g.clip()
    g.fillStyle = bg
    g.fillText(label, r.x + 5, r.y + 11.5)
    g.restore()
  }

  const draw = (now: number) => {
    if (!g) return
    const tc = now - t0
    const tr = t1 >= 0 ? now - t1 : -1
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.globalAlpha = 1
    g.clearRect(0, 0, W, H)
    const master = tr < 0 ? 1 : 1 - EASE_OUT(prog(tr, outAt, WF.out))
    if (master <= 0) return

    // The old page fades under the wireframe (at once on back/forward).
    const veil = pop ? 1 : EASE_OUT(prog(tc, WF.boxesAt, WF.boxes))
    if (veil > 0) {
      g.globalAlpha = master * veil
      g.fillStyle = bg
      g.fillRect(0, 0, W, H)
    }

    // Grid: lines drop, gutters split open, columns fill.
    const n = cols.length
    const k = n > 1 ? 11 / (n - 1) : 0 // 4 mobile columns keep the 12-column rhythm
    for (let i = 0; i < n; i++) {
      const c = cols[i]
      const o = (back ? n - 1 - i : i) * k
      const pf = EASE(prog(tc, WF.fillAt + o * WF.fillStagger, WF.fill))
      if (pf > 0) {
        g.globalAlpha = master
        g.fillStyle = `rgba(${ACCENT}, 0.07)`
        g.fillRect(c.x, 0, c.w, H * pf)
      }
      const pd = EASE(prog(tc, o * WF.dropStagger, WF.drop))
      if (pd <= 0) continue
      const ps = EASE_IO(prog(tc, WF.splitAt + o * WF.dropStagger, WF.split))
      g.globalAlpha = master
      g.fillStyle = `rgba(${ACCENT}, 0.6)`
      const left = c.x + (i > 0 ? -gap / 2 : 0) * (1 - ps)
      const right = c.x + c.w - 1 + (i < n - 1 ? gap / 2 : 0) * (1 - ps)
      g.fillRect(Math.round(left * dpr) / dpr, 0, 1, H * pd)
      g.fillRect(Math.round(right * dpr) / dpr, 0, 1, H * pd)
    }

    // Boxes.
    g.font = `${10 * Math.max(1, window.innerWidth / 1680)}px ${font}`
    const boxIn = EASE_OUT(prog(tc, pop ? 0 : WF.boxesAt, WF.boxes))
    if (tr < 0) {
      for (const b of A) box(b, b.label, boxIn, master)
      return
    }
    const m = pairs.length
    for (let j = 0; j < m; j++) {
      const x = pairs[j]
      const at = (back ? m - 1 - j : j) * stagger
      const p = EASE(prog(tr, at, WF.move))
      const a = boxIn * (x.born ? p : x.dies ? 1 - p : 1)
      const r = { x: lerp(x.a.x, x.b.x, p), y: lerp(x.a.y, x.b.y, p), w: lerp(x.a.w, x.b.w, p), h: lerp(x.a.h, x.b.h, p) }
      const label = x.born ? x.b.label : x.dies ? x.a.label : scramble(x.a.label, x.b.label, prog(tr, at, WF.move * WF.relabel))
      box(r, label, a, master)
    }
  }

  const stop = () => {
    cancelAnimationFrame(raf)
    raf = 0
  }

  const settle = () => {
    stop()
    g?.clearRect(0, 0, canvas.width, canvas.height)
    canvas.style.visibility = 'hidden'
    t1 = -1
    A = []
    pairs = []
    onCovered?.()
    onCovered = null
    const done = onRevealed
    onRevealed = null
    done?.()
  }

  const loop = (now: number) => {
    raf = 0
    draw(now)
    if (onCovered && now - t0 >= coverEnd) {
      onCovered()
      onCovered = null
    }
    if (t1 >= 0 && now - t1 >= outAt + WF.out) {
      settle()
      return
    }
    raf = requestAnimationFrame(loop)
  }

  const start = (o: CoverOptions | undefined, isPop: boolean) => {
    stop()
    back = !!o?.back
    pop = isPop
    const top = layout()
    A = collectBlocks(top, H)
    pairs = []
    t1 = -1
    t0 = performance.now()
    // Covered = grid filled (back/forward) or old page gone under the boxes.
    const spread = (cols.length > 1 ? 11 : 0) * WF.fillStagger
    coverEnd = pop ? WF.fillAt + WF.fill + spread : WF.boxesAt + WF.boxes
    covered = new Promise<void>((r) => { onCovered = r })
    canvas.style.visibility = 'visible'
    draw(t0)
    raf = requestAnimationFrame(loop)
    return covered
  }

  return {
    cover: (o) => start(o, false),
    coverNow: (o) => { start(o ?? { back: true }, true) },
    reveal: async () => {
      await covered
      if (canvas.style.visibility !== 'visible') return
      const top = Math.round(parseFloat(canvas.style.top) || 0)
      const B = collectBlocks(top, H)
      const n = Math.max(A.length, B.length)
      pairs = []
      for (let i = 0; i < n; i++) {
        const b = B[i] ?? B[B.length - 1]
        const a = A[i] ?? A[A.length - 1] ?? b
        pairs.push({ a, b: b ?? a, born: !A[i], dies: !B[i] })
      }
      stagger = n > 1 ? Math.min(WF.moveStagger, WF.staggerCap / (n - 1)) : 0
      outAt = n ? WF.move + (n - 1) * stagger : 0
      return new Promise<void>((r) => {
        onRevealed = r
        t1 = performance.now()
        if (!raf) raf = requestAnimationFrame(loop)
      })
    },
    cancel: settle,
  }
}

export const EFFECTS: Record<SiteTransitionId, Factory> = { 'wireframe-grid': wireframeGrid, pixels, instant }

