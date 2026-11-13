// Entrance of the featured pieces: fine bitmap pixels (3 px, Bayer 8×8)
// clear with a left → right bias (Lab 05 / the Work archive fill). Chosen by Juan on
// 13 Nov 2026 out of six variants (wipe, push, slats, steps, pixels,
// stretch; see git history of this file to bring the others back).
//
// PixelCover is reversible: `draw(p)` shows the piece at progress p
// (0 = fully covered in the page colour, 1 = clean image). Going down the
// cells clear left → right; going back up they fill in again right → left,
// so the exit is the entrance played backwards.

// 8×8 Bayer matrix (0–63), built by recursion from the 2×2 one: a finer,
// more "bitmap" dither than 4×4.
const BAYER8: number[] = (() => {
  let m = [[0, 2], [3, 1]]
  while (m.length < 8) {
    const n = m.length, next: number[][] = []
    for (let y = 0; y < n * 2; y++) {
      next.push([])
      for (let x = 0; x < n * 2; x++) {
        const q = [0, 2, 3, 1][(y >= n ? 2 : 0) + (x >= n ? 1 : 0)]
        next[y].push(4 * m[y % n][x % n] + q)
      }
    }
    m = next
  }
  return m.flat()
})()
const CELL = 3 // css px: fine bitmap grain (was 8, too coarse)
const BIAS = 0.62 // share of the order that comes from the column (left → right); the rest is dither

export class PixelCover {
  private cv: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private at = new Float32Array(0)
  private on = new Uint8Array(0) // 1 = cell covered
  private cols = 0
  private cell = 1
  private w = -1
  private h = -1
  private p = -1

  constructor(private media: HTMLElement) {
    this.cv = document.createElement('canvas')
    this.cv.dataset.pixels = ''
    // 1 px of bleed on every side: the media box has fractional sizes and a
    // flush canvas let a hairline of the image show at the edges.
    this.cv.style.cssText = 'position:absolute;left:-1px;top:-1px;max-width:none;z-index:2;pointer-events:none'
    media.appendChild(this.cv)
    this.ctx = this.cv.getContext('2d')
  }

  private build() {
    const w = this.media.offsetWidth, h = this.media.offsetHeight
    const cw = w + 2, ch = h + 2 // offsetWidth rounds; the bleed covers the fraction
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = w; this.h = h
    this.cv.width = Math.max(1, Math.round(cw * dpr))
    this.cv.height = Math.max(1, Math.round(ch * dpr))
    this.cv.style.width = `${cw}px`
    this.cv.style.height = `${ch}px`
    this.cell = Math.max(1, Math.round(CELL * dpr))
    this.cols = Math.ceil(this.cv.width / this.cell)
    const rows = Math.ceil(this.cv.height / this.cell)
    this.at = new Float32Array(this.cols * rows)
    for (let r = 0; r < rows; r++) for (let c = 0; c < this.cols; c++) {
      // Leaves a hair before 1 so p = 1 always means clean.
      this.at[r * this.cols + c] = ((c / this.cols) * BIAS + (BAYER8[(r % 8) * 8 + (c % 8)] / 64) * (1 - BIAS)) * 0.999
    }
    this.on = new Uint8Array(this.at.length).fill(1)
    if (this.ctx) {
      this.ctx.fillStyle = getComputedStyle(this.media).getPropertyValue('--c-bg').trim() || '#141414'
      this.ctx.fillRect(0, 0, this.cv.width, this.cv.height)
    }
    this.p = 0
  }

  draw(p: number) {
    if (!this.ctx) return
    if (this.w !== this.media.offsetWidth || this.h !== this.media.offsetHeight) this.build()
    if (p === this.p) return
    this.cv.style.display = p >= 1 ? 'none' : ''
    const ctx = this.ctx, cell = this.cell, cols = this.cols
    for (let i = 0; i < this.at.length; i++) {
      const covered = this.at[i] >= p ? 1 : 0
      if (covered === this.on[i]) continue
      this.on[i] = covered
      const x = (i % cols) * cell, y = Math.floor(i / cols) * cell
      if (covered) ctx.fillRect(x, y, cell, cell)
      else ctx.clearRect(x, y, cell, cell)
    }
    this.p = p
  }

  destroy() { this.cv.remove() }
}
