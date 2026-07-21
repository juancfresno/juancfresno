'use client'

import { useEffect, useRef, useState } from 'react'
import { useCrtShader } from './useCrtShader'
import s from './ReelCycle.module.scss'

// 18 is intentionally missing from public/images/ — explicit list instead of
// a dense 1-26 range so the cycle never requests a file that isn't there.
const DEFAULT_IMAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26].map(
  (n) => `/images/${String(n).padStart(2, '0')}.webp`
)

const DEFAULT_INTERVAL_MS = 1200

interface Props {
  images?: string[]
  intervalMs?: number
}

// ─── ReelCycle — hard-cuts through a list of images, looping back to the
// first, with a brief white flash on each cut (CRT channel-change energy).
// The whole panel is rendered through a WebGL CRT/VHS shader (barrel warp,
// chromatic aberration, edge-concentrated row jitter, scanlines, grain,
// vignette) — a persistent, static-per-frame look, not an animation, so it
// stays on under prefers-reduced-motion; only the auto-advance/flash stop
// then. See useCrtShader.ts for the actual shader. ──────────────────────────
export default function ReelCycle({
  images = DEFAULT_IMAGES,
  intervalMs = DEFAULT_INTERVAL_MS,
}: Props) {
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion || images.length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [reducedMotion, images, intervalMs])

  const canCycle = !reducedMotion && images.length > 1
  const nextIndex = (index + 1) % images.length

  // Warm the browser cache for the next frame one turn ahead — the shader
  // hook still does its own fetch when that image becomes current, but this
  // avoids a network wait at that moment.
  useEffect(() => {
    if (!canCycle) return
    const img = new window.Image()
    img.src = images[nextIndex]
  }, [canCycle, images, nextIndex])

  useCrtShader(canvasRef, images[index])

  return (
    <div className={s.reel}>
      <canvas ref={canvasRef} className={s.canvas} />
      {canCycle && <div key={index} className={s.flash} aria-hidden="true" />}
    </div>
  )
}
