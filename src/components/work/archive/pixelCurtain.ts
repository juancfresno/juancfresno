// ─── Pixel curtain ────────────────────────────────────────────────────────────
// The /work drawer's one transition primitive: a canvas of square cells that
// a FRONT crosses in Bayer order (the same 4×4 matrix as the row hover fill,
// Lab transition 05 and SocialPreview). Behind the front a cell is either
// SOLID (a flat colour, or a picture / its mosaic) or CLEAR; the cells the
// front is passing over flash in the G blue.
//   enter    clear → solid(sheet colour), front travels left   (the sheet is laid in pixels)
//   leave    solid → clear, front travels right
//   ← / →    clear → solid, swap the project under it, solid → clear
//   scroll   solid(next cover, mosaic) → clear, front travels up
// Cells are snapped to device pixels; only the cells that change are painted.
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

export type Dir = 'left' | 'right' | 'up' | 'down' // where the front travels to
type RunOpts = { to: 'solid' | 'clear'; dir: Dir; ms: number; band?: number; weight?: number; ease?: (t: number) => number }

const outCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export class PixelCurtain {
  private g: CanvasRenderingContext2D | null
  private layer: HTMLCanvasElement
  private lg: CanvasRenderingContext2D | null
  private cols = 0
  private rows = 0
  private cell = 0
  private st = new Uint8Array(0) // 0 clear · 1 front · 2 solid
  private th = new Float32Array(0)
  private raf = 0
  private settle: (() => void) | null = null
  front = '#003dff'

  constructor(private canvas: HTMLCanvasElement, private cellCss = 10) {
    this.g = canvas.getContext('2d')
    this.layer = document.createElement('canvas')
    this.lg = this.layer.getContext('2d')
  }

  // Match the canvas to its box. Returns the cell size in device px.
  size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = Math.max(1, Math.round(this.canvas.clientWidth * dpr))
    const H = Math.max(1, Math.round(this.canvas.clientHeight * dpr))
    if (W !== this.canvas.width || H !== this.canvas.height) {
      this.stop()
      this.canvas.width = W
      this.canvas.height = H
      this.layer.width = W
      this.layer.height = H
      this.cell = Math.max(2, Math.round(this.cellCss * dpr))
      this.cols = Math.ceil(W / this.cell)
      this.rows = Math.ceil(H / this.cell)
      this.st = new Uint8Array(this.cols * this.rows)
      this.th = new Float32Array(this.cols * this.rows)
    }
    return this.cell
  }

  solidColor(color: string) {
    if (!this.lg) return
    this.lg.fillStyle = color
    this.lg.fillRect(0, 0, this.layer.width, this.layer.height)
  }

  // Cover-fit a picture into the solid layer; `blocks` > 0 = mosaic of that
  // many cells per block (aligned to the cell grid).
  solidImage(img: HTMLImageElement, blocks = 0) {
    const g = this.lg
    if (!g || !img.naturalWidth) return false
    const W = this.layer.width, H = this.layer.height
    const k = Math.max(W / img.naturalWidth, H / img.naturalHeight)
    const dw = img.naturalWidth * k, dh = img.naturalHeight * k
    const dx = (W - dw) / 2, dy = (H - dh) / 2
    if (!blocks) {
      g.imageSmoothingEnabled = true
      g.drawImage(img, dx, dy, dw, dh)
      return true
    }
    const b = this.cell * blocks
    const sw = Math.ceil(W / b), sh = Math.ceil(H / b)
    const small = document.createElement('canvas')
    small.width = sw
    small.height = sh
    const sg = small.getContext('2d')
    if (!sg) return false
    sg.drawImage(img, dx / b, dy / b, dw / b, dh / b)
    g.imageSmoothingEnabled = false
    g.drawImage(small, 0, 0, sw, sh, 0, 0, sw * b, sh * b)
    g.imageSmoothingEnabled = true
    return true
  }

  // Everything solid / everything clear, at once.
  fill() {
    this.stop()
    this.st.fill(2)
    this.g?.drawImage(this.layer, 0, 0)
  }
  clear() {
    this.stop()
    this.st.fill(0)
    this.g?.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private paint(i: number, s: number) {
    const g = this.g
    if (!g) return
    const c = this.cell
    const x = (i % this.cols) * c, y = Math.floor(i / this.cols) * c
    if (s === 0) g.clearRect(x, y, c, c)
    else if (s === 1) { g.fillStyle = this.front; g.fillRect(x, y, c, c) }
    else g.drawImage(this.layer, x, y, c, c, x, y, c, c)
  }

  run({ to, dir, ms, band = 0.09, weight = 0.72, ease = outCubic }: RunOpts): Promise<void> {
    this.stop()
    const T = to === 'solid' ? 2 : 0
    const { cols, rows, th, st } = this
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const u = cols > 1 ? x / (cols - 1) : 0
        const v = rows > 1 ? y / (rows - 1) : 0
        const a = dir === 'left' ? 1 - u : dir === 'right' ? u : dir === 'up' ? 1 - v : v
        th[y * cols + x] = weight * a + (1 - weight) * ((BAYER[y % 4][x % 4] + 0.5) / 16)
      }
    }
    return new Promise<void>((resolve) => {
      const t0 = performance.now()
      // Safety net: a page that isn't painting (background tab) gets no
      // frames, so the run ends on a timer and nothing waits on it forever.
      const timer = window.setTimeout(() => { if (this.settle === finish) { cancelAnimationFrame(this.raf); tick(t0 + ms) } }, ms + 250)
      const finish = () => { window.clearTimeout(timer); resolve() }
      this.settle = finish
      const tick = (now: number) => {
        const x = Math.min(1, (now - t0) / ms)
        const q = ease(x) * (1 + band)
        for (let i = 0; i < st.length; i++) {
          if (st[i] === T) continue
          const s = q >= th[i] + band ? T : q >= th[i] ? 1 : st[i]
          if (s !== st[i]) { st[i] = s; this.paint(i, s) }
        }
        if (x < 1) { this.raf = requestAnimationFrame(tick); return }
        this.settle = null
        if (T === 0) this.clear()
        else this.fill()
        finish()
      }
      this.raf = requestAnimationFrame(tick)
    })
  }

  // Stop a run in flight; its promise resolves (callers check their own token).
  stop() {
    cancelAnimationFrame(this.raf)
    const s = this.settle
    this.settle = null
    s?.()
  }

  // Free the bitmaps.
  release() {
    this.stop()
    this.canvas.width = 0
    this.canvas.height = 0
    this.layer.width = 0
    this.layer.height = 0
    this.st = new Uint8Array(0)
    this.th = new Float32Array(0)
  }
}
