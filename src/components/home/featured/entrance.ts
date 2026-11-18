// Entrance of the featured pieces: a mosaic that resolves. The piece arrives
// as fat pixels (48 px blocks of its own colours) and every block splits in
// four again and again (48 → 24 → 12 → 6 px) until it is the image. Blocks do
// not split together: the order runs top → bottom with a per-block offset, so
// for a moment the piece is a quadtree of mixed sizes. Juan, 18 Nov 2026;
// it replaces the fine Bayer cover of 13 Nov 2026 (git history of this file).
//
// The mosaic is not cut at the photo's edge, the way a real pixelation is
// not: the grid is not aligned with the photo (it starts OFF px before it), so
// the cells on the contour stick out, whole and in full colour. The outline is
// a stair of blocks that steps in with every split. No loose pixels, no
// transparency: a cell is there or it is not.
//
// MosaicCover is stateless about time: `render(p, gate)` draws the piece at
// scroll progress p (0 = not there, 1 = clean image) capped by `gate`, a
// timed 0 → 1 ramp the caller plays once (page load, fast scroll), which
// sweeps left → right. Scrolling back simply lowers p: blocks merge again.

const SIZES = [48, 24, 12, 6] // css px, coarse → fine
const NOISE = 0.34 // per-block offset in the order
const VERT = 0.5 // top → bottom share (scroll)
const SIDE = 0.45 // left → right share (timed gate)
const STEPS = SIZES.length + 1 // hidden, then one step per size; 1 = clean
const OFF = 27 // css px the grid starts before the photo (off every cell size: 27 mod 6, 12, 24, 48 ≠ 0)

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

export class MosaicCover {
  private cv: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private mips: HTMLCanvasElement[] = []
  private lvl = new Int8Array(0) // per block: 0 hidden, 1..4 = SIZES, 5 clean
  private noise = new Float32Array(0)
  private cols = 0
  private rows = 0
  private block = 1 // device px
  private w = -1
  private h = -1
  private bg = '#141414'
  private iw = 0 // photo size, css px
  private ih = 0
  private ready = false
  private onLoad = () => { this.w = -1 }

  constructor(private media: HTMLElement, private img: HTMLImageElement) {
    this.cv = document.createElement('canvas')
    this.cv.dataset.pixels = ''
    this.cv.style.cssText = `position:absolute;left:${-OFF}px;top:${-OFF}px;max-width:none;max-height:none;z-index:2;pointer-events:none`
    media.appendChild(this.cv)
    this.ctx = this.cv.getContext('2d')
    if (!img.complete) img.addEventListener('load', this.onLoad, { once: true })
  }

  private build() {
    const w = this.media.offsetWidth, h = this.media.offsetHeight
    const M = SIZES[0]
    const cw = w + OFF + M, ch = h + OFF + M
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = w; this.h = h
    this.cv.width = Math.max(1, Math.round(cw * dpr))
    this.cv.height = Math.max(1, Math.round(ch * dpr))
    this.cv.style.width = `${cw}px`
    this.cv.style.height = `${ch}px`
    this.block = Math.round(M * dpr)
    this.cols = Math.ceil((w + OFF) / M)
    this.rows = Math.ceil((h + OFF) / M)
    this.cv.width = this.cols * this.block
    this.cv.height = this.rows * this.block
    this.cv.style.width = `${this.cols * M}px`
    this.cv.style.height = `${this.rows * M}px`
    this.iw = w; this.ih = h
    const n = this.cols * this.rows
    this.lvl = new Int8Array(n).fill(-1)
    this.noise = new Float32Array(n)
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) this.noise[r * this.cols + c] = hash(c + 1, r + 1)
    this.bg = getComputedStyle(this.media).getPropertyValue('--c-bg').trim() || '#141414'

    // One small bitmap per block size, all on the same grid (each level is
    // the previous one halved = the average of its four cells).
    this.mips = []
    this.ready = this.img.complete && this.img.naturalWidth > 0
    if (!this.ready) return
    const fine = SIZES.length - 1
    const cellsX = this.cols << fine, cellsY = this.rows << fine
    const cell = SIZES[fine] // css px of the finest cell
    const mk = (cw2: number, ch2: number) => {
      const c = document.createElement('canvas')
      c.width = cw2; c.height = ch2
      return c
    }
    // Finest level through a 4× buffer, halved twice: a clean average.
    let cur = mk(cellsX * 4, cellsY * 4)
    const g = cur.getContext('2d')!
    g.imageSmoothingQuality = 'high'
    const k = 4 / cell
    const ix = OFF * k, iy = OFF * k, iW = w * k, iH = h * k
    g.drawImage(this.img, ix, iy, iW, iH)
    // Stretch the photo's edge pixels outwards: a cell on the contour keeps
    // the photo's colour instead of mixing with the page.
    g.drawImage(cur, ix, iy, 1, iH, 0, iy, ix, iH)
    g.drawImage(cur, ix + iW - 1, iy, 1, iH, ix + iW, iy, cur.width - ix - iW, iH)
    g.drawImage(cur, 0, iy, cur.width, 1, 0, 0, cur.width, iy)
    g.drawImage(cur, 0, iy + iH - 1, cur.width, 1, 0, iy + iH, cur.width, cur.height - iy - iH)
    const half = (src: HTMLCanvasElement) => {
      const d = mk(src.width >> 1, src.height >> 1)
      const x = d.getContext('2d')!
      x.imageSmoothingQuality = 'high'
      x.drawImage(src, 0, 0, d.width, d.height)
      return d
    }
    cur = half(half(cur))
    const out: HTMLCanvasElement[] = [cur]
    for (let i = 0; i < fine; i++) { cur = half(cur); out.unshift(cur) }
    this.mips = out // [48, 24, 12, 6]
  }

  /** Draws the piece at scroll progress p, capped by the timed gate (both 0–1).
   *  Returns whether anything of it shows and whether it is fully clean. */
  render(p: number, gate: number): { any: boolean; clean: boolean } {
    const ctx = this.ctx
    if (!ctx) return { any: p > 0 && gate > 0, clean: p >= 1 && gate >= 1 }
    if (this.w !== this.media.offsetWidth || this.h !== this.media.offsetHeight) this.build()
    if (p >= 1 && gate >= 1) {
      if (this.cv.style.display !== 'none') { this.cv.style.display = 'none'; this.lvl.fill(-1) }
      return { any: true, clean: true }
    }
    if (this.cv.style.display === 'none') this.cv.style.display = ''
    const { cols, rows, block, lvl, noise, mips } = this
    const ps = p * (1 + NOISE + VERT), pg = gate * (1 + NOISE + SIDE)
    let any = false, clean = true
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = this.bg
    for (let r = 0; r < rows; r++) {
      const v = (r / Math.max(1, rows - 1)) * VERT
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        const nz = noise[i] * NOISE
        const q = Math.min(ps - nz - v, pg - nz - (c / Math.max(1, cols - 1)) * SIDE)
        // Without the bitmaps yet (image still loading) a block is hidden or clean.
        let L = q >= 1 ? STEPS : q <= 0 ? 0 : Math.floor(q * STEPS)
        if (!this.ready && L > 0 && L < STEPS) L = 0
        if (L > 0) any = true
        if (L < STEPS) clean = false
        if (L === lvl[i]) continue
        lvl[i] = L
        const x = c * block, y = r * block
        const M = SIZES[0]
        // Block rect in photo css px.
        const bx = c * M - OFF, by = r * M - OFF
        const inside = bx >= 0 && by >= 0 && bx + M <= this.iw && by + M <= this.ih
        if (inside) {
          if (L === 0) ctx.fillRect(x, y, block, block)
          else if (L === STEPS) ctx.clearRect(x, y, block, block)
          else { const n = 1 << (L - 1); ctx.drawImage(mips[L - 1], c * n, r * n, n, n, x, y, block, block) }
          continue
        }
        // Contour block: every cell that touches the photo is drawn whole.
        ctx.clearRect(x, y, block, block)
        if (L === STEPS) continue
        if (L === 0) {
          const x0 = Math.max(bx, 0), y0 = Math.max(by, 0), x1 = Math.min(bx + M, this.iw + 1), y1 = Math.min(by + M, this.ih + 1) // +1: the box has fractional sizes
          if (x1 > x0 && y1 > y0) { const k = block / M; ctx.fillRect(x + (x0 - bx) * k, y + (y0 - by) * k, (x1 - x0) * k, (y1 - y0) * k) }
          continue
        }
        const n = 1 << (L - 1), cs = M / n, d = block / n
        for (let j = 0; j < n; j++) {
          const cy0 = by + j * cs
          if (cy0 + cs <= 0 || cy0 >= this.ih) continue
          for (let i2 = 0; i2 < n; i2++) {
            const cx0 = bx + i2 * cs
            if (cx0 + cs <= 0 || cx0 >= this.iw) continue
            ctx.drawImage(mips[L - 1], c * n + i2, r * n + j, 1, 1, x + i2 * d, y + j * d, d, d)
          }
        }
      }
    }
    return { any, clean }
  }

  destroy() {
    this.img.removeEventListener('load', this.onLoad)
    this.cv.remove()
  }
}
