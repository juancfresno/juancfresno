import type { Deck, TrailItem } from './deck'

// ─── Trail variants ───────────────────────────────────────────────────────────
// Every variant is a Behaviour driven by CursorTrail: pointer input (move /
// tap / leave) plus one rAF `frame()` that returns true while anything is
// still moving (the loop sleeps otherwise). Pieces are a fixed pool of nodes
// created up front (≤ 8, so ~7 on screen); only transform and opacity change.
// 1 Classic and 4 Grid animate with the Web Animations API (compositor), the
// rest integrate springs per frame.

export type TrailId = 1 | 2 | 3 | 4 | 5
export const TRAIL_IDS: TrailId[] = [1, 2, 3, 4, 5]
export const TRAIL_NAMES: Record<TrailId, string> = {
  1: 'Classic',
  2: 'Delay',
  3: 'Stack',
  4: 'Grid',
  5: 'Tail',
}

export type Env = {
  root: HTMLElement
  deck: Deck
  cls: { piece: string; grid: string; strip: string; tint: string }
}

export interface Behaviour {
  move(x: number, y: number, now: number): void
  tap(x: number, y: number, now: number): void
  leave(): void
  frame(now: number, dt: number): boolean
  destroy(): void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
type S = { v: number; w: number } // value + velocity
const sp = (v: number): S => ({ v, w: 0 })
// Damped spring step (unit mass, semi-implicit Euler).
function step(s: S, target: number, k: number, c: number, dt: number) {
  s.w += (-k * (s.v - target) - c * s.w) * dt
  s.v += s.w * dt
}
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
// Frame-rate independent lerp factor: `rate` ≈ how many "halvings" per second.
const follow = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)

// Figma "Rastro de imágenes": 4:3 shots, the newest 240 × 180 at 1680.
function size43(touch: boolean) {
  const vw = window.innerWidth
  const w = touch ? clamp(vw * 0.44, 150, 220) : clamp(vw * 0.143, 150, 260)
  return { w, h: w * 0.75 }
}
const spacing = () => clamp(window.innerWidth * 0.06, 64, 110)

function makeImg(env: Env) {
  const img = document.createElement('img')
  img.className = env.cls.piece
  img.alt = ''
  img.decoding = 'async'
  img.draggable = false
  env.root.appendChild(img)
  return img
}

// A spring-driven piece (variants 2, 3, 5).
type Piece = {
  el: HTMLImageElement
  on: boolean
  x: number; y: number; w: number; h: number
  s: S; r: S; o: S
  ts: number; tr: number; to: number
  born: number
  dying: boolean
  ox: number; oy: number // Stack: offset from the cursor
}

function makePieces(env: Env, n: number): Piece[] {
  return Array.from({ length: n }, () => ({
    el: makeImg(env), on: false, x: 0, y: 0, w: 0, h: 0,
    s: sp(1), r: sp(0), o: sp(0), ts: 1, tr: 0, to: 0, born: 0, dying: false, ox: 0, oy: 0,
  }))
}

let zTop = 1
function place(p: Piece, it: TrailItem, x: number, y: number, touch: boolean, now: number) {
  const { w, h } = size43(touch)
  p.on = true
  p.dying = false
  p.born = now
  p.x = x; p.y = y; p.w = w; p.h = h
  p.el.src = it.src
  p.el.style.width = `${Math.round(w)}px`
  p.el.style.height = `${Math.round(h)}px`
  p.el.style.zIndex = String(zTop++)
}

function render(p: Piece) {
  const t = `translate3d(${(p.x - p.w / 2).toFixed(1)}px, ${(p.y - p.h / 2).toFixed(1)}px, 0)`
  const r = Math.abs(p.r.v) > 0.01 ? ` rotate(${p.r.v.toFixed(2)}deg)` : ''
  p.el.style.transform = `${t}${r} scale(${p.s.v.toFixed(4)})`
  p.el.style.opacity = clamp(p.o.v, 0, 1).toFixed(3)
}

function hide(p: Piece) {
  p.on = false
  p.el.style.opacity = '0'
}

// The oldest free node, else the oldest live one (recycled).
function nextPiece(pool: Piece[]) {
  let best: Piece | null = null
  for (const p of pool) {
    if (!p.on) return p
    if (!best || p.born < best.born) best = p
  }
  return best!
}

// ─── 1 · Classic (the first WIP trail) ────────────────────────────────────────
// One piece per stretch of travel, at the cursor, own aspect ratio; scales
// in, holds, scales out (1.1 s, WAAPI).
function classic(env: Env): Behaviour {
  const POOL = 7
  const LIFE = 1100
  const EASE_IN = 'cubic-bezier(0.19, 1, 0.22, 1)'
  const EASE_OUT = 'cubic-bezier(0.55, 0, 0.75, 0.2)'
  const nodes = Array.from({ length: POOL }, () => ({ img: makeImg(env), anim: null as Animation | null }))
  let slot = 0
  let lx = 0, ly = 0, has = false, dist = 0

  const spawn = (x: number, y: number, touch: boolean) => {
    const it = env.deck.take()
    if (!it) return
    const vw = window.innerWidth
    const base = touch ? Math.min(200, Math.max(140, vw * 0.38)) : Math.min(220, Math.max(130, vw * 0.12))
    let w = it.r >= 1 ? base * 1.15 : base
    let h = w / it.r
    if (h > base * 1.6) { h = base * 1.6; w = h * it.r }
    const n = nodes[slot]
    slot = (slot + 1) % POOL
    n.anim?.cancel()
    n.img.src = it.src
    n.img.style.width = `${Math.round(w)}px`
    n.img.style.height = `${Math.round(h)}px`
    n.img.style.zIndex = String(zTop++)
    n.img.style.borderRadius = '0'
    const t = `translate3d(${Math.round(x - w / 2)}px, ${Math.round(y - h / 2)}px, 0)`
    n.anim = n.img.animate(
      [
        { opacity: 0, transform: `${t} scale(0.72)`, easing: EASE_IN },
        { opacity: 1, transform: `${t} scale(1)`, offset: 0.18 },
        { opacity: 1, transform: `${t} scale(1)`, offset: 0.58, easing: EASE_OUT },
        { opacity: 0, transform: `${t} scale(0.86)` },
      ],
      { duration: LIFE, fill: 'forwards' },
    )
  }

  return {
    move(x, y) {
      if (!has) { lx = x; ly = y; has = true; return }
      dist += Math.hypot(x - lx, y - ly)
      lx = x; ly = y
      if (dist >= Math.min(140, Math.max(80, window.innerWidth * 0.07))) { dist = 0; spawn(x, y, false) }
    },
    tap(x, y) { spawn(x, y, true) },
    leave() { has = false; dist = 0 },
    frame: () => false,
    destroy() { nodes.forEach((n) => { n.anim?.cancel(); n.img.remove() }) },
  }
}

// ─── 2 · Delay ────────────────────────────────────────────────────────────────
// The idea behind raulortiz.design (Framer "Cursor Image Trail": a piece every
// ~100 px, spring in from half size, ~1 s visible, spring out), rebuilt with
// the delay Juan liked made explicit: pieces drop along a ghost point that
// lerps after the cursor, so the trail keeps gliding in after the hand stops;
// each piece springs up from 0.5 and tilts against its travel, then settles.
function delay(env: Env): Behaviour {
  const pool = makePieces(env, 8)
  const LIFE = 950
  let cx = 0, cy = 0, gx = 0, gy = 0, has = false, acc = 0

  const spawn = (x: number, y: number, vx: number, touch: boolean, now: number) => {
    const it = env.deck.take()
    if (!it) return
    const p = nextPiece(pool)
    place(p, it, x, y, touch, now)
    p.s = sp(0.5); p.ts = 1
    p.r = sp(clamp(-vx * 0.0035, -7, 7)); p.tr = 0
    p.o = sp(0); p.to = 1
    render(p)
  }

  return {
    move(x, y) {
      cx = x; cy = y
      if (!has) { gx = x; gy = y; has = true }
    },
    tap(x, y, now) { spawn(x, y, 0, true, now) },
    leave() { has = false; acc = 0 },
    frame(now, dt) {
      let busy = false
      if (has) {
        const f = follow(7, dt)
        const nx = gx + (cx - gx) * f
        const ny = gy + (cy - gy) * f
        const d = Math.hypot(nx - gx, ny - gy)
        const vx = (nx - gx) / Math.max(dt, 0.001)
        gx = nx; gy = ny
        acc += d
        if (acc >= spacing()) { acc = 0; spawn(gx, gy, vx, false, now) }
        if (Math.hypot(cx - gx, cy - gy) > 0.5) busy = true
      }
      for (const p of pool) {
        if (!p.on) continue
        busy = true
        if (!p.dying && now - p.born > LIFE) { p.dying = true; p.ts = 0.5; p.to = 0 }
        step(p.s, p.ts, 300, 30, dt)
        step(p.r, p.tr, 300, 30, dt)
        step(p.o, p.to, 420, 42, dt)
        render(p)
        if (p.dying && p.o.v < 0.01) hide(p)
      }
      return busy
    },
    destroy() { pool.forEach((p) => p.el.remove()) },
  }
}

// ─── 3 · Stack ────────────────────────────────────────────────────────────────
// A deck that piles up under the cursor: each new card drops on top with its
// own small tilt and offset; every card follows the cursor, slower the deeper
// it sits, so the pile drags behind and fans out while moving and closes up
// when the hand stops. Depth shrinks and fades the old ones; when the cursor
// rests the deck is dealt away from the bottom, one card at a time.
function stack(env: Env): Behaviour {
  const pool = makePieces(env, 8)
  const MAX = 7
  const deck: Piece[] = [] // newest first
  let cx = 0, cy = 0, lx = 0, ly = 0, has = false, acc = 0
  let lastSpawn = 0, lastDeal = 0

  const retire = (p: Piece) => { p.dying = true; p.to = 0; p.ts = p.s.v * 0.9 }
  const spawn = (x: number, y: number, touch: boolean, now: number) => {
    const it = env.deck.take()
    if (!it) return
    const p = nextPiece(pool)
    const at = deck.indexOf(p)
    if (at >= 0) deck.splice(at, 1)
    place(p, it, x, y + 26, touch, now)
    p.ox = (Math.random() - 0.5) * 28
    p.oy = (Math.random() - 0.5) * 22
    p.tr = (Math.random() - 0.5) * 12
    p.r = sp(p.tr * 2.2)
    p.s = sp(0.88); p.ts = 1
    p.o = sp(0); p.to = 1
    deck.unshift(p)
    while (deck.length > MAX) retire(deck.pop()!)
    lastSpawn = now
    render(p)
  }

  return {
    move(x, y) {
      cx = x; cy = y
      if (!has) { lx = x; ly = y; has = true; return }
      acc += Math.hypot(x - lx, y - ly)
      lx = x; ly = y
      if (acc >= spacing() * 1.25) { acc = 0; spawn(x, y, false, performance.now()) }
    },
    tap(x, y, now) { cx = x; cy = y; spawn(x, y, true, now) },
    leave() { has = false; acc = 0 },
    frame(now, dt) {
      let busy = false
      // Resting: deal the pile away from the bottom.
      if (deck.length && now - lastSpawn > 1000 && now - lastDeal > 110) {
        retire(deck.pop()!)
        lastDeal = now
      }
      deck.forEach((p, depth) => {
        p.ts = 1 - depth * 0.035
        p.to = depth < 4 ? 1 : [0.7, 0.42, 0.18][depth - 4] ?? 0
        const f = follow(14 * Math.pow(0.68, depth), dt)
        p.x += (cx + p.ox - p.x) * f
        p.y += (cy + p.oy - p.y) * f
      })
      for (const p of pool) {
        if (!p.on) continue
        busy = true
        step(p.s, p.ts, 260, 26, dt)
        step(p.r, p.tr, 220, 24, dt)
        step(p.o, p.to, 380, 40, dt)
        render(p)
        if (p.dying && p.o.v < 0.01) hide(p)
      }
      return busy || deck.length > 0
    },
    destroy() { pool.forEach((p) => p.el.remove()) },
  }
}

// ─── 4 · Grid ─────────────────────────────────────────────────────────────────
// Fresno identity: pieces snap to the real 12-column grid (container margin
// clamp(24px, 4vw, 64px), 16 px gutters; 4 columns ≤ 768), each two columns
// wide, and appear through a 12-column wipe: the image is cut in 12 strips
// that drop in from the top, staggered outwards from the strip under the
// cursor, each lit by a G-orange tint that fades as it lands (the social
// clips' entry). They leave by retracting the strips from the edges inwards.
function grid(env: Env): Behaviour {
  const POOL = 7
  const STRIPS = 12
  const LIFE = 1150
  type G = { el: HTMLDivElement; strips: HTMLDivElement[]; tints: HTMLDivElement[]; anims: Animation[]; timer: number }
  const pieces: G[] = Array.from({ length: POOL }, () => {
    const el = document.createElement('div')
    el.className = env.cls.grid
    const strips: HTMLDivElement[] = []
    const tints: HTMLDivElement[] = []
    for (let i = 0; i < STRIPS; i++) {
      const st = document.createElement('div')
      st.className = env.cls.strip
      const tn = document.createElement('div')
      tn.className = env.cls.tint
      st.appendChild(tn)
      el.appendChild(st)
      strips.push(st)
      tints.push(tn)
    }
    env.root.appendChild(el)
    return { el, strips, tints, anims: [], timer: 0 }
  })
  let slot = 0
  let lastCell = '', lx = 0, ly = 0, has = false, acc = 0

  const layout = () => {
    const vw = window.innerWidth
    const margin = clamp(vw * 0.04, 24, 64)
    const cols = vw <= 768 ? 4 : 12
    const gap = 16
    const col = (vw - margin * 2 - gap * (cols - 1)) / cols
    return { margin, cols, gap, col }
  }

  const spawn = (x: number, y: number, touch: boolean) => {
    const g0 = layout()
    const c = clamp(Math.floor((x - g0.margin) / (g0.col + g0.gap)), 0, g0.cols - 1)
    const start = Math.min(c, g0.cols - 2)
    const w = g0.col * 2 + g0.gap
    const h = w * 0.75
    const left = g0.margin + start * (g0.col + g0.gap)
    const top = Math.round((y - h / 2) / 8) * 8
    const cell = `${start}:${Math.round(top / (h / 2))}`
    if (!touch && cell === lastCell) return
    const it = env.deck.take()
    if (!it) return
    lastCell = cell

    const g = pieces[slot]
    slot = (slot + 1) % POOL
    g.anims.forEach((a) => a.cancel())
    g.anims = []
    window.clearTimeout(g.timer)
    g.el.style.width = `${w}px`
    g.el.style.height = `${h}px`
    g.el.style.transform = `translate3d(${left.toFixed(1)}px, ${top}px, 0)`
    g.el.style.zIndex = String(zTop++)
    g.el.style.opacity = '1'
    const sw = w / STRIPS
    const under = clamp(Math.floor((x - left) / sw), 0, STRIPS - 1)
    g.strips.forEach((st, i) => {
      st.style.left = `${(i * sw).toFixed(2)}px`
      st.style.width = `${(sw + 0.6).toFixed(2)}px`
      st.style.backgroundImage = `url("${it.src}")`
      st.style.backgroundSize = `${w}px ${h}px`
      st.style.backgroundPosition = `${(-i * sw).toFixed(2)}px 0`
      const delayIn = Math.abs(i - under) * 16
      g.anims.push(
        st.animate(
          [{ transform: 'scaleY(0)', transformOrigin: '50% 0' }, { transform: 'scaleY(1)', transformOrigin: '50% 0' }],
          { duration: 230, delay: delayIn, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' },
        ),
        g.tints[i].animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, delay: delayIn + 60, easing: 'ease-out', fill: 'both' }),
      )
    })
    g.timer = window.setTimeout(() => {
      g.strips.forEach((st, i) => {
        const fromEdge = Math.min(i, STRIPS - 1 - i)
        g.anims.push(
          st.animate(
            [{ transform: 'scaleY(1)', transformOrigin: '50% 100%' }, { transform: 'scaleY(0)', transformOrigin: '50% 100%' }],
            { duration: 150, delay: fromEdge * 10, easing: 'cubic-bezier(0.55, 0, 0.75, 0.2)', fill: 'forwards' },
          ),
        )
      })
    }, LIFE)
  }

  return {
    move(x, y) {
      if (!has) { lx = x; ly = y; has = true; return }
      acc += Math.hypot(x - lx, y - ly)
      lx = x; ly = y
      if (acc >= spacing() * 0.8) { acc = 0; spawn(x, y, false) }
    },
    tap(x, y) { spawn(x, y, true) },
    leave() { has = false; acc = 0; lastCell = '' },
    frame: () => false,
    destroy() {
      pieces.forEach((g) => { window.clearTimeout(g.timer); g.anims.forEach((a) => a.cancel()); g.el.remove() })
    },
  }
}

// ─── 5 · Tail (Figma "Rastro de imágenes") ────────────────────────────────────
// Juan's drawing brought to life: a tail of 7 where every piece steps down by
// age, 240 → 150 px and 100 → 25 % opacity (the exact Figma ramp), newest on
// top. Pieces drop along a ghost point that lerps after the cursor (the
// Delay), and every time a new one lands the whole tail springs one step
// smaller and fainter. When the hand rests, the tail eats itself from the end.
function tail(env: Env): Behaviour {
  const pool = makePieces(env, 8)
  const OPACITY = [1, 0.88, 0.75, 0.63, 0.5, 0.38, 0.25]
  const SCALE = OPACITY.map((_, i) => 1 - i * 0.0625) // 240 → 150
  const list: Piece[] = [] // newest first
  let cx = 0, cy = 0, gx = 0, gy = 0, has = false, acc = 0
  let lastSpawn = 0, lastEat = 0

  const retire = (p: Piece) => { p.dying = true; p.to = 0; p.ts = Math.max(0.5, p.ts - 0.08) }
  const spawn = (x: number, y: number, touch: boolean, now: number) => {
    const it = env.deck.take()
    if (!it) return
    const p = nextPiece(pool)
    const at = list.indexOf(p)
    if (at >= 0) list.splice(at, 1)
    place(p, it, x, y, touch, now)
    p.s = sp(0.72)
    p.r = sp(0); p.tr = 0
    p.o = sp(0)
    list.unshift(p)
    while (list.length > OPACITY.length) retire(list.pop()!)
    lastSpawn = now
    render(p)
  }

  return {
    move(x, y) {
      cx = x; cy = y
      if (!has) { gx = x; gy = y; has = true }
    },
    tap(x, y, now) { spawn(x, y, true, now) },
    leave() { has = false; acc = 0 },
    frame(now, dt) {
      let busy = false
      if (has) {
        const f = follow(10, dt)
        const nx = gx + (cx - gx) * f
        const ny = gy + (cy - gy) * f
        acc += Math.hypot(nx - gx, ny - gy)
        gx = nx; gy = ny
        if (acc >= spacing() * 0.7) { acc = 0; spawn(gx, gy, false, now) }
        if (Math.hypot(cx - gx, cy - gy) > 0.5) busy = true
      }
      if (list.length && now - lastSpawn > 650 && now - lastEat > 85) {
        retire(list.pop()!)
        lastEat = now
      }
      list.forEach((p, rank) => { p.ts = SCALE[rank]; p.to = OPACITY[rank] })
      for (const p of pool) {
        if (!p.on) continue
        busy = true
        step(p.s, p.ts, 240, 27, dt)
        step(p.o, p.to, 300, 34, dt)
        render(p)
        if (p.dying && p.o.v < 0.01) hide(p)
      }
      return busy || list.length > 0
    },
    destroy() { pool.forEach((p) => p.el.remove()) },
  }
}

export const BEHAVIOURS: Record<TrailId, (env: Env) => Behaviour> = {
  1: classic,
  2: delay,
  3: stack,
  4: grid,
  5: tail,
}
