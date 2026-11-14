// ─── LED panel (Contact) ──────────────────────────────────────────────────────
// A 44 × 44 dot matrix on one 2D canvas, no deps. Every frame the content is
// drawn small on an offscreen canvas (4 px per dot), averaged per dot and shown
// as round LEDs whose size follows the brightness (thin strokes = small dots).
// Two inks: pearl (red channel of the source) and the brand blue (blue channel).
// Content: the Biako face of the nav (blue bar over the eyes at rest; awake =
// the bar leaves and the eyes follow the pointer, blink and talk), a short
// word (static if it fits, marquee if not), an envelope and a check. Changes
// of content use the site's Bayer-ordered dissolve.
import { BIAKO_W, BIAKO_H, BIAKO_EYES, BIAKO_BAR, BIAKO_STROKES } from './biako'

const N = 44            // dots per side
const SS = 4            // source px per dot
const S = N * SS
const PEARL = '#ffffe6' // the face's own colour in the nav
const BLUE = '#2f5dff'  // brand blue, lifted a touch to read as light on black
const MOUTH = 8         // index in BIAKO_STROKES (hidden while talking)
const DISSOLVE = 260    // ms
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

type Kind = 'face' | 'text' | 'mail' | 'ok'
type Show = { kind: Kind; text?: string; t0: number; until: number; width?: number; font?: string }

export type Led = ReturnType<typeof createLed>

export function createLed(canvas: HTMLCanvasElement, reduced: boolean) {
  const ctx = canvas.getContext('2d')!
  const src = document.createElement('canvas')
  src.width = src.height = S
  const sx = src.getContext('2d', { willReadFrequently: true })!
  const glow = document.createElement('canvas')
  glow.width = glow.height = N
  const gx = glow.getContext('2d')!
  const glowPx = gx.createImageData(N, N)
  let base: HTMLCanvasElement | null = null

  const strokes = BIAKO_STROKES.map((p) => ({ path: new Path2D(p.d), w: p.w }))
  const lum = new Float32Array(N * N)
  const hue = new Uint8Array(N * N) // 0 pearl · 1 blue
  const prevLum = new Float32Array(N * N)
  const prevHue = new Uint8Array(N * N)

  let W = 0, dpr = 1
  let lookX = 0, lookY = 0, lx = 0, ly = 0
  let awake = false, open = 0
  let talking = false
  let nextBlink = 2000, blinkT = -1
  let show: Show = { kind: 'face', t0: 0, until: Infinity }
  let held: Kind | null = null
  let swapT = -1e9
  let family = 'monospace'
  const SPEED = 46 * SS // marquee, source px per second

  function resize() {
    const r = canvas.getBoundingClientRect()
    dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.max(44, Math.round(r.width * dpr))
    family = getComputedStyle(canvas).fontFamily || 'monospace'
    if (w === W && base) return
    W = w
    canvas.width = canvas.height = W
    // Unlit dots, drawn once.
    base = document.createElement('canvas')
    base.width = base.height = W
    const b = base.getContext('2d')!
    const cell = W / N
    b.fillStyle = 'rgba(255,255,230,0.085)'
    b.beginPath()
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const cx = (x + 0.5) * cell, cy = (y + 0.5) * cell
      b.moveTo(cx + cell * 0.13, cy)
      b.arc(cx, cy, cell * 0.13, 0, 6.2832)
    }
    b.fill()
    paint(performance.now()) // setting the size cleared the canvas
  }

  // ── content, drawn on the source canvas in "dot × SS" pixels ───────────────
  function drawFace(now: number) {
    const u = (S * 0.86) / BIAKO_H
    const ox = (S - BIAKO_W * u) / 2 + lx * 1.1 * SS * open
    const oy = (S - BIAKO_H * u) / 2 + ly * 0.7 * SS * open
    sx.setTransform(u, 0, 0, u, ox, oy)
    sx.lineCap = 'round'; sx.lineJoin = 'round'
    sx.strokeStyle = '#f00'; sx.fillStyle = '#f00'
    const mouthOpen = talking ? 0.35 + 0.65 * Math.abs(Math.sin(now / 62) * Math.sin(now / 173)) : 0
    strokes.forEach((p, i) => {
      if (i === MOUTH && mouthOpen > 0) return
      sx.lineWidth = p.w * 1.05
      sx.stroke(p.path)
    })
    if (mouthOpen > 0) {
      sx.beginPath()
      sx.ellipse(12.5, 24.5, 1.9, 0.35 + mouthOpen * 0.9, 0, 0, 6.2832)
      sx.fill()
    }
    if (open > 0.03) {
      const blink = blinkT >= 0 ? Math.abs(1 - (now - blinkT) / 70) : 1 // 140 ms
      const r = 0.55 + 0.55 * open
      for (const [ex, ey] of BIAKO_EYES) {
        sx.beginPath()
        sx.ellipse(ex + lx * 0.95 * open, ey + ly * 0.6 * open, r, Math.max(0.12, r * Math.min(1, blink)), 0, 0, 6.2832)
        sx.fill()
      }
    }
    if (open < 0.97) {
      // The bar leaves upwards and thins out.
      const h = BIAKO_BAR.h * (1 - open * 0.7)
      sx.globalAlpha = 1 - open
      sx.fillStyle = '#00f'
      sx.fillRect(-1, BIAKO_BAR.y - open * 9, BIAKO_W + 2, h)
      sx.globalAlpha = 1
    }
  }

  function drawText(now: number, s: Show) {
    sx.setTransform(1, 0, 0, 1, 0, 0)
    sx.font = s.font!
    sx.textBaseline = 'middle'
    sx.fillStyle = '#f00'
    const w = s.width!
    const fits = w <= S - 6 * SS
    const x = fits ? (S - w) / 2 : S - ((now - s.t0) / 1000) * SPEED
    sx.fillText(s.text!, Math.round(x / SS) * SS, S / 2 + SS)
    // Blue rules above and below, like a ticker.
    sx.fillStyle = '#00f'
    sx.fillRect(4 * SS, 9 * SS, S - 8 * SS, SS)
    sx.fillRect(4 * SS, S - 10 * SS, S - 8 * SS, SS)
  }

  function drawMail(now: number) {
    const bob = reduced ? 0 : Math.round(Math.sin(now / 320) * 1.2) * SS
    sx.setTransform(SS, 0, 0, SS, 0, bob)
    sx.lineWidth = 1.7; sx.lineJoin = 'round'; sx.lineCap = 'round'
    sx.strokeStyle = '#f00'
    sx.strokeRect(8, 13, 28, 19)
    sx.beginPath(); sx.moveTo(8.5, 13.5); sx.lineTo(22, 24); sx.lineTo(35.5, 13.5); sx.stroke()
    sx.fillStyle = '#00f'
    sx.fillRect(31, 9, 6, 6)
  }

  function drawOk() {
    sx.setTransform(SS, 0, 0, SS, 0, 0)
    sx.lineWidth = 3.4; sx.lineJoin = 'round'; sx.lineCap = 'round'
    sx.strokeStyle = '#f00'
    sx.beginPath(); sx.moveTo(10, 23); sx.lineTo(18.5, 31); sx.lineTo(34, 13); sx.stroke()
  }

  function sample(now: number) {
    sx.setTransform(1, 0, 0, 1, 0, 0)
    sx.clearRect(0, 0, S, S)
    // Timed content (a word, the check) wins over the held icon.
    const k = show.kind !== 'face' ? show.kind : held ?? 'face'
    if (k === 'text') drawText(now, show)
    else if (k === 'mail') drawMail(now)
    else if (k === 'ok') drawOk()
    else drawFace(now)
    const d = sx.getImageData(0, 0, S, S).data
    const area = SS * SS * 255
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let r = 0, b = 0
      for (let j = 0; j < SS; j++) {
        let o = ((y * SS + j) * S + x * SS) * 4
        for (let i = 0; i < SS; i++, o += 4) { const a = d[o + 3] / 255; r += d[o] * a; b += d[o + 2] * a }
      }
      const pearl = r / area, blue = Math.max(0, b - r) / area
      const i = y * N + x
      if (blue > pearl) {
        hue[i] = 1
        lum[i] = Math.min(1, blue * 1.25) * (reduced ? 0.92 : 0.84 + 0.16 * Math.sin(x * 0.55 - now / 210))
      } else {
        hue[i] = 0
        lum[i] = Math.min(1, pearl * 2.1)
      }
    }
  }

  function paint(now: number) {
    if (!base) return
    const p = (now - swapT) / DISSOLVE
    if (p < 1) {
      const th = p * 16
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (BAYER[(y & 3) * 4 + (x & 3)] >= th) { const i = y * N + x; lum[i] = prevLum[i]; hue[i] = prevHue[i] }
      }
    }
    const cell = W / N
    ctx.clearRect(0, 0, W, W)
    ctx.drawImage(base, 0, 0)
    // Soft bloom: the 44 px buffer scaled up smooth.
    const g = glowPx.data
    for (let i = 0; i < N * N; i++) {
      const o = i * 4, l = lum[i]
      if (hue[i]) { g[o] = 47; g[o + 1] = 93; g[o + 2] = 255 } else { g[o] = 255; g[o + 1] = 255; g[o + 2] = 230 }
      g[o + 3] = l * 120
    }
    gx.putImageData(glowPx, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.globalAlpha = 0.55
    ctx.drawImage(glow, 0, 0, W, W)
    ctx.globalAlpha = 1
    for (let h = 0; h < 2; h++) {
      ctx.fillStyle = h ? BLUE : PEARL
      ctx.beginPath()
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = y * N + x
        if (hue[i] !== h || lum[i] < 0.07) continue
        const r = cell * (0.14 + 0.3 * lum[i])
        const cx = (x + 0.5) * cell, cy = (y + 0.5) * cell
        ctx.moveTo(cx + r, cy)
        ctx.arc(cx, cy, r, 0, 6.2832)
      }
      ctx.fill()
    }
  }

  function swap(now: number) {
    prevLum.set(lum); prevHue.set(hue)
    swapT = reduced ? -1e9 : now
  }

  function frame(now: number) {
    if (!W) resize()
    // Timed content ends → back to the face.
    if (show.kind !== 'face') {
      const scrolled = show.kind === 'text' && show.width !== undefined && show.width > S - 6 * SS
        && S - ((now - show.t0) / 1000) * SPEED < -show.width
      if (now > show.until || scrolled) { swap(now); show = { kind: 'face', t0: now, until: Infinity } }
    }
    lx += (lookX - lx) * 0.22; ly += (lookY - ly) * 0.22
    open += ((awake ? 1 : 0) - open) * (reduced ? 1 : 0.16)
    if (!reduced) {
      if (blinkT < 0 && now > nextBlink) blinkT = now
      if (blinkT >= 0 && now - blinkT > 140) { blinkT = -1; nextBlink = now + 1800 + Math.random() * 3800 }
    }
    sample(now)
    paint(now)
  }

  resize()

  return {
    frame,
    resize,
    /** Where the eyes look, each axis −1…1. */
    look(x: number, y: number) { lookX = Math.max(-1, Math.min(1, x)); lookY = Math.max(-1, Math.min(1, y)) },
    /** Awake = the bar leaves and the eyes show. */
    wake(on: boolean) { awake = on },
    talk(on: boolean) { talking = on && !reduced },
    /** Flash a short word (marquee when it doesn't fit), then back to the face. */
    say(text: string, now = performance.now()) {
      swap(now)
      // Up to 3 characters big, up to 5 medium (both still); longer = marquee.
      const size = text.length <= 3 ? 19 : text.length <= 5 ? 12 : 15
      const f = `700 ${size * SS}px ${family}`
      sx.setTransform(1, 0, 0, 1, 0, 0); sx.font = f
      const width = sx.measureText(text).width
      show = { kind: 'text', text, t0: now, until: now + (width <= S - 6 * SS ? 1100 : 7000), width, font: f }
    },
    /** A timed icon. */
    flash(kind: 'ok' | 'mail', ms = 1300, now = performance.now()) {
      swap(now)
      show = { kind, t0: now, until: now + ms }
    },
    /** An icon that stays until released (hover). */
    hold(kind: 'mail' | null, now = performance.now()) {
      if (held === kind) return
      swap(now)
      held = kind
    },
  }
}
