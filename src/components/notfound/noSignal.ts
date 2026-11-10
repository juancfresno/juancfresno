// ─── "No signal" · analog TV snow with RGB tears (404) ────────────────────────
// One 2D canvas at reduced resolution (CELL css px per noise pixel), scaled up
// by CSS with image-rendering: pixelated. No WebGL needed: a 640 × 360 buffer
// is ~230k pixels, written through a Uint32 view at 30 fps.
//
// Per frame:
//   1. grey[]  = white noise (xorshift32), 18…158, times a slow "hum bar"
//                (a darker horizontal band rolling down, like a 50 Hz hum).
//   2. rows    = during a tear, some rows get a mode:
//                SPLIT · R sampled at x − dx, B at x + dx, G dim (chromatic split)
//                SHIFT · the row slides by dx and takes one channel (R, G or B)
//                LINE  · a thin, almost solid colour line across the screen
//   3. write   = grey + row mode → RGBA.
// Tears arrive at random 0.6–3 s apart and last 1–6 frames; each frame of a
// tear re-jitters its bands. onTear(dx) lets the page nudge the text.
// Reduced motion: one still frame, no tears. Hidden tab: the loop stops.

export type NoSignalHooks = {
  /** Horizontal text offset in css px while a tear is on (0 = none). */
  onTear?: (dx: number) => void
  /** Elapsed ms since start (for the timecode); called at ~25 fps. */
  onTick?: (ms: number) => void
}

const FPS = 30
const NOISE_MIN = 18 // darkest snow (0–255)
const NOISE_RANGE = 140 // → brightest 158: bright enough to read as snow, dark enough under the plate
const HUM_DEPTH = 0.22 // hum bar darkens rows by up to 22 %
const TEAR_GAP: [number, number] = [600, 3000] // ms between tears
const TEAR_FRAMES: [number, number] = [1, 6]

const MODE_NONE = 0
const MODE_SPLIT = 1
const MODE_SHIFT = 2
const MODE_LINE = 3

// Line / shift colours (R, G, B): broadcast red, phosphor green, signal blue, white.
const COLOURS: [number, number, number][] = [
  [255, 46, 84],
  [64, 255, 140],
  [52, 128, 255],
  [236, 240, 255],
]

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1))

export function startNoSignal(canvas: HTMLCanvasElement, hooks: NoSignalHooks = {}) {
  const g = canvas.getContext('2d', { alpha: false })
  if (!g) return () => {}

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let w = 0
  let h = 0
  let cell = 3
  let img: ImageData
  let px: Uint32Array
  let grey: Uint8Array
  let rowMode: Uint8Array
  let rowDx: Int16Array
  let rowCol: Uint8Array
  let seed = (Math.random() * 0xffffffff) >>> 0 || 1

  const alloc = () => {
    const vw = canvas.clientWidth || innerWidth
    const vh = canvas.clientHeight || innerHeight
    cell = vw < 600 ? 2 : 3
    w = Math.min(720, Math.ceil(vw / cell))
    h = Math.min(480, Math.ceil(vh / cell))
    canvas.width = w
    canvas.height = h
    img = g.createImageData(w, h)
    px = new Uint32Array(img.data.buffer)
    grey = new Uint8Array(w * h)
    rowMode = new Uint8Array(h)
    rowDx = new Int16Array(h)
    rowCol = new Uint8Array(h)
  }

  // ─── Tears ────────────────────────────────────────────────────────────────
  let tearLeft = 0 // frames left in the current tear
  let nextTear = 0 // timestamp of the next one

  const planTear = () => {
    rowMode.fill(MODE_NONE)
    const bands = randInt(1, 4)
    for (let i = 0; i < bands; i++) {
      const r = Math.random()
      const mode = r < 0.45 ? MODE_SPLIT : r < 0.75 ? MODE_SHIFT : MODE_LINE
      const y = randInt(0, h - 1)
      const bh = mode === MODE_LINE ? randInt(1, 2) : randInt(2, Math.max(3, Math.round(h * 0.045)))
      const dx = randInt(2, Math.max(3, Math.round(w * 0.02))) * (Math.random() < 0.5 ? -1 : 1)
      const col = randInt(0, mode === MODE_SHIFT ? 2 : 3)
      for (let j = y; j < Math.min(h, y + bh); j++) {
        rowMode[j] = mode
        rowDx[j] = dx
        rowCol[j] = col
      }
    }
    // Hair-thin companion lines in another channel, a few rows away (the "RGB" look).
    if (Math.random() < 0.6) {
      const y = randInt(0, h - 1)
      rowMode[y] = MODE_LINE
      rowCol[y] = randInt(0, 2)
      if (y + 2 < h) { rowMode[y + 2] = MODE_LINE; rowCol[y + 2] = (rowCol[y] + 1) % 3 }
    }
  }

  // ─── One frame ────────────────────────────────────────────────────────────
  const draw = (t: number) => {
    let s = seed
    // 1. grey noise × hum bar
    const humY = (((t * 0.00005) % 1.4) - 0.2) * h
    const humH = h * 0.2
    for (let y = 0; y < h; y++) {
      const d = (y - humY) / humH
      const hum = d > 0 && d < 1 ? 1 - HUM_DEPTH * Math.sin(d * Math.PI) : 1
      const k = (NOISE_RANGE / 255) * hum
      const base = NOISE_MIN * hum
      const o = y * w
      for (let x = 0; x < w; x++) {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5
        grey[o + x] = base + ((s >>> 0) & 255) * k
      }
    }
    seed = s >>> 0 || 1

    // 2–3. compose rows → RGBA (little-endian ABGR in the Uint32 view)
    for (let y = 0; y < h; y++) {
      const o = y * w
      const mode = rowMode[y]
      if (mode === MODE_NONE) {
        for (let x = 0; x < w; x++) {
          const v = grey[o + x]
          px[o + x] = 0xff000000 | (v << 16) | (v << 8) | v
        }
      } else if (mode === MODE_SPLIT) {
        const dx = rowDx[y]
        for (let x = 0; x < w; x++) {
          const xr = Math.min(w - 1, Math.max(0, x - dx))
          const xb = Math.min(w - 1, Math.max(0, x + dx))
          const r = Math.min(255, grey[o + xr] * 1.6)
          const b = Math.min(255, grey[o + xb] * 1.6)
          const gg = grey[o + x] * 0.45
          px[o + x] = 0xff000000 | (b << 16) | (gg << 8) | r
        }
      } else if (mode === MODE_SHIFT) {
        const dx = rowDx[y]
        const [cr, cg, cb] = COLOURS[rowCol[y]]
        for (let x = 0; x < w; x++) {
          const v = grey[o + ((((x - dx) % w) + w) % w)] / 255
          const r = Math.min(255, 20 + v * cr * 1.15)
          const gg = Math.min(255, 20 + v * cg * 1.15)
          const b = Math.min(255, 20 + v * cb * 1.15)
          px[o + x] = 0xff000000 | (b << 16) | (gg << 8) | r
        }
      } else {
        const [cr, cg, cb] = COLOURS[rowCol[y]]
        for (let x = 0; x < w; x++) {
          const v = grey[o + x] / 255
          const m = 0.72 + v * 0.28 // almost solid, a little noise shows through
          px[o + x] = 0xff000000 | ((cb * m) << 16) | ((cg * m) << 8) | (cr * m)
        }
      }
    }
    g.putImageData(img, 0, 0)
  }

  // ─── Loop ─────────────────────────────────────────────────────────────────
  let raf = 0
  let last = 0
  let start = 0
  let lastTick = 0

  const frame = (t: number) => {
    raf = requestAnimationFrame(frame)
    if (!start) { start = t; nextTear = t + rand(...TEAR_GAP) }
    if (t - last < 1000 / FPS - 2) return
    last = t

    if (tearLeft > 0) {
      tearLeft--
      if (tearLeft === 0) {
        rowMode.fill(MODE_NONE)
        hooks.onTear?.(0)
        nextTear = t + rand(...TEAR_GAP)
      } else {
        planTear()
        hooks.onTear?.(randInt(2, 7) * (Math.random() < 0.5 ? -1 : 1))
      }
    } else if (t >= nextTear) {
      tearLeft = randInt(...TEAR_FRAMES) + 1 // +1: the closing frame clears it
      planTear()
      hooks.onTear?.(randInt(2, 7) * (Math.random() < 0.5 ? -1 : 1))
    }

    draw(t)
    if (t - lastTick >= 40) { lastTick = t; hooks.onTick?.(t - start) }
  }

  const play = () => { if (!raf && !reduced) { last = 0; raf = requestAnimationFrame(frame) } }
  const stop = () => {
    cancelAnimationFrame(raf)
    raf = 0
    if (tearLeft) { tearLeft = 0; rowMode.fill(MODE_NONE); hooks.onTear?.(0) }
  }

  alloc()
  draw(0)
  play()

  let resizeId = 0
  const onResize = () => {
    clearTimeout(resizeId)
    resizeId = window.setTimeout(() => { alloc(); draw(performance.now()) }, 120)
  }
  const onVisibility = () => (document.hidden ? stop() : play())
  addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    stop()
    clearTimeout(resizeId)
    removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
