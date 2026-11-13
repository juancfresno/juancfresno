// Entrance of the featured pieces: Bayer-dithered pixels clear with a
// left → right bias (Lab 05 / the Work archive fill). Chosen by Juan on
// 13 Nov 2026 out of six variants (wipe, push, slats, steps, pixels,
// stretch; see git history of this file to bring the others back).
//
// PixelCover is reversible: `draw(p)` shows the piece at progress p
// (0 = fully covered in the page colour, 1 = clean image). Going down the
// cells clear left → right; going back up they fill in again right → left,
// so the exit is the entrance played backwards.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const CELL = 8 // css px

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
    this.cv.style.cssText = 'position:absolute;left:0;top:0;max-width:none;z-index:2;pointer-events:none'
    media.appendChild(this.cv)
    this.ctx = this.cv.getContext('2d')
  }

  private build() {
    const w = this.media.offsetWidth, h = this.media.offsetHeight
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = w; this.h = h
    this.cv.width = Math.max(1, Math.round(w * dpr))
    this.cv.height = Math.max(1, Math.round(h * dpr))
    this.cv.style.width = `${w}px`
    this.cv.style.height = `${h}px`
    this.cell = Math.max(1, Math.round(CELL * dpr))
    this.cols = Math.ceil(this.cv.width / this.cell)
    const rows = Math.ceil(this.cv.height / this.cell)
    this.at = new Float32Array(this.cols * rows)
    for (let r = 0; r < rows; r++) for (let c = 0; c < this.cols; c++) {
      // Leaves a hair before 1 so p = 1 always means clean.
      this.at[r * this.cols + c] = ((c / this.cols) * 0.72 + (BAYER[(r % 4) * 4 + (c % 4)] / 16) * 0.28) * 0.999
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
