'use client'

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import LoadingScreen from '@/components/ui/LoadingScreen/LoadingScreen'

// ─── Context ──────────────────────────────────────────────────────────────────
type TransitionCtx = { navigate: (href: string) => void }
const Ctx = createContext<TransitionCtx>({ navigate: () => {} })
export const usePageTransition = () => useContext(Ctx)

// ─── Config ───────────────────────────────────────────────────────────────────
const CELL       = 20          // px — tamaño de cada bloque de píxel
const COVER_MS   = 480         // ms — duración cover (entrada de píxeles)
const UNCOVER_MS = 520         // ms — duración uncover (salida de píxeles)
const BG         = '#10100e'   // color de los bloques — igual que el fondo del site

// ─── Fisher-Yates shuffle ─────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export default function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router    = useRouter()
  const pathname  = usePathname()
  const prevPath  = useRef(pathname)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const busy      = useRef(false)
  const rafRef    = useRef<number>(undefined)

  // ── Loading state — only on initial visit ────────────────────────────────
  const [isLoading, setIsLoading] = useState(true)

  // ── Build shuffled cell list ───────────────────────────────────────────────
  const getCells = useCallback((W: number, H: number) => {
    const cols = Math.ceil(W / CELL)
    const rows = Math.ceil(H / CELL)
    return shuffle(
      Array.from({ length: cols * rows }, (_, i) => ({
        c: i % cols,
        r: Math.floor(i / cols),
      }))
    )
  }, [])

  // ── Core pixel animation (fill or clear cells via rAF) ────────────────────
  const animateCells = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cells: { c: number; r: number }[],
      durationMs: number,
      mode: 'fill' | 'clear',
    ): Promise<void> =>
      new Promise(resolve => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)

        let index = 0
        let t0: number | null = null

        const frame = (ts: number) => {
          if (!t0) t0 = ts
          const progress = Math.min((ts - t0) / durationMs, 1)
          const target   = Math.floor(progress * cells.length)

          if (mode === 'fill') {
            ctx.fillStyle = BG
            while (index < target) {
              const { c, r } = cells[index++]
              ctx.fillRect(c * CELL, r * CELL, CELL, CELL)
            }
          } else {
            while (index < target) {
              const { c, r } = cells[index++]
              ctx.clearRect(c * CELL, r * CELL, CELL, CELL)
            }
          }

          if (progress < 1) {
            rafRef.current = requestAnimationFrame(frame)
          } else {
            // Flush any remaining cells
            if (mode === 'fill') {
              ctx.fillStyle = BG
              while (index < cells.length) {
                const { c, r } = cells[index++]
                ctx.fillRect(c * CELL, r * CELL, CELL, CELL)
              }
            } else {
              while (index < cells.length) {
                const { c, r } = cells[index++]
                ctx.clearRect(c * CELL, r * CELL, CELL, CELL)
              }
            }
            resolve()
          }
        }

        rafRef.current = requestAnimationFrame(frame)
      }),
    []
  )

  // ── Cover: blocks fill the screen randomly ─────────────────────────────────
  const coverScreen = useCallback(async () => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    const W = window.innerWidth
    const H = window.innerHeight
    cvs.width              = W
    cvs.height             = H
    cvs.style.pointerEvents = 'all'

    await animateCells(ctx, getCells(W, H), COVER_MS, 'fill')
  }, [animateCells, getCells])

  // ── Uncover: blocks clear the screen randomly ──────────────────────────────
  const uncoverScreen = useCallback(async () => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    await animateCells(ctx, getCells(cvs.width || window.innerWidth, cvs.height || window.innerHeight), UNCOVER_MS, 'clear')
    cvs.style.pointerEvents = 'none'
  }, [animateCells, getCells])

  // ── Navigate with pixel transition ────────────────────────────────────────
  const navigate = useCallback(
    async (href: string) => {
      if (busy.current) return
      if (href === prevPath.current) return   // misma página — sin transición
      busy.current = true
      await coverScreen()
      router.push(href)
      // uncoverScreen se ejecuta cuando pathname cambia (ver useEffect abajo)
    },
    [coverScreen, router]
  )

  // ── When pathname changes → uncover new page ──────────────────────────────
  useEffect(() => {
    if (pathname === prevPath.current) return
    prevPath.current = pathname
    uncoverScreen().then(() => {
      busy.current = false
    })
  }, [pathname, uncoverScreen])

  // ── Entry: fill canvas with dark bg (loading screen covers it) ────────────
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    const W = window.innerWidth
    const H = window.innerHeight
    cvs.width              = W
    cvs.height             = H
    cvs.style.pointerEvents = 'all'

    // Fill completely — sits behind LoadingScreen (z-9999)
    // Will be uncovered when loading completes
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    // If no loading screen (shouldn't happen on first load, but safety):
    // uncoverScreen runs via handleLoadingComplete
  // Solo en mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Loading complete → remove loading screen + pixel dissolve reveal ──────
  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false)
    uncoverScreen().then(() => {
      busy.current = false
    })
  }, [uncoverScreen])

  return (
    <Ctx.Provider value={{ navigate }}>
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position:      'fixed',
          inset:          0,
          width:         '100vw',
          height:        '100vh',
          zIndex:         9998,
          pointerEvents: 'none',
          display:       'block',
        }}
      />
      {isLoading && <LoadingScreen onComplete={handleLoadingComplete} />}
    </Ctx.Provider>
  )
}
