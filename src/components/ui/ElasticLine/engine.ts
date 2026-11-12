// ElasticLine engine — one shared ticker for every divider on the page.
//
// Each line is a string with fixed ends, discretised into N+1 points
// (N = 24–48 segments by width). Physics run at a fixed 120 Hz step with a
// discrete 1D wave equation (tension between neighbours + a faint anchor
// to the rest line + damping), so a pluck travels along the line, reflects
// at the fixed ends and dies out over several oscillations.
//
// Interaction (the idea comes from the image borders on pchico.es, whose
// control points chase the cursor inside a radius and wobble home when it
// leaves):
//   · lean   — within R_ZONE of the line the nearest stretch leans softly
//              toward the cursor;
//   · grab   — once the cursor comes within R_GRAB the line latches on and
//              follows it (capped), until the cursor gets past R_ZONE or
//              leaves the line's span: the stored stretch is released as a
//              twang, so the further you pull the bigger the rebound;
//   · pluck  — crossing the line injects the cursor's vertical speed into
//              the points under it (a fast pass plucks it like a string);
//   · press  — mousedown within R_PRESS grabs it hard (cap PRESS_MAX);
//              release = big twang. A real drag swallows the click after it.
//   · touch  — passive touch listeners: a finger (or the page scrolling
//              under it) grabs/plucks the line the same way; scrolling is
//              never blocked.
// Only lines on screen (IntersectionObserver) are tested against the pointer,
// only lines in motion are simulated, and the loop sleeps when all are still.

const STEP_MS = 1000 / 120

// Physics, per 120 Hz step.
const TENSION = 0.38    // neighbour coupling (wave speed² in points/step²); < 1 for stability
const ANCHOR = 0.0016   // pull of every point back to the rest line
const DAMPING = 0.991   // velocity kept per step (~0.34 per second)
const MAX_Y = 170       // hard safety clamp, px
const TAIL_Y = 1.2      // below this amplitude (px) …
const TAIL_DAMPING = 0.975 // … the sub-pixel tail dies fast instead of ringing for seconds

// Interaction.
const R_GRAB = 34       // px: cursor this close latches the line
const R_ZONE = 116      // px: lean zone, and where a hovering grab lets go
const HOVER_MAX = 78    // px: cap of a hovering grab
const HOVER_FOLLOW = 0.92
const HOVER_RATE = 0.34 // fraction of the gap closed per step at the grab point
const LEAN = 0.14       // lean = distY · LEAN …
const LEAN_RATE = 0.035 // … approached slowly
const R_PRESS = 44      // px: mousedown this close grabs hard
const PRESS_MAX = 124   // px: cap of a press-drag
const PRESS_RATE = 0.4
const PLUCK_GAIN = 0.7  // pointer px/step → point velocity
const PLUCK_MAX = 18    // px/step
const DRAG_CLICK_PX = 6 // a press that moved more than this swallows its click

type Mode = 'none' | 'lean' | 'hover' | 'press'

interface Line {
  svg: SVGSVGElement
  path: SVGPathElement
  w: number
  n: number            // segments
  y: Float32Array
  v: Float32Array
  visible: boolean
  active: boolean      // in the ticker
  flat: boolean        // path currently drawn as a straight line
  mode: Mode
  cx: number           // grab centre, px from the line's left
  target: number       // grab displacement, px
}

const lines = new Set<Line>()
const byEl = new WeakMap<Element, Line>()
const active = new Set<Line>()

let reduced = false
let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null
let listening = false
let raf = 0
let lastT = 0

// Pointer (viewport coords). `has` = a pointer we should react to exists.
const ptr = { has: false, x: 0, y: 0, t: 0, touch: false }
let pressed: Line | null = null
let pressStart = { x: 0, y: 0 }
let pressMoved = false
let prevUserSelect = ''

// ─── geometry ────────────────────────────────────────────────────────────────

function segmentsFor(w: number) {
  return Math.max(24, Math.min(48, Math.round(w / 36)))
}

function resize(l: Line, w: number) {
  if (!w || w === l.w) return
  l.w = w
  const n = segmentsFor(w)
  if (n !== l.n) {
    l.n = n
    l.y = new Float32Array(n + 1)
    l.v = new Float32Array(n + 1)
  } else {
    l.y.fill(0)
    l.v.fill(0)
  }
  drawFlat(l)
}

function drawFlat(l: Line) {
  l.flat = true
  l.path.setAttribute('d', `M 0 0.5 L ${l.w} 0.5`)
}

const r2 = (v: number) => Math.round(v * 100) / 100

// Catmull-Rom through the points → cubic Béziers (uniform spacing).
function draw(l: Line) {
  const { y, n, w } = l
  const dx = w / n
  let d = `M 0 ${r2(0.5 + y[0])}`
  for (let i = 0; i < n; i++) {
    const y0 = y[i > 0 ? i - 1 : 0]
    const y1 = y[i]
    const y2 = y[i + 1]
    const y3 = y[i + 2 <= n ? i + 2 : n]
    const x1 = i * dx
    const x2 = x1 + dx
    d += ` C ${r2(x1 + dx / 3)} ${r2(0.5 + y1 + (y2 - y0) / 6)} ${r2(x2 - dx / 3)} ${r2(0.5 + y2 - (y3 - y1) / 6)} ${r2(x2)} ${r2(0.5 + y2)}`
  }
  l.flat = false
  l.path.setAttribute('d', d)
}

// ─── physics ─────────────────────────────────────────────────────────────────

function step(l: Line) {
  const { y, v, n, w } = l
  const dx = w / n

  if (l.mode !== 'none') {
    const press = l.mode === 'press'
    const sigma = press ? Math.max(90, w * 0.07) : Math.max(56, w * 0.04)
    const rate = press ? PRESS_RATE : l.mode === 'hover' ? HOVER_RATE : LEAN_RATE
    const inv = 1 / (2 * sigma * sigma)
    for (let i = 1; i < n; i++) {
      const ox = i * dx - l.cx
      const g = Math.exp(-ox * ox * inv)
      if (g < 0.01) continue
      const k = rate * g
      const dy = (l.target - y[i]) * k
      y[i] += dy
      v[i] = v[i] * (1 - k) + dy * 0.5
    }
  }

  // Symplectic Euler on the discrete wave equation, fixed ends.
  let peak = 0
  if (l.mode === 'none') for (let i = 1; i < n; i++) { const a = Math.abs(y[i]); if (a > peak) peak = a }
  const damp = l.mode === 'none' && peak < TAIL_Y ? TAIL_DAMPING : DAMPING
  for (let i = 1; i < n; i++) {
    v[i] = (v[i] + TENSION * (y[i - 1] - 2 * y[i] + y[i + 1]) - ANCHOR * y[i]) * damp
  }
  for (let i = 1; i < n; i++) {
    let yi = y[i] + v[i]
    if (yi > MAX_Y) { yi = MAX_Y; v[i] = 0 } else if (yi < -MAX_Y) { yi = -MAX_Y; v[i] = 0 }
    y[i] = yi
  }
}

function settled(l: Line) {
  if (l.mode !== 'none') return false
  const { y, v, n } = l
  for (let i = 1; i < n; i++) {
    if (Math.abs(y[i]) > 0.15 || Math.abs(v[i]) > 0.03) return false
  }
  return true
}

function wake(l: Line) {
  if (!l.active) {
    l.active = true
    active.add(l)
  }
  if (!raf) {
    lastT = 0
    raf = requestAnimationFrame(tick)
  }
}

function tick(t: number) {
  raf = 0
  const dt = lastT ? t - lastT : STEP_MS * 2
  lastT = t
  const steps = Math.max(1, Math.min(5, Math.round(dt / STEP_MS)))
  for (const l of active) {
    for (let s = 0; s < steps; s++) step(l)
    if (settled(l)) {
      l.y.fill(0)
      l.v.fill(0)
      l.active = false
      active.delete(l)
      drawFlat(l)
    } else if (l.visible) {
      draw(l)
    }
  }
  if (active.size) raf = requestAnimationFrame(tick)
}

// ─── interaction ─────────────────────────────────────────────────────────────

function release(l: Line) {
  if (l.mode === 'none') return
  l.mode = 'none'
  wake(l)
}

function pluck(l: Line, cx: number, vy: number) {
  const { v, n, w } = l
  const dx = w / n
  const sigma = Math.max(40, w * 0.025)
  const inv = 1 / (2 * sigma * sigma)
  const amp = Math.max(-PLUCK_MAX, Math.min(PLUCK_MAX, vy * PLUCK_GAIN))
  for (let i = 1; i < n; i++) {
    const ox = i * dx - cx
    v[i] += amp * Math.exp(-ox * ox * inv)
  }
  wake(l)
}

/** Re-evaluate every visible line against the pointer (moved from px,py). */
function update(px: number, py: number, dtMs: number) {
  const stepsElapsed = Math.max(1, dtMs / STEP_MS)
  for (const l of lines) {
    if (!l.visible || !l.w) continue
    if (pressed && l !== pressed) continue
    const r = l.svg.getBoundingClientRect()
    const lineY = r.top + 0.5
    const x = ptr.x - r.left
    const distY = ptr.y - lineY

    if (l === pressed) {
      l.cx = Math.max(0, Math.min(l.w, x))
      l.target = Math.max(-PRESS_MAX, Math.min(PRESS_MAX, distY))
      wake(l)
      continue
    }

    const inX = ptr.has && x >= 0 && x <= l.w

    // Crossing → pluck (the segment between the two samples crosses the line).
    if (ptr.has && l.mode !== 'hover') {
      const pd = py - lineY
      if (pd !== 0 && Math.sign(pd) !== Math.sign(distY || -pd)) {
        const f = pd / (pd - distY)
        const crossX = px - r.left + (x - (px - r.left)) * f
        if (crossX >= 0 && crossX <= l.w) {
          pluck(l, crossX, (ptr.y - py) / stepsElapsed)
        }
      }
    }

    const ad = Math.abs(distY)
    if (!inX || ad > R_ZONE) {
      if (l.mode !== 'none') release(l)
      continue
    }
    if (l.mode === 'hover' || ad < R_GRAB) {
      l.mode = 'hover'
      l.cx = x
      l.target = Math.max(-HOVER_MAX, Math.min(HOVER_MAX, distY * HOVER_FOLLOW))
    } else {
      l.mode = 'lean'
      l.cx = x
      l.target = distY * LEAN
    }
    wake(l)
  }
}

function move(x: number, y: number, touch: boolean) {
  const now = performance.now()
  const had = ptr.has
  const px = had ? ptr.x : x
  const py = had ? ptr.y : y
  const dt = had ? now - ptr.t : STEP_MS
  ptr.has = true
  ptr.x = x
  ptr.y = y
  ptr.t = now
  ptr.touch = touch
  if (pressed && !pressMoved &&
      Math.hypot(x - pressStart.x, y - pressStart.y) > DRAG_CLICK_PX) {
    pressMoved = true
    window.getSelection()?.removeAllRanges()
  }
  update(px, py, dt)
}

function leave() {
  ptr.has = false
  for (const l of lines) if (l !== pressed) release(l)
}

function endPress() {
  if (!pressed) return
  const l = pressed
  pressed = null
  document.documentElement.style.userSelect = prevUserSelect
  release(l)
  if (pressMoved) {
    // Swallow the click that ends a real drag (it may have started on a link).
    const swallow = (e: MouseEvent) => {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    window.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', swallow, true), 0)
  }
  // Re-test the others from where the cursor is now.
  if (ptr.has) update(ptr.x, ptr.y, STEP_MS)
}

const onPointerMove = (e: PointerEvent) => {
  if (e.pointerType === 'touch') return
  move(e.clientX, e.clientY, false)
}

const onPointerDown = (e: PointerEvent) => {
  if (e.pointerType === 'touch' || e.button !== 0) return
  move(e.clientX, e.clientY, false)
  let best: Line | null = null
  let bestD = R_PRESS
  for (const l of lines) {
    if (!l.visible || !l.w) continue
    const r = l.svg.getBoundingClientRect()
    const x = e.clientX - r.left
    if (x < 0 || x > l.w) continue
    const d = Math.abs(e.clientY - (r.top + 0.5))
    if (d < bestD) { bestD = d; best = l }
  }
  if (!best) return
  pressed = best
  pressMoved = false
  pressStart = { x: e.clientX, y: e.clientY }
  prevUserSelect = document.documentElement.style.userSelect
  document.documentElement.style.userSelect = 'none'
  best.mode = 'press'
  for (const l of lines) if (l !== best) release(l)
  update(e.clientX, e.clientY, STEP_MS)
}

const onPointerUp = (e: PointerEvent) => {
  if (e.pointerType === 'touch') return
  endPress()
}

const onDragStart = (e: DragEvent) => {
  if (pressed) e.preventDefault()
}

const onTouch = (e: TouchEvent) => {
  const t = e.touches[0]
  if (!t) return
  if (e.type === 'touchstart') ptr.has = false // no crossing from the last finger
  move(t.clientX, t.clientY, true)
}

const onTouchEnd = (e: TouchEvent) => {
  if (e.touches.length === 0) leave()
}

const onScroll = () => {
  // Lines move under a still cursor/finger: same test, same pluck.
  if (ptr.has) update(ptr.x, ptr.y, STEP_MS)
}

const onDocLeave = (e: MouseEvent) => {
  if (!e.relatedTarget) leave()
}

const onBlur = () => {
  endPress()
  leave()
}

function listen(on: boolean) {
  const m = on ? 'addEventListener' : 'removeEventListener'
  const passive = { passive: true } as AddEventListenerOptions
  window[m]('pointermove', onPointerMove as EventListener, passive)
  window[m]('pointerdown', onPointerDown as EventListener, passive)
  window[m]('pointerup', onPointerUp as EventListener, passive)
  window[m]('pointercancel', onPointerUp as EventListener, passive)
  window[m]('dragstart', onDragStart as EventListener)
  window[m]('touchstart', onTouch as EventListener, passive)
  window[m]('touchmove', onTouch as EventListener, passive)
  window[m]('touchend', onTouchEnd as EventListener, passive)
  window[m]('touchcancel', onTouchEnd as EventListener, passive)
  window[m]('scroll', onScroll, passive)
  window[m]('blur', onBlur)
  document[m]('mouseout', onDocLeave as EventListener, passive)
}

// ─── registry ────────────────────────────────────────────────────────────────

export function register(svg: SVGSVGElement, path: SVGPathElement): () => void {
  if (lines.size === 0) {
    reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  }
  const l: Line = {
    svg, path, w: 0, n: 0,
    y: new Float32Array(0), v: new Float32Array(0),
    visible: false, active: false, flat: true,
    mode: 'none', cx: 0, target: 0,
  }
  // Layout width, not getBoundingClientRect(): a parent may be mid-transform
  // at mount (an intro scaling the header line in from scaleX(0)) and the
  // transformed width would freeze the path short. ResizeObserver reports
  // the untransformed content box and fires again on every layout change.
  resize(l, svg.clientWidth)

  if (reduced) {
    // Static line: still follow the width, never move.
    const sro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((en) => resize(l, en[0]?.contentRect.width ?? 0))
      : null
    sro?.observe(svg)
    return () => sro?.disconnect()
  }

  lines.add(l)
  byEl.set(svg, l)

  if (!io && typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const line = byEl.get(e.target)
        if (!line) continue
        line.visible = e.isIntersecting
        if (!line.visible) {
          if (line === pressed) endPress()
          line.mode = 'none'
        } else if (line.active) {
          draw(line)
        }
      }
    }, { rootMargin: `${R_ZONE + 40}px 0px` })
  }
  if (!ro && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const line = byEl.get(e.target)
        if (line) resize(line, e.contentRect.width)
      }
    })
  }
  if (io) io.observe(svg)
  else l.visible = true
  ro?.observe(svg)

  if (!listening) {
    listening = true
    listen(true)
  }

  return () => {
    if (l === pressed) endPress()
    lines.delete(l)
    active.delete(l)
    io?.unobserve(svg)
    ro?.unobserve(svg)
    if (lines.size === 0) {
      if (listening) { listening = false; listen(false) }
      if (raf) { cancelAnimationFrame(raf); raf = 0 }
    }
  }
}
