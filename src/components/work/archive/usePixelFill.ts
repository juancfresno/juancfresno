import { useEffect, useRef, type RefObject } from 'react'
import { prefersReduced } from './useOverlay'

// ─── Pixel fill for the /work row hover ───────────────────────────────────────
// Replaces the solid chip sweep: the row highlight fills with square cells in
// the chip blue, in Bayer order (same 4×4 matrix as Lab transition 05 /
// SocialPreview) biased by column so it sweeps left → right. One canvas per
// row, sized only while it is active (freed after the exit), cell snapped to
// device pixels, one path fill per frame.
//   in  260 ms (ease-out), out 160 ms (linear, mostly Bayer, slight sweep)
// `data-ink` on the row flips the text to ink once the fill covers >= 50 %
// and back to light when it drops below 50 %, so no frame is unreadable.
// Reduced motion: instant solid fill.
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const CELL = 6 // css px
const IN_MS = 260
const OUT_MS = 160
const W_IN = 0.6 // column weight on the way in
const W_OUT = 0.3 // and out

type St = {
  raf: number; mode: 'idle' | 'in' | 'out'; t0: number
  cols: number; rows: number; cell: number
  thIn: Float32Array; thOut: Float32Array; on: Uint8Array; count: number
  color: string; started: boolean
}

export function usePixelFill(canvasRef: RefObject<HTMLCanvasElement | null>, rowRef: RefObject<HTMLElement | null>, active: boolean) {
  const st = useRef<St>({
    raf: 0, mode: 'idle', t0: 0, cols: 0, rows: 0, cell: 0,
    thIn: new Float32Array(0), thOut: new Float32Array(0), on: new Uint8Array(0), count: 0, color: '#c6dbf9', started: false,
  })

  useEffect(() => {
    const S = st.current
    const canvas = canvasRef.current
    const row = rowRef.current
    if (!canvas || !row) return
    if (!active && !S.started) return
    S.started = true
    const g = canvas.getContext('2d')
    if (!g) return

    const size = () => {
      if (canvas.width > 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cell = Math.max(1, Math.round(CELL * dpr))
      const W = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const H = Math.max(1, Math.round(canvas.clientHeight * dpr))
      canvas.width = W
      canvas.height = H
      S.cell = cell
      S.cols = Math.ceil(W / cell)
      S.rows = Math.ceil(H / cell)
      const n = S.cols * S.rows
      S.thIn = new Float32Array(n)
      S.thOut = new Float32Array(n)
      S.on = new Uint8Array(n)
      S.count = 0
      for (let y = 0; y < S.rows; y++) {
        for (let x = 0; x < S.cols; x++) {
          const b = (BAYER[y % 4][x % 4] + 0.5) / 16
          const c = S.cols > 1 ? x / (S.cols - 1) : 0
          S.thIn[y * S.cols + x] = W_IN * c + (1 - W_IN) * b
          S.thOut[y * S.cols + x] = W_OUT * c + (1 - W_OUT) * b
        }
      }
      S.color = getComputedStyle(row).getPropertyValue('--wk-chip').trim() || '#c6dbf9'
    }

    const draw = () => {
      g.clearRect(0, 0, canvas.width, canvas.height)
      g.fillStyle = S.color
      g.beginPath()
      for (let y = 0; y < S.rows; y++) {
        let x = 0
        while (x < S.cols) {
          if (!S.on[y * S.cols + x]) { x++; continue }
          const x0 = x
          while (x < S.cols && S.on[y * S.cols + x]) x++
          g.rect(x0 * S.cell, y * S.cell, (x - x0) * S.cell, S.cell)
        }
      }
      g.fill()
    }

    const ink = () => {
      const total = S.cols * S.rows
      if (S.count * 2 >= total && S.count > 0) row.setAttribute('data-ink', '')
      else row.removeAttribute('data-ink')
    }

    const release = () => {
      S.mode = 'idle'
      canvas.width = 0
      canvas.height = 0
      S.count = 0
      row.removeAttribute('data-ink')
    }

    const tick = (now: number) => {
      const x = Math.min(1, (now - S.t0) / (S.mode === 'in' ? IN_MS : OUT_MS))
      let n = 0
      if (S.mode === 'in') {
        const p = 1 - (1 - x) * (1 - x)
        for (let i = 0; i < S.on.length; i++) { if (S.thIn[i] <= p) S.on[i] = 1; n += S.on[i] }
      } else {
        for (let i = 0; i < S.on.length; i++) { if (S.thOut[i] <= x) S.on[i] = 0; n += S.on[i] }
      }
      S.count = n
      draw()
      ink()
      if (x < 1) { S.raf = requestAnimationFrame(tick); return }
      if (S.mode === 'out') release()
      else { S.on.fill(1); S.count = S.on.length; draw(); ink(); S.mode = 'idle' }
    }

    cancelAnimationFrame(S.raf)
    if (active) {
      size()
      if (prefersReduced()) { S.on.fill(1); S.count = S.on.length; draw(); ink(); S.mode = 'idle'; return }
      S.mode = 'in'
      S.t0 = performance.now()
      S.raf = requestAnimationFrame(tick)
    } else {
      if (canvas.width === 0) { release(); return }
      if (prefersReduced()) { release(); return }
      S.mode = 'out'
      S.t0 = performance.now()
      S.raf = requestAnimationFrame(tick)
    }
  }, [active, canvasRef, rowRef])

  useEffect(() => () => cancelAnimationFrame(st.current.raf), [])
}
