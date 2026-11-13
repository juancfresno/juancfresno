// Entrance variants for the featured pieces — an exercise to compare ways of
// bringing each image in, all travelling LEFT → RIGHT (Juan, 13 Nov 2026).
// Pick one with the on-page picker (FEATURED_PICKER in featured-preview.ts),
// `?in=<id>` or localStorage['featured:in']; DEFAULT_FX is what ships.
//   wipe     a clean reveal from the left edge, a G line rides the edge
//   push     the same reveal while the image slides in behind it (12 % → 0)
//   slats    12 horizontal slats open left → right, top to bottom
//   steps    12 columns pop in one after another, left → right
//   pixel    Bayer-dithered pixels clear with a left → right bias (Lab 05)
//   stretch  the image unrolls from its left edge with a small overshoot
// Most are CSS (featured.module.scss, keyed on [data-fx]); pixel draws on a
// throwaway canvas (pixelReveal).

export const FX = ['wipe', 'push', 'slats', 'steps', 'pixel', 'stretch'] as const
export type Fx = (typeof FX)[number]
export const DEFAULT_FX: Fx = 'wipe'
export const FX_LABEL: Record<Fx, string> = {
  wipe: 'Wipe',
  push: 'Push',
  slats: 'Slats',
  steps: 'Steps',
  pixel: 'Pixels',
  stretch: 'Stretch',
}
export const FX_STORE = 'featured:in'

export const isFx = (x: unknown): x is Fx => typeof x === 'string' && (FX as readonly string[]).includes(x)

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

// Covers `media` with the page colour and clears it in 8 px cells: each cell
// goes at (column position · 0.72 + its Bayer rank · 0.28) of the run, so the
// dither sweeps left → right. Resolves when the canvas is gone.
export function pixelReveal(media: HTMLElement, ms = 760): Promise<void> {
  const w = media.offsetWidth, h = media.offsetHeight
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const cv = document.createElement('canvas')
  cv.width = Math.round(w * dpr)
  cv.height = Math.round(h * dpr)
  cv.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;max-width:none;z-index:2;pointer-events:none`
  media.appendChild(cv)
  const ctx = cv.getContext('2d')
  if (!ctx) { cv.remove(); return Promise.resolve() }
  const bg = getComputedStyle(media).getPropertyValue('--c-bg').trim() || '#141414'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, cv.width, cv.height)
  const cell = Math.max(1, Math.round(8 * dpr))
  const cols = Math.ceil(cv.width / cell), rows = Math.ceil(cv.height / cell)
  const at = new Float32Array(cols * rows)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    at[r * cols + c] = (c / cols) * 0.72 + (BAYER[(r % 4) * 4 + (c % 4)] / 16) * 0.28
  }
  const done = new Uint8Array(cols * rows)
  const t0 = performance.now()
  return new Promise((res) => {
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      for (let i = 0; i < at.length; i++) {
        if (done[i] || at[i] > p) continue
        done[i] = 1
        ctx.clearRect((i % cols) * cell, Math.floor(i / cols) * cell, cell, cell)
      }
      if (p < 1) requestAnimationFrame(tick)
      else { cv.remove(); res() }
    }
    requestAnimationFrame(tick)
  })
}
