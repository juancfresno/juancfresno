// ─── LED wall (footer) ────────────────────────────────────────────────────────
// The Contact stand-in (components/contact/led.ts), grown into a wall: the whole
// footer is one dot matrix on a 2D canvas, no deps. Pitch ≈ 1/132 of the width
// (8–15 css px), so the number of dots follows the viewport.
// Layers, per dot: a slow stand-by scan, the pointer's torch (lights the dots
// around it and fades), marching chevrons while an answer is hovered (→ go to
// Contact, ↑ back to top) and the Biako face, drawn inside the `slot` element's
// box. The face arrives with the site's Bayer dissolve as the footer is
// revealed (`power` 0…1), sleeps under its blue bar and wakes with the pointer.
import { BIAKO_W, BIAKO_H, BIAKO_EYES, BIAKO_BAR, BIAKO_STROKES } from '@/components/contact/biako'

const SS = 3            // source px per dot (face sampling)
const MOUTH = 8         // index in BIAKO_STROKES (hidden while talking)
const PEARL = '#ffffe6'
const BLUE = '#2f5dff'
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const PERIOD = 14       // chevron spacing, dots

export type WallMode = 'idle' | 'go' | 'up'
export type Wall = ReturnType<typeof createWall>

export function createWall(canvas: HTMLCanvasElement, slot: HTMLElement, reduced: boolean) {
  const ctx = canvas.getContext('2d')!
  const src = document.createElement('canvas')
  const sx = src.getContext('2d', { willReadFrequently: true })!
  const glow = document.createElement('canvas')
  const gx = glow.getContext('2d')!
  let glowPx: ImageData | null = null
  let base: HTMLCanvasElement | null = null
  const strokes = BIAKO_STROKES.map((p) => ({ path: new Path2D(p.d), w: p.w }))

  let W = 0, H = 0, cols = 0, rows = 0, cell = 0, pitch = 12
  let fx = 0, fy = 0, fw = 0, fh = 0 // the face box, in dots
  let lum = new Float32Array(0), heat = new Float32Array(0), faceL = new Float32Array(0)
  let hue = new Uint8Array(0), faceH = new Uint8Array(0)

  let power = reduced ? 1 : 0, powerTo = power
  let lookX = 0, lookY = 0, lx = 0, ly = 0
  let awake = false, shade = false, open = 0, talking = false
  let nextBlink = 2400, blinkT = -1
  let px = -99, py = -99, pointerOn = false
  let mode: WallMode = 'idle', go = 0, up = 0
  let t0 = performance.now()

  function resize() {
    const r = canvas.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    pitch = Math.max(8, Math.min(15, r.width / 132))
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr)
    const sr = slot.getBoundingClientRect()
    const scale = Math.min(sr.width / BIAKO_W, sr.height / BIAKO_H)
    const nfh = Math.max(14, Math.round((BIAKO_H * scale) / pitch))
    const nfw = Math.round((nfh * BIAKO_W) / BIAKO_H) + 4
    const nfx = Math.round((sr.left - r.left + sr.width / 2) / pitch - nfw / 2)
    const nfy = Math.round((sr.top - r.top + sr.height / 2) / pitch - nfh / 2)
    if (w === W && h === H && nfh === fh && nfx === fx && nfy === fy && base) return
    W = w; H = h; cell = pitch * dpr
    cols = Math.ceil(r.width / pitch); rows = Math.ceil(r.height / pitch)
    fw = nfw; fh = nfh; fx = nfx; fy = nfy
    canvas.width = W; canvas.height = H
    lum = new Float32Array(cols * rows); hue = new Uint8Array(cols * rows); heat = new Float32Array(cols * rows)
    faceL = new Float32Array(fw * fh); faceH = new Uint8Array(fw * fh)
    src.width = fw * SS; src.height = fh * SS
    glow.width = cols; glow.height = rows
    glowPx = gx.createImageData(cols, rows)
    // Unlit dots, drawn once.
    base = document.createElement('canvas')
    base.width = W; base.height = H
    const b = base.getContext('2d')!
    b.fillStyle = 'rgba(255,255,230,0.07)'
    b.beginPath()
    const r0 = cell * 0.12
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const cx = (x + 0.5) * cell, cy = (y + 0.5) * cell
      b.moveTo(cx + r0, cy)
      b.arc(cx, cy, r0, 0, 6.2832)
    }
    b.fill()
    frame(performance.now())
  }

  // The face, drawn small (red = pearl ink, blue = the bar) and averaged per dot.
  function sampleFace(now: number) {
    const sw = fw * SS, sh = fh * SS
    sx.setTransform(1, 0, 0, 1, 0, 0)
    sx.clearRect(0, 0, sw, sh)
    const u = (sh * 0.94) / BIAKO_H
    sx.setTransform(u, 0, 0, u, (sw - BIAKO_W * u) / 2 + lx * 1.3 * SS * open, (sh - BIAKO_H * u) / 2 + ly * 0.8 * SS * open)
    sx.lineCap = 'round'; sx.lineJoin = 'round'
    sx.strokeStyle = '#f00'; sx.fillStyle = '#f00'
    const mouth = talking ? 0.35 + 0.65 * Math.abs(Math.sin(now / 62) * Math.sin(now / 173)) : 0
    strokes.forEach((p, i) => {
      if (i === MOUTH && mouth > 0) return
      sx.lineWidth = p.w * 1.05
      sx.stroke(p.path)
    })
    if (mouth > 0) {
      sx.beginPath()
      sx.ellipse(12.5, 24.5, 1.9, 0.35 + mouth * 0.9, 0, 0, 6.2832)
      sx.fill()
    }
    if (open > 0.03) {
      const blink = blinkT >= 0 ? Math.abs(1 - (now - blinkT) / 70) : 1
      const r = 0.55 + 0.55 * open
      for (const [ex, ey] of BIAKO_EYES) {
        sx.beginPath()
        sx.ellipse(ex + lx * 0.95 * open, ey + ly * 0.6 * open, r, Math.max(0.12, r * Math.min(1, blink)), 0, 0, 6.2832)
        sx.fill()
      }
    }
    if (open < 0.97) {
      sx.globalAlpha = 1 - open
      sx.fillStyle = '#00f'
      sx.fillRect(0.6, BIAKO_BAR.y - open * 9, BIAKO_W - 1.2, BIAKO_BAR.h * (1 - open * 0.7))
      sx.globalAlpha = 1
    }
    const d = sx.getImageData(0, 0, sw, sh).data
    const area = SS * SS * 255
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      let r = 0, b = 0
      for (let j = 0; j < SS; j++) {
        let o = ((y * SS + j) * sw + x * SS) * 4
        for (let i = 0; i < SS; i++, o += 4) { const a = d[o + 3] / 255; r += d[o] * a; b += d[o + 2] * a }
      }
      const pearl = r / area, blue = Math.max(0, b - r) / area
      const i = y * fw + x
      if (blue > pearl) {
        faceH[i] = 1
        faceL[i] = Math.min(1, blue * 1.25) * (reduced ? 0.92 : 0.84 + 0.16 * Math.sin(x * 0.55 - now / 210))
      } else {
        faceH[i] = 0
        faceL[i] = Math.min(1, pearl * 2.3)
      }
    }
  }

  function compose(now: number) {
    const t = (now - t0) / 1000
    // Pointer torch: lights the dots around it, the trail fades.
    for (let i = 0; i < heat.length; i++) heat[i] *= 0.88
    if (pointerOn && !reduced) {
      const R = 5
      for (let y = Math.max(0, Math.floor(py - R)); y <= Math.min(rows - 1, Math.ceil(py + R)); y++) {
        for (let x = Math.max(0, Math.floor(px - R)); x <= Math.min(cols - 1, Math.ceil(px + R)); x++) {
          const dx = x + 0.5 - px, dy = y + 0.5 - py
          const v = 0.62 * Math.exp(-(dx * dx + dy * dy) / 7)
          const i = y * cols + x
          if (v > heat[i]) heat[i] = v
        }
      }
    }
    const scan = reduced ? -99 : ((t * 22) % (cols + rows * 0.6 + 60)) - 20
    const shift = t * 18
    const th = power * 17
    for (let y = 0; y < rows; y++) {
      const yy = Math.abs((y % PERIOD) - PERIOD / 2)
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x
        let l = heat[i], h = 0
        const sd = Math.abs(x + y * 0.6 - scan)
        if (sd < 4) l = Math.max(l, 0.085 * (1 - sd / 4) * power)
        if (go > 0.02) {
          let k = (x + yy - shift) % PERIOD; if (k < 0) k += PERIOD
          if (k < 1 && go * 0.36 > l) { l = go * 0.36; h = 1 }
        }
        if (up > 0.02) {
          const xx = Math.abs((x % PERIOD) - PERIOD / 2)
          let k = (y + xx + shift) % PERIOD; if (k < 0) k += PERIOD
          if (k < 1 && up * 0.36 > l) { l = up * 0.36; h = 1 }
        }
        const ux = x - fx, uy = y - fy
        if (ux >= 0 && ux < fw && uy >= 0 && uy < fh && BAYER[(y & 3) * 4 + (x & 3)] < th) {
          const f = uy * fw + ux
          if (faceL[f] > 0.07) { l = faceL[f]; h = faceH[f] }
          else if (h === 1) l *= 0.25 // chevrons stay quiet behind the face
        }
        lum[i] = l; hue[i] = h
      }
    }
  }

  function paint() {
    if (!base || !glowPx) return
    ctx.clearRect(0, 0, W, H)
    ctx.drawImage(base, 0, 0)
    const g = glowPx.data
    for (let i = 0; i < lum.length; i++) {
      const o = i * 4
      if (hue[i]) { g[o] = 47; g[o + 1] = 93; g[o + 2] = 255 } else { g[o] = 255; g[o + 1] = 255; g[o + 2] = 230 }
      g[o + 3] = lum[i] * 120
    }
    gx.putImageData(glowPx, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.globalAlpha = 0.5
    ctx.drawImage(glow, 0, 0, cols * cell, rows * cell)
    ctx.globalAlpha = 1
    for (let h = 0; h < 2; h++) {
      ctx.fillStyle = h ? BLUE : PEARL
      ctx.beginPath()
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = y * cols + x
        if (hue[i] !== h || lum[i] < 0.06) continue
        const r = cell * (0.13 + 0.3 * lum[i])
        const cx = (x + 0.5) * cell, cy = (y + 0.5) * cell
        ctx.moveTo(cx + r, cy)
        ctx.arc(cx, cy, r, 0, 6.2832)
      }
      ctx.fill()
    }
  }

  function frame(now: number) {
    if (!base) return
    power += (powerTo - power) * (reduced ? 1 : 0.18)
    go += ((mode === 'go' ? 1 : 0) - go) * (reduced ? 1 : 0.14)
    up += ((mode === 'up' ? 1 : 0) - up) * (reduced ? 1 : 0.14)
    lx += (lookX - lx) * 0.22; ly += (lookY - ly) * 0.22
    open += ((awake && !shade ? 1 : 0) - open) * (reduced ? 1 : 0.16)
    if (!reduced) {
      if (blinkT < 0 && now > nextBlink) blinkT = now
      if (blinkT >= 0 && now - blinkT > 140) { blinkT = -1; nextBlink = now + 1800 + Math.random() * 3800 }
    }
    sampleFace(now)
    compose(now)
    paint()
  }

  resize()

  return {
    frame,
    resize,
    /** 0…1: how much of the face is lit (Bayer dissolve, tied to the reveal). */
    power(p: number) { powerTo = reduced ? 1 : Math.max(0, Math.min(1, p)) },
    /** Where the eyes look, each axis −1…1. */
    look(x: number, y: number) { lookX = Math.max(-1, Math.min(1, x)); lookY = Math.max(-1, Math.min(1, y)) },
    /** Awake = the bar leaves and the eyes show. */
    wake(on: boolean) { awake = on },
    /** The bar drops back over the eyes (the "not yet" answer). */
    shade(on: boolean) { shade = on },
    talk(on: boolean) { talking = on && !reduced },
    mode(m: WallMode) { mode = m },
    /** Pointer in css px relative to the canvas; null = gone. */
    pointer(p: { x: number; y: number } | null) {
      pointerOn = !!p
      if (p) { px = p.x / pitch; py = p.y / pitch }
    },
  }
}
