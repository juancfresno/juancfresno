// ─── Site page transitions ────────────────────────────────────────────────────
// Each effect draws on one fixed <canvas> that sits over the content area
// (below the nav, under the footer and the mobile tab bar). The provider calls
// cover() before the route changes and reveal() once the new page has painted.
// To try another Lab 002 option on the real site, add it here and change
// SITE_TRANSITION. Nothing outside this file knows how an effect looks.

export type SiteTransitionId = 'pixels' | 'instant'

/** The one switch: which Lab 002 option the real site uses. */
export const SITE_TRANSITION: SiteTransitionId = 'pixels'

export type TransitionEffect = {
  /** Animate until the content area is fully covered. */
  cover: () => Promise<void>
  /** Jump straight to covered (browser back/forward: the route is already changing). */
  coverNow: () => void
  /** Animate the cover away, leaving the canvas empty and hidden. */
  reveal: () => Promise<void>
  /** Stop and clear immediately. */
  cancel: () => void
}

type Factory = (canvas: HTMLCanvasElement) => TransitionEffect

// ─── 05 · Disolución en píxeles (Bayer order) ─────────────────────────────────
// Same timing as the Lab piece: each block switches after its Bayer-ordered
// delay across 240 ms, plus a 40 ms step → 280 ms per half, 560 ms in total.
// 12 square blocks across the viewport; rows fill the content area height.
const PX = { cols: 12, spread: 240, step: 40 }
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

const pixels: Factory = (canvas) => {
  const g = canvas.getContext('2d')
  let raf = 0
  let cells: { x: number; y: number; w: number; h: number; at: number }[] = []
  let settle: (() => void) | null = null

  const layout = () => {
    // Top edge = bottom of the fixed header (0 when it is scrolled away).
    const header = document.querySelector<HTMLElement>('[data-site-header]')
    const top = Math.max(0, Math.round(header?.getBoundingClientRect().bottom ?? 0))
    const w = document.documentElement.clientWidth
    const h = Math.max(1, window.innerHeight - top)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.style.top = `${top}px`
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const size = w / PX.cols
    const rows = Math.ceil(h / size)
    const edge = (v: number) => Math.round(v * dpr) // integer edges: no seams between blocks
    cells = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < PX.cols; x++) {
        const x0 = edge(x * size), x1 = edge((x + 1) * size)
        const y0 = edge(y * size), y1 = edge((y + 1) * size)
        const d = ((BAYER[y % 4][x % 4] + Math.random() * 0.8) / 16) * PX.spread
        cells.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, at: d + PX.step })
      }
    }
    if (g) g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--c-text').trim() || '#fcfcf7'
  }

  const draw = (filled: (at: number) => boolean) => {
    if (!g) return
    g.clearRect(0, 0, canvas.width, canvas.height)
    for (const c of cells) if (filled(c.at)) g.fillRect(c.x, c.y, c.w, c.h)
  }

  const stop = () => {
    cancelAnimationFrame(raf)
    settle?.()
    settle = null
  }

  const play = (covering: boolean) =>
    new Promise<void>((done) => {
      stop()
      settle = done
      const total = PX.spread + PX.step
      const start = performance.now()
      const tick = (now: number) => {
        const t = now - start
        draw((at) => (covering ? t >= at : t < at))
        if (t < total) raf = requestAnimationFrame(tick)
        else {
          settle = null
          done()
        }
      }
      raf = requestAnimationFrame(tick)
    })

  return {
    cover: () => {
      layout()
      canvas.style.visibility = 'visible'
      return play(true)
    },
    coverNow: () => {
      stop()
      layout()
      canvas.style.visibility = 'visible'
      draw(() => true)
    },
    reveal: () =>
      play(false).then(() => {
        canvas.style.visibility = 'hidden'
      }),
    cancel: () => {
      stop()
      g?.clearRect(0, 0, canvas.width, canvas.height)
      canvas.style.visibility = 'hidden'
    },
  }
}

// ─── 01 · Sin transición ──────────────────────────────────────────────────────
const instant: Factory = () => ({
  cover: () => Promise.resolve(),
  coverNow: () => {},
  reveal: () => Promise.resolve(),
  cancel: () => {},
})

export const EFFECTS: Record<SiteTransitionId, Factory> = { pixels, instant }
