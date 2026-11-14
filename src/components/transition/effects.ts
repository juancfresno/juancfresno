// ─── Site page transitions ────────────────────────────────────────────────────
// Each effect draws on one fixed <canvas> over the WHOLE viewport (z 450: above
// the nav, the footer, the tab bar and the G grid overlay). While it is visible
// it swallows clicks. The provider calls cover() before the route changes and
// reveal() once the new page has painted. To try another Lab 002 option on the
// real site, add it here and change SITE_TRANSITION. Nothing outside this file
// knows how an effect looks.

import grid from '@/components/ui/GridOverlay/GridOverlay.module.scss'
import { GRID_COLS } from '@/components/ui/GridOverlay/config'
import { currentPageTheme } from '@/lib/pageTheme'

export type SiteTransitionId = 'wireframe-grid' | 'wireframe-build' | 'pixels' | 'instant'

/** The one switch: which Lab 002 option the real site uses. */
export const SITE_TRANSITION: SiteTransitionId = 'wireframe-build'

// Preview switch: `?tr=b` plays Propuesta B ('wireframe-build') for the rest of
// the session (sessionStorage 'tr'), `?tr=a` is the earlier 'wireframe-grid' (Propuesta A).
const TR_PREVIEW: Record<string, SiteTransitionId> = { a: 'wireframe-grid', b: 'wireframe-build' }
export function siteTransitionId(): SiteTransitionId {
  try {
    const q = new URLSearchParams(location.search).get('tr')
    if (q && q in TR_PREVIEW) sessionStorage.setItem('tr', q)
    const v = sessionStorage.getItem('tr')
    if (v && v in TR_PREVIEW) return TR_PREVIEW[v]
  } catch {}
  return SITE_TRANSITION
}

export type CoverOptions = {
  /** Browser back (or a pop we can't place): the effect runs mirrored. */
  back?: boolean
  /** clientX of the click: the grid lines drop from that column outwards. */
  originX?: number
  /** Destination line typed once on the HUD if the route takes > 120 ms. */
  hud?: string
  /** Reduced motion: only the --c-bg veil fades (120 ms), no grid or boxes. */
  still?: boolean
}

export type TransitionEffect = {
  /** Animate until the viewport is fully covered. */
  cover: (o?: CoverOptions) => Promise<void>
  /** Cover at once (browser back/forward: the route is already changing). */
  coverNow: (o?: CoverOptions) => void
  /** Animate the cover away, leaving the canvas empty and hidden. */
  reveal: () => Promise<void>
  /** Stop and clear immediately. */
  cancel: () => void
}

type Factory = (canvas: HTMLCanvasElement) => TransitionEffect

const show = (canvas: HTMLCanvasElement, on: boolean) => {
  canvas.style.visibility = on ? 'visible' : 'hidden'
  canvas.style.pointerEvents = on ? 'auto' : 'none'
}

// ─── 05 · Disolución en píxeles (Bayer order) ─────────────────────────────────
// Same timing as the Lab piece: each block switches after its Bayer-ordered
// delay across 240 ms, plus a 40 ms step → 280 ms per half, 560 ms in total.
// 12 square blocks across the viewport; rows fill the viewport height.
const PX = { cols: 12, spread: 240, step: 40 }
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

const pixels: Factory = (canvas) => {
  const g = canvas.getContext('2d')
  let raf = 0
  let cells: { x: number; y: number; w: number; h: number; at: number }[] = []
  let settle: (() => void) | null = null

  const layout = () => {
    const w = document.documentElement.clientWidth
    const h = Math.max(1, window.innerHeight)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
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
      show(canvas, true)
      return play(true)
    },
    coverNow: () => {
      stop()
      layout()
      show(canvas, true)
      draw(() => true)
    },
    reveal: () =>
      play(false).then(() => show(canvas, false)),
    cancel: () => {
      stop()
      g?.clearRect(0, 0, canvas.width, canvas.height)
      show(canvas, false)
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

// ─── 'wireframe-grid' · Plano total (Lab 002 · 11a, Propuesta A) ──────────────
// The whole screen becomes a construction plan for an instant: header, content
// and footer are blocks of the same wireframe. Layers, bottom → top: real page
// → full-screen --c-bg veil → grid lines → boxes → one HUD line. Times in ms:
//   0–60    header, footer and tab bar appear as 1 px bands (--c-text 0.5)
//           exactly on their real rects; they never move.
//   0–180   the 25 column-edge lines (outer edges + gutter centres) drop from
//           y 0 to the full height, 4 ms stagger from the clicked column out.
//  80–220   the veil rises 0 → 1 over everything: the old page goes while the
//           grid falls. No column fill.
// 120–180   ≤ 8 section boxes (≤ 5 on phones), outline only (--c-text 0.55),
//           snapped to the column edges, fade in.
//    240    covered → route change; nav chip, page theme and scroll change
//           under the cover. Wait > 120 ms → the HUD types "→ ABOUT · 01".
//  +0–280   new page measured; boxes travel (FLIP, expo-out, ≤ 40 ms total
//           stagger) matched by kind, then overlap. Leftovers collapse into
//           the nearest gutter line (width → 0); new ones grow out of one.
// +200–320  the veil and the boxes fade out (120 ms), the lines go up and out
//           through the header (100 ms).  ≈ 560 ms + the route wait.
// Back/forward covers at once (lines down, veil 1) and runs mirrored. Into the
// blue Contact (or out of it) the plane re-tints to the new page's colours in
// the first 120 ms of the reveal; on blue the lines are --c-text at 0.35.
const WF = {
  bands: 60,
  drop: 180, dropStagger: 4,
  veilAt: 80, veil: 140,
  boxesAt: 120, boxes: 60,
  coverEnd: 240,
  hudAfter: 120, hudChar: 16,
  move: 280, staggerCap: 40, tint: 120,
  outAt: 200, out: 120, linesOut: 100,
  still: 120,
  maxBoxes: 8, maxBoxesMobile: 5,
}
export const ACCENT = '0, 61, 255' // grid colour #003DFF
export const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/'

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
// Shared with the WIP intro (wip/Intro.tsx) and lib/scramble: same eases, grid and glyphs.
export const EASE = bezier(0.19, 1, 0.22, 1)     // Lab EASE (expo out)
export const EASE_IO = bezier(0.76, 0, 0.24, 1)  // Lab EASE_IO
export const EASE_OUT = bezier(0, 0, 0.58, 1)
export const EASE_SOFT = bezier(0.65, 0, 0.35, 1) // soft in-out (WIP intro grid only)
export const EASE_DROP = bezier(0.33, 1, 0.68, 1) // WIP intro line drop: visible from the first frames
export const EASE_ENTER = bezier(0.22, 1, 0.36, 1) // WIP: everything that enters (masks, background, decode)
export const prog = (t: number, at: number, dur: number) => Math.max(0, Math.min(1, (t - at) / dur))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

// A hidden copy of the G overlay: its columns ARE the site grid.
let probe: HTMLDivElement | null = null
export function gridProbe() {
  if (!probe || !probe.isConnected) {
    probe = document.createElement('div')
    probe.className = grid.overlay
    probe.setAttribute('aria-hidden', 'true')
    probe.style.visibility = 'hidden'
    probe.style.fontFamily = 'var(--font-mono), ui-monospace, monospace'
    const inner = document.createElement('div')
    inner.className = grid.inner
    for (let i = 0; i < GRID_COLS; i++) {
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

// Used by the WIP intro (wip/Intro.tsx); the site transition has no labels.
export const scramble = (from: string, to: string, p: number) => {
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

// ─── Colours ──────────────────────────────────────────────────────────────────
type RGBA = [number, number, number, number]
let parser: CanvasRenderingContext2D | null = null
function rgba(css: string, fallback: RGBA): RGBA {
  if (!css) return fallback
  parser ??= document.createElement('canvas').getContext('2d')
  if (!parser) return fallback
  parser.fillStyle = '#000'
  parser.fillStyle = css
  const v = String(parser.fillStyle)
  if (v[0] === '#') return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 1]
  const m = v.match(/[\d.]+/g)
  return m ? [+m[0], +m[1], +m[2], m[3] != null ? +m[3] : 1] : fallback
}
type Palette = { bg: RGBA; ink: RGBA; dim: RGBA; line: RGBA }
function palette(): Palette {
  const root = getComputedStyle(document.documentElement)
  const bg = rgba(root.getPropertyValue('--c-bg').trim(), [16, 16, 14, 1])
  const ink = rgba(root.getPropertyValue('--c-text').trim(), [252, 252, 247, 1])
  const dim = rgba(root.getPropertyValue('--c-text-dim').trim(), [ink[0], ink[1], ink[2], 0.5])
  // On the blue page (Contact) the blue grid would vanish: --c-text at 0.35.
  const line: RGBA = currentPageTheme() === 'blue' ? [ink[0], ink[1], ink[2], 0.35] : [0, 61, 255, 1]
  return { bg, ink, dim, line }
}
const mix = (a: RGBA, b: RGBA, p: number): RGBA => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p), lerp(a[3], b[3], p)]
const css = (c: RGBA, alpha = 1) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${Math.max(0, Math.min(1, c[3] * alpha))})`

// ─── Blocks ───────────────────────────────────────────────────────────────────
type Kind = 'head' | 'text' | 'media' | 'index' | 'fixed'
type Rect = { x: number; y: number; w: number; h: number }
type Box = Rect & { kind: Kind }
type Pair = { a: Rect; b: Rect; born: boolean; dies: boolean; order: number }

const SKIP = 'script,style,template,noscript,link,meta'
const MEDIA = 'img,video,canvas,picture,svg'
const KINDS: Kind[] = ['head', 'text', 'media', 'index']

const area = (r: Rect) => Math.max(0, r.w) * Math.max(0, r.h)
const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}
const inter = (a: Rect, b: Rect) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}
const iou = (a: Rect, b: Rect) => { const i = inter(a, b); return i ? i / (area(a) + area(b) - i) : 0 }
const fromDOM = (r: DOMRect): Rect => ({ x: r.left, y: r.top, w: r.width, h: r.height })
const visible = (el: Element) =>
  typeof el.checkVisibility !== 'function' || el.checkVisibility({ opacityProperty: true, visibilityProperty: true })

// What the eye sees of a block: the union of its text runs and media, not the
// padding or the empty width of a wrapper.
let range: Range | null = null
function hug(el: Element, r: Rect): Rect | null {
  range ??= document.createRange()
  let out: Rect | null = null
  const add = (q: Rect) => { if (q.w > 0 && q.h > 0) out = out ? union(out, q) : q }
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let n = 0
  for (let t = walker.nextNode(); t && n < 400; t = walker.nextNode(), n++) {
    if (!t.textContent?.trim()) continue
    range.selectNodeContents(t)
    add(fromDOM(range.getBoundingClientRect()))
  }
  if (el.matches(MEDIA)) add(r)
  for (const m of Array.from(el.querySelectorAll(MEDIA)).slice(0, 40)) add(fromDOM(m.getBoundingClientRect()))
  const q = out as Rect | null
  if (!q || !inter(q, r)) return null
  const x0 = Math.max(r.x, q.x), y0 = Math.max(r.y, q.y)
  return { x: x0, y: y0, w: Math.min(r.x + r.w, q.x + q.w) - x0, h: Math.min(r.y + r.h, q.y + q.h) - y0 }
}

function kindOf(el: Element, r: Rect): Kind {
  const own = el.getAttribute('data-wf')
  if (own && (KINDS as string[]).includes(own)) return own as Kind
  if (own != null) return 'media'
  let m = 0
  if (el.matches(MEDIA)) m = area(r)
  else for (const q of Array.from(el.querySelectorAll('img,video,canvas,picture')).slice(0, 40)) m += inter(fromDOM(q.getBoundingClientRect()), r)
  if (m >= 0.45 * area(r)) return 'media'
  if (el.matches('h1,h2') || el.querySelector('h1,h2')) return 'head'
  if (parseFloat(getComputedStyle(el).fontSize) >= 40) return 'head'
  if (el.matches('li,tr,[role="row"]') || el.querySelectorAll('li,tr,[role="row"]').length >= 3) return 'index'
  return 'text'
}

// The chrome: header, mobile tab bar and the footer (when it is on screen).
// They stay where they are; only the veil and the reveal touch them.
function chromeBands(W: number, H: number): Box[] {
  const out: Box[] = []
  for (const sel of ['[data-site-header]', '[data-site-tabbar]', '[data-site-footer]']) {
    const el = document.querySelector(sel)
    if (!el) continue
    const r = el.getBoundingClientRect()
    const y0 = Math.max(0, r.top), y1 = Math.min(H, r.bottom)
    if (r.width < 1 || y1 - y0 < 4 || getComputedStyle(el).display === 'none') continue
    out.push({ x: Math.max(0, r.left), y: y0, w: Math.min(W, r.right) - Math.max(0, r.left), h: y1 - y0, kind: 'fixed' })
  }
  return out
}

// Section-level blocks of <main>: [data-wf] (media such as the Arco and the
// feed canvas, even when aria-hidden) and anything short enough to read as one
// block; taller wrappers open up into their children. Then: snap to the column
// edges, y to 8 px, merge what shares columns and sits ≤ 24 px apart, cap.
function collectSections(W: number, H: number, cols: { x: number; w: number }[], top: number, bottom: number): Box[] {
  const main = document.querySelector('main')
  if (!main || !cols.length) return []
  const tall = H * 0.45
  const raw: Box[] = []
  const take = (el: Element, r: Rect) => {
    const wf = el.hasAttribute('data-wf')
    const q = wf || el.matches(MEDIA) ? r : hug(el, r)
    if (!q || q.w < 16 || q.h < 8) return
    raw.push({ ...q, kind: kindOf(el, q) })
  }
  const visit = (el: Element, depth: number) => {
    if (raw.length > 120 || el.matches(SKIP)) return
    const d = el.getBoundingClientRect()
    if (d.width < 1 || d.height < 1) {
      if (getComputedStyle(el).display === 'contents') for (const c of Array.from(el.children)) visit(c, depth + 1)
      return
    }
    if (d.bottom <= top || d.top >= bottom || d.right <= 0 || d.left >= W) return
    if (!visible(el)) return
    const r = fromDOM(d)
    if (el.hasAttribute('data-wf') || (el !== main && d.height <= tall) || !el.children.length || depth > 14) {
      take(el, r)
      return
    }
    for (const c of Array.from(el.children)) visit(c, depth + 1)
  }
  visit(main, 0)

  // Snap: x0 to the nearest column left edge at or before it, x1 to the nearest
  // right edge at or after it; y to 8 px; clipped between the chrome bands.
  const lefts = cols.map((c) => c.x), rights = cols.map((c) => c.x + c.w)
  const snap = (b: Box): Box | null => {
    const y0 = Math.max(top, Math.floor(b.y / 8) * 8)
    const y1 = Math.min(bottom, Math.ceil((b.y + b.h) / 8) * 8)
    if (y1 - y0 < 8) return null
    let x0 = lefts[0], x1 = rights[rights.length - 1]
    for (const l of lefts) if (l <= b.x + 1) x0 = l
    for (let i = rights.length - 1; i >= 0; i--) if (rights[i] >= b.x + b.w - 1) x1 = rights[i]
    if (x1 <= x0) x1 = rights[Math.min(rights.length - 1, lefts.indexOf(x0))]
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, kind: b.kind }
  }
  let boxes = raw.map(snap).filter((b): b is Box => !!b)

  const kindOfMerge = (a: Box, b: Box): Kind => {
    if ((a.kind === 'head' && b.kind === 'text') || (b.kind === 'head' && a.kind === 'text')) return 'head'
    return area(a) >= area(b) ? a.kind : b.kind
  }
  const merge = (a: Box, b: Box): Box => ({ ...union(a, b), kind: kindOfMerge(a, b) })
  // Merge what overlaps, or shares columns and sits ≤ 24 px apart (up to half a screen tall).
  for (let changed = true; changed;) {
    changed = false
    boxes.sort((p, q) => p.y - q.y || p.x - q.x)
    outer: for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]
        const shareCols = Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x)
        const gapY = Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)
        const u = union(a, b)
        // Text over media (a full-bleed hero, a canvas) stays its own box.
        const layered = (a.kind === 'media') !== (b.kind === 'media')
        if ((!layered && inter(a, b) > 0) || (!layered && shareCols && gapY <= 24 && u.h <= H * 0.5)) {
          boxes[i] = merge(a, b)
          boxes.splice(j, 1)
          changed = true
          break outer
        }
      }
    }
  }
  // Cap: merge the closest neighbours in reading order until it fits.
  const cap = W <= 768 ? WF.maxBoxesMobile : WF.maxBoxes
  while (boxes.length > cap) {
    boxes.sort((p, q) => p.y - q.y || p.x - q.x)
    let bi = 0, bj = 1, bestGap = Infinity
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]
        const gap = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h))
          + Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)) * 0.25
          + ((a.kind === 'media') !== (b.kind === 'media') ? 1e4 : 0)
        if (gap < bestGap) { bestGap = gap; bi = i; bj = j }
      }
    }
    const m = merge(boxes[bi], boxes[bj])
    boxes.splice(bj, 1)
    boxes[bi] = m
  }
  return boxes.sort((p, q) => p.y - q.y || p.x - q.x)
}

// Pairs by kind first, then overlap and distance; never by index alone.
function match(A: Box[], B: Box[], W: number, line: (x: number) => number): Pair[] {
  const score = (a: Box, b: Box) => iou(a, b) * 2 + 1 / (1 + Math.hypot(a.x + a.w / 2 - b.x - b.w / 2, a.y + a.h / 2 - b.y - b.h / 2) / (W / 4))
  const usedA = new Set<number>(), usedB = new Set<number>()
  const pairs: Pair[] = []
  const pass = (ok: (a: Box, b: Box) => boolean) => {
    const cand: [number, number, number][] = []
    A.forEach((a, i) => B.forEach((b, j) => { if (!usedA.has(i) && !usedB.has(j) && ok(a, b)) cand.push([score(a, b), i, j]) }))
    cand.sort((p, q) => q[0] - p[0])
    for (const [, i, j] of cand) {
      if (usedA.has(i) || usedB.has(j)) continue
      usedA.add(i); usedB.add(j)
      pairs.push({ a: A[i], b: B[j], born: false, dies: false, order: B[j].y })
    }
  }
  pass((a, b) => a.kind === b.kind)
  pass((a, b) => iou(a, b) > 0.3)
  // Leftovers fold into the nearest gutter line; new boxes grow out of one.
  A.forEach((a, i) => {
    if (usedA.has(i)) return
    pairs.push({ a, b: { x: line(a.x + a.w / 2), y: a.y, w: 0, h: a.h }, born: false, dies: true, order: a.y })
  })
  B.forEach((b, j) => {
    if (usedB.has(j)) return
    pairs.push({ a: { x: line(b.x + b.w / 2), y: b.y, w: 0, h: b.h }, b, born: true, dies: false, order: b.y })
  })
  return pairs.sort((p, q) => p.order - q.order)
}

// QA hook: set window.__wfDebug = [] and each phase pushes what it drew.
type Dbg = { ev: string; t: number; A?: Box[]; B?: Box[]; bands?: Box[]; lines?: number[]; cols?: { x: number; w: number }[] }
const debug = (d: Dbg) => { const w = window as unknown as { __wfDebug?: Dbg[] }; if (Array.isArray(w.__wfDebug)) w.__wfDebug.push(d) }

const wireframeGrid: Factory = (canvas) => {
  const g = canvas.getContext('2d')
  let raf = 0
  let W = 0, H = 0, dpr = 1
  let cols: { x: number; w: number }[] = []
  let lines: number[] = []
  let origin = 0
  let font = 'monospace'
  let P0: Palette | null = null, P1: Palette | null = null
  let bands: Box[] = []
  let A: Box[] = []
  let pairs: Pair[] = []
  let back = false, pop = false, still = false
  let hud = ''
  let t0 = 0, t1 = -1, tCovered = -1
  let stagger = 0
  let onCovered: (() => void) | null = null
  let onRevealed: (() => void) | null = null
  let covered: Promise<void> = Promise.resolve()

  const layout = () => {
    const r = canvas.getBoundingClientRect()
    W = r.width || document.documentElement.clientWidth
    H = r.height || window.innerHeight
    dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    const p = gridProbe()
    cols = p.cols
    font = p.font || 'monospace'
    // 25 lines for 24 columns (5 for 4): outer edges + the centre of each gutter.
    lines = []
    if (cols.length) {
      lines.push(cols[0].x)
      for (let i = 1; i < cols.length; i++) lines.push((cols[i - 1].x + cols[i - 1].w + cols[i].x) / 2)
      lines.push(cols[cols.length - 1].x + cols[cols.length - 1].w - 1)
    }
  }

  const nearestLine = (x: number) => {
    let best = 0
    for (let i = 1; i < lines.length; i++) if (Math.abs(lines[i] - x) < Math.abs(lines[best] - x)) best = i
    return best
  }
  const lineX = (x: number) => (lines.length ? lines[nearestLine(x)] : x)

  // Content sits between the header band and the bottom chrome (tab bar).
  const contentSpan = () => {
    let top = 0, bottom = H
    for (const b of bands) {
      if (b.y <= 1) top = Math.max(top, b.y + b.h)
      else if (b.y + b.h >= H - 1 && b.h < H * 0.2) bottom = Math.min(bottom, b.y)
    }
    return { top, bottom }
  }

  const box = (r: Rect, color: string) => {
    if (!g || r.h < 1) return
    g.fillStyle = color
    g.strokeStyle = color
    if (r.w < 2) { g.fillRect(Math.round(r.x * dpr) / dpr, r.y, 1, r.h); return }
    g.lineWidth = 1
    g.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) - 1, Math.round(r.h) - 1)
  }

  const draw = (now: number) => {
    if (!g || !P0) return
    const tc = now - t0
    const tr = t1 >= 0 ? now - t1 : -1
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.globalAlpha = 1
    g.clearRect(0, 0, W, H)
    // Colours: the old page's, re-tinted to the new page's as the reveal starts.
    const P = tr >= 0 && P1 ? (() => {
      const p = EASE_OUT(prog(tr, 0, WF.tint))
      return { bg: mix(P0.bg, P1.bg, p), ink: mix(P0.ink, P1.ink, p), dim: mix(P0.dim, P1.dim, p), line: mix(P0.line, P1.line, p) }
    })() : P0
    const out = tr < 0 ? 0 : EASE_OUT(prog(tr, still ? 0 : WF.outAt, still ? WF.still : WF.out))

    // Veil over the whole screen (chrome included).
    const veilIn = pop ? 1 : EASE_OUT(prog(tc, still ? 0 : WF.veilAt, still ? WF.still : WF.veil))
    const veil = veilIn * (1 - out)
    if (veil > 0) {
      g.fillStyle = css(P.bg, veil)
      g.fillRect(0, 0, W, H)
    }
    if (still) return

    // Grid lines: drop from the clicked column outwards, leave upwards.
    const n = lines.length
    const spread = Math.max(origin, n - 1 - origin)
    for (let i = 0; i < n; i++) {
      const d = Math.abs(i - origin)
      const pd = pop ? 1 : EASE(prog(tc, d * WF.dropStagger, WF.drop))
      if (pd <= 0) continue
      const k = back ? spread - d : d
      const pu = tr < 0 ? 0 : EASE_IO(prog(tr, WF.outAt + k * 1.5, WF.linesOut))
      const h = H * pd * (1 - pu)
      if (h <= 0) continue
      g.fillStyle = css(P.line)
      g.fillRect(Math.round(lines[i] * dpr) / dpr, 0, 1, h)
    }

    // Chrome bands: fixed anchors.
    const bandIn = pop ? 1 : EASE_OUT(prog(tc, 0, WF.bands))
    for (const b of bands) box(b, css(P.ink, 0.5 * bandIn * (1 - out)))

    // Section boxes.
    const boxIn = pop ? 1 : EASE_OUT(prog(tc, WF.boxesAt, WF.boxes))
    const ink = css(P.ink, 0.55 * boxIn * (1 - out))
    if (tr < 0) {
      for (const b of A) box(b, ink)
    } else {
      const m = pairs.length
      for (let j = 0; j < m; j++) {
        const x = pairs[j]
        const at = (back ? m - 1 - j : j) * stagger
        const p = EASE(prog(tr, at, WF.move))
        box({ x: lerp(x.a.x, x.b.x, p), y: lerp(x.a.y, x.b.y, p), w: lerp(x.a.w, x.b.w, p), h: lerp(x.a.h, x.b.h, p) }, ink)
      }
    }

    // HUD: one mono line, typed once, only when the route is slow.
    if (hud && tCovered >= 0) {
      const since = (tr >= 0 ? t1 : now) - tCovered - WF.hudAfter
      if (since > 0) {
        const typed = hud.slice(0, Math.min(hud.length, Math.ceil((tr >= 0 ? Infinity : since) / WF.hudChar)))
        // On the footer band (top-left, inside it); else just above the bottom edge.
        const foot = bands.filter((b) => b.y > H * 0.5).sort((p, q) => p.y - q.y)[0]
        const y = foot ? Math.min(H - 10, foot.y + 20) : H - 16
        g.font = `10px ${font}`
        g.fillStyle = css(P.dim, 1 - out)
        g.fillText(typed, Math.round(cols[0]?.x ?? 16), Math.round(y))
      }
    }
  }

  const stop = () => {
    cancelAnimationFrame(raf)
    raf = 0
  }

  const settle = () => {
    stop()
    g?.setTransform(1, 0, 0, 1, 0, 0)
    g?.clearRect(0, 0, canvas.width, canvas.height)
    show(canvas, false)
    if (t1 >= 0) debug({ ev: 'end', t: performance.now() - t1 })
    t1 = -1
    tCovered = -1
    A = []
    bands = []
    pairs = []
    onCovered?.()
    onCovered = null
    const done = onRevealed
    onRevealed = null
    done?.()
  }

  const coverEnd = () => (pop ? 0 : still ? WF.still : WF.coverEnd)
  const revealEnd = () => (still ? WF.still : WF.outAt + Math.max(WF.out, WF.linesOut + lines.length * 1.5))

  const loop = (now: number) => {
    raf = 0
    draw(now)
    if (onCovered && now - t0 >= coverEnd()) {
      debug({ ev: 'covered', t: now - t0 })
      tCovered = now
      onCovered()
      onCovered = null
    }
    if (t1 >= 0 && now - t1 >= revealEnd()) {
      settle()
      return
    }
    raf = requestAnimationFrame(loop)
  }

  const start = (o: CoverOptions | undefined, isPop: boolean) => {
    stop()
    back = !!o?.back
    pop = isPop
    still = !!o?.still
    hud = o?.hud ?? ''
    layout()
    P0 = palette()
    P1 = null
    bands = still ? [] : chromeBands(W, H)
    const { top, bottom } = contentSpan()
    A = still ? [] : collectSections(W, H, cols, top, bottom)
    origin = o?.originX != null ? nearestLine(o.originX) : back ? lines.length - 1 : 0
    pairs = []
    t1 = -1
    tCovered = -1
    t0 = performance.now()
    covered = new Promise<void>((r) => { onCovered = r })
    debug({ ev: 'start', t: t0, A, bands, lines, cols })
    show(canvas, true)
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
      // The new page (and its theme) is in place under the cover.
      P1 = palette()
      if (!still) {
        const { top, bottom } = contentSpan()
        const B = collectSections(W, H, cols, top, bottom)
        pairs = match(A, B, W, lineX)
        debug({ ev: 'reveal', t: performance.now() - t0, B })
        const m = pairs.length
        stagger = m > 1 ? WF.staggerCap / (m - 1) : 0
      }
      return new Promise<void>((r) => {
        onRevealed = r
        t1 = performance.now()
        if (!raf) raf = requestAnimationFrame(loop)
      })
    },
    cancel: settle,
  }
}

// ─── 'wireframe-build' · La retícula construye la página (Propuesta B) ────────
// Same plan as «Plano total» (same grid, boxes, bands, HUD and colours), but
// nothing is switched on or off: the grid sweeps the old page away and the new
// page is built inside its boxes. Layers, bottom → top: real page → --c-bg
// curtain (per column) → windows cut into it → grid lines → boxes → HUD.
// Cover (ms from the click, ≈ 420–480):
//   0–300   each of the 25 lines falls (ease-out, a brighter head that dims as
//           it lands), staggered from the clicked column outwards (≤ 130 ms).
//  50–350   behind every line its column of curtain comes down: the old page
//           is wiped top → bottom, column by column, never faded as a whole.
//           Chrome bands and section boxes draw themselves as the curtain
//           passes over them.
//   ≈ 480   covered → route change (theme, nav chip, scroll under the cover);
//           the HUD types the destination if the route takes > 120 ms.
// Reveal (ms from the new page being ready, ≈ 640):
//   0–400   boxes travel to the new page's blocks (FLIP by kind, ≤ 60 ms
//           stagger); leftovers fold into a gutter line, new ones grow out.
//  60–320   the header / tab bar / footer bands open (wipe, top → bottom).
// 180–640   each box opens top → bottom onto the real content, in reading
//           order (≤ 160 ms stagger), a 1 px line on the wipe's edge; its
//           outline fades as it fills.
// 260–640   the lines fall on out of the bottom (same order as they came);
// 320–560   what is left of the curtain (the gaps between boxes) dissolves.
// Back/forward: covered at once, the reveal runs mirrored (last box first,
// lines leave upwards). Reduced motion: the same 120 ms veil as «Plano total».
const WB = {
  drop: 300, spread: 130, maxStep: 8, lag: 50, head: 72, headOut: 200,
  hudAfter: 120, hudChar: 16, tint: 200,
  move: 400, moveStagger: 60,
  bandsAt: 60, bands: 260,
  openAt: 180, open: 300, openStagger: 160,
  linesOutAt: 260, linesOut: 280, linesOutSpread: 100,
  restAt: 320, rest: 240,
  still: 120,
}

const wireframeBuild: Factory = (canvas) => {
  const g = canvas.getContext('2d')
  let raf = 0
  let W = 0, H = 0, dpr = 1
  let cols: { x: number; w: number }[] = []
  let lines: number[] = []
  let origin = 0, spread = 0, step = 0
  let font = 'monospace'
  let P0: Palette | null = null, P1: Palette | null = null
  let bands: Box[] = []
  let A: Box[] = []
  let pairs: Pair[] = []
  let back = false, pop = false, still = false
  let hud = ''
  let t0 = 0, t1 = -1, tCovered = -1
  let onCovered: (() => void) | null = null
  let onRevealed: (() => void) | null = null
  let covered: Promise<void> = Promise.resolve()

  const px = (v: number) => Math.round(v * dpr) / dpr // device-pixel edges: no seams

  const layout = () => {
    const r = canvas.getBoundingClientRect()
    W = r.width || document.documentElement.clientWidth
    H = r.height || window.innerHeight
    dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    const p = gridProbe()
    cols = p.cols
    font = p.font || 'monospace'
    lines = []
    if (cols.length) {
      lines.push(cols[0].x)
      for (let i = 1; i < cols.length; i++) lines.push((cols[i - 1].x + cols[i - 1].w + cols[i].x) / 2)
      lines.push(cols[cols.length - 1].x + cols[cols.length - 1].w - 1)
    }
  }

  const nearestLine = (x: number) => {
    let best = 0
    for (let i = 1; i < lines.length; i++) if (Math.abs(lines[i] - x) < Math.abs(lines[best] - x)) best = i
    return best
  }
  const lineX = (x: number) => (lines.length ? lines[nearestLine(x)] : x)

  const contentSpan = () => {
    let top = 0, bottom = H
    for (const b of bands) {
      if (b.y <= 1) top = Math.max(top, b.y + b.h)
      else if (b.y + b.h >= H - 1 && b.h < H * 0.2) bottom = Math.min(bottom, b.y)
    }
    return { top, bottom }
  }

  // Progress of line i falling, and of the curtain that follows it.
  const lineP = (i: number, tc: number) => (pop ? 1 : EASE_DROP(prog(tc, Math.abs(i - origin) * step, WB.drop)))
  const curtP = (i: number, tc: number) => (pop ? 1 : EASE_DROP(prog(tc, Math.abs(i - origin) * step + WB.lag, WB.drop)))
  // How much of a rect the curtain has passed (0 → 1), read at its centre.
  const sweptAt = (r: Rect, tc: number) => {
    if (pop) return 1
    const y = H * curtP(nearestLine(r.x + r.w / 2), tc)
    return Math.max(0, Math.min(1, (y - r.y) / Math.max(1, Math.min(r.h, 160))))
  }

  const outline = (r: Rect, color: string) => {
    if (!g || r.h < 1) return
    g.fillStyle = color
    g.strokeStyle = color
    if (r.w < 2) { g.fillRect(px(r.x), r.y, 1, r.h); return }
    g.lineWidth = 1
    g.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) - 1, Math.round(r.h) - 1)
  }
  // A window in the curtain: the real page shows through, wiped top → bottom.
  const open = (r: Rect, p: number, edge: string) => {
    if (!g || p <= 0 || r.w < 2) return
    const x0 = px(r.x), x1 = px(r.x + r.w), y0 = px(r.y), y1 = px(r.y + r.h * p)
    if (y1 <= y0) return
    g.clearRect(x0, y0, x1 - x0, y1 - y0)
    if (p < 1) { g.fillStyle = edge; g.fillRect(x0, y1 - 1 / dpr, x1 - x0, 1) }
  }

  // Reveal: box j on its way from the old block to the new one (reading order,
  // mirrored on back), and the stagger between one box opening and the next.
  const os = () => (pairs.length > 1 ? WB.openStagger / (pairs.length - 1) : 0)
  const moved = (j: number, tr: number) => {
    const m = pairs.length
    return EASE_ENTER(prog(tr, (back ? m - 1 - j : j) * (m > 1 ? WB.moveStagger / (m - 1) : 0), WB.move))
  }
  const travel = (j: number, tr: number): Rect => {
    const x = pairs[j], p = moved(j, tr)
    return { x: lerp(x.a.x, x.b.x, p), y: lerp(x.a.y, x.b.y, p), w: lerp(x.a.w, x.b.w, p), h: lerp(x.a.h, x.b.h, p) }
  }

  const draw = (now: number) => {
    if (!g || !P0) return
    const tc = now - t0
    const tr = t1 >= 0 ? now - t1 : -1
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.globalAlpha = 1
    g.clearRect(0, 0, W, H)
    const P = tr >= 0 && P1 ? (() => {
      const p = EASE_SOFT(prog(tr, 0, WB.tint))
      return { bg: mix(P0.bg, P1.bg, p), ink: mix(P0.ink, P1.ink, p), dim: mix(P0.dim, P1.dim, p), line: mix(P0.line, P1.line, p) }
    })() : P0

    if (still) {
      const a = (pop ? 1 : EASE_OUT(prog(tc, 0, WB.still))) * (tr < 0 ? 1 : 1 - EASE_OUT(prog(tr, 0, WB.still)))
      if (a > 0) { g.fillStyle = css(P.bg, a); g.fillRect(0, 0, W, H) }
      return
    }

    const n = lines.length
    const rest = tr < 0 ? 0 : EASE_SOFT(prog(tr, WB.restAt, WB.rest))
    const m = pairs.length

    // Curtain. Cover: one strip per grid column, each following its line down.
    // Reveal: the whole plane, with windows cut where the page comes through.
    if (tr < 0) {
      g.fillStyle = css(P.bg)
      for (let k = 0; k <= n; k++) {
        // Strip k sits between line k-1 and line k; it follows the earlier one.
        const p = Math.max(k > 0 ? curtP(k - 1, tc) : 0, k < n ? curtP(k, tc) : 0)
        if (p <= 0) continue
        const x0 = k === 0 ? 0 : px(lines[k - 1]), x1 = k === n ? W : px(lines[k])
        g.fillRect(x0, 0, x1 - x0, px(H * p))
      }
    } else {
      if (rest < 1) { g.fillStyle = css(P.bg, 1 - rest); g.fillRect(0, 0, W, H) }
      const edge = css(P.line, 1 - rest)
      const pb = EASE_SOFT(prog(tr, WB.bandsAt, WB.bands))
      for (const b of bands) open(b, pb, edge)
      for (let j = 0; j < m; j++) {
        if (pairs[j].dies) continue
        const o = back ? m - 1 - j : j
        open(travel(j, tr), EASE_SOFT(prog(tr, WB.openAt + o * os(), WB.open)), edge)
      }
    }

    // Grid lines: fall in from the clicked column outwards, fall on out.
    const outStep = spread ? WB.linesOutSpread / spread : 0
    const bright = mix(P.line, P.ink, 0.7)
    for (let i = 0; i < n; i++) {
      const d = Math.abs(i - origin)
      const pd = lineP(i, tc)
      if (pd <= 0) continue
      const pu = tr < 0 ? 0 : EASE_SOFT(prog(tr, WB.linesOutAt + d * outStep, WB.linesOut))
      if (pu >= 1) continue
      const x = px(lines[i])
      // Forward: the top end follows the line down and out. Back: it retracts upwards.
      const y0 = back ? 0 : H * pu, y1 = back ? H * pd * (1 - pu) : H * pd
      if (y1 <= y0) continue
      g.fillStyle = css(P.line)
      g.fillRect(x, y0, 1, y1 - y0)
      const head = pop ? 0 : 1 - EASE_OUT(prog(tc, d * step + WB.drop * 0.8, WB.headOut))
      if (head > 0 && tr < 0) {
        const h0 = Math.max(y0, y1 - WB.head)
        const grd = g.createLinearGradient(0, h0, 0, y1)
        grd.addColorStop(0, css(bright, 0))
        grd.addColorStop(1, css(bright, head))
        g.fillStyle = grd
        g.fillRect(x, h0, 1, y1 - h0)
      }
    }

    // Chrome bands: fixed anchors, drawn as the curtain passes, gone as they open.
    const bandOut = tr < 0 ? 0 : EASE_SOFT(prog(tr, WB.bandsAt, WB.bands))
    for (const b of bands) outline(b, css(P.ink, 0.5 * sweptAt(b, tc) * (1 - bandOut)))

    // Section boxes.
    if (tr < 0) {
      for (const b of A) outline(b, css(P.ink, 0.55 * sweptAt(b, tc)))
    } else {
      for (let j = 0; j < m; j++) {
        const x = pairs[j]
        const o = back ? m - 1 - j : j
        const filled = prog(tr, WB.openAt + o * os() + WB.open * 0.4, WB.open * 0.6)
        const a = 0.55 * (x.born ? Math.min(1, moved(j, tr) * 2) : 1) * (1 - EASE_OUT(filled))
        if (a > 0.003) outline(travel(j, tr), css(P.ink, a))
      }
    }

    // HUD: one mono line, typed once, only when the route is slow.
    if (hud && tCovered >= 0) {
      const since = (tr >= 0 ? t1 : now) - tCovered - WB.hudAfter
      if (since > 0) {
        const typed = hud.slice(0, Math.min(hud.length, Math.ceil((tr >= 0 ? Infinity : since) / WB.hudChar)))
        const foot = bands.filter((b) => b.y > H * 0.5).sort((p, q) => p.y - q.y)[0]
        const y = foot ? Math.min(H - 10, foot.y + 20) : H - 16
        g.font = `10px ${font}`
        g.fillStyle = css(P.dim, tr < 0 ? 1 : 1 - EASE_OUT(prog(tr, 0, WB.bands)))
        g.fillText(typed, Math.round(cols[0]?.x ?? 16), Math.round(y))
      }
    }
  }

  const stop = () => {
    cancelAnimationFrame(raf)
    raf = 0
  }

  const settle = () => {
    stop()
    g?.setTransform(1, 0, 0, 1, 0, 0)
    g?.clearRect(0, 0, canvas.width, canvas.height)
    show(canvas, false)
    if (t1 >= 0) debug({ ev: 'end', t: performance.now() - t1 })
    t1 = -1
    tCovered = -1
    A = []
    bands = []
    pairs = []
    onCovered?.()
    onCovered = null
    const done = onRevealed
    onRevealed = null
    done?.()
  }

  const coverEnd = () => (pop ? 0 : still ? WB.still : spread * step + WB.lag + WB.drop)
  const revealEnd = () => (still ? WB.still : Math.max(WB.openAt + WB.openStagger + WB.open, WB.linesOutAt + WB.linesOutSpread + WB.linesOut, WB.restAt + WB.rest))

  const loop = (now: number) => {
    raf = 0
    draw(now)
    if (onCovered && now - t0 >= coverEnd()) {
      debug({ ev: 'covered', t: now - t0 })
      tCovered = now
      onCovered()
      onCovered = null
    }
    if (t1 >= 0 && now - t1 >= revealEnd()) {
      settle()
      return
    }
    raf = requestAnimationFrame(loop)
  }

  const start = (o: CoverOptions | undefined, isPop: boolean) => {
    stop()
    back = !!o?.back
    pop = isPop
    still = !!o?.still
    hud = o?.hud ?? ''
    layout()
    P0 = palette()
    P1 = null
    bands = still ? [] : chromeBands(W, H)
    const { top, bottom } = contentSpan()
    A = still ? [] : collectSections(W, H, cols, top, bottom)
    origin = o?.originX != null ? nearestLine(o.originX) : back ? lines.length - 1 : 0
    spread = Math.max(origin, lines.length - 1 - origin)
    step = spread ? Math.min(WB.maxStep, WB.spread / spread) : 0
    pairs = []
    t1 = -1
    tCovered = -1
    t0 = performance.now()
    covered = new Promise<void>((r) => { onCovered = r })
    debug({ ev: 'start', t: t0, A, bands, lines, cols })
    show(canvas, true)
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
      P1 = palette()
      if (!still) {
        // The chrome may have changed under the cover (footer in or out of view).
        bands = chromeBands(W, H)
        const { top, bottom } = contentSpan()
        const B = collectSections(W, H, cols, top, bottom)
        pairs = match(A, B, W, lineX)
        debug({ ev: 'reveal', t: performance.now() - t0, B })
      }
      return new Promise<void>((r) => {
        onRevealed = r
        t1 = performance.now()
        if (!raf) raf = requestAnimationFrame(loop)
      })
    },
    cancel: settle,
  }
}

export const EFFECTS: Record<SiteTransitionId, Factory> = { 'wireframe-grid': wireframeGrid, 'wireframe-build': wireframeBuild, pixels, instant }
