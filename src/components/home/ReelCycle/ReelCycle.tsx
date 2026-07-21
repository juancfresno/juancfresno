'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import s from './ReelCycle.module.scss'

// 18 is intentionally missing from public/images/ — explicit list instead of
// a dense 1-26 range so the cycle never requests a file that isn't there.
const DEFAULT_IMAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26].map(
  (n) => `/images/${String(n).padStart(2, '0')}.webp`
)

const DEFAULT_INTERVAL_MS = 1200 // full per-image cycle time, including the fade/hold below
const FADE_MS = 350 // fade-to-black and fade-from-black duration
const HOLD_MS = 125 // hold on solid black between the two fades

interface Props {
  images?: string[]
  intervalMs?: number
  sizes?: string
}

// ─── ReelCycle — crossfades each image to solid black, holds briefly, then
// fades the next one in from black (old channel-change energy). Loops back
// to the first image after the last. Respects prefers-reduced-motion by
// freezing on the first image with no cycling or fading at all. ────────────
export default function ReelCycle({
  images = DEFAULT_IMAGES,
  intervalMs = DEFAULT_INTERVAL_MS,
  sizes = '(max-width: 1024px) 100vw, 38vw',
}: Props) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const canCycle = !reducedMotion && images.length > 1

  useEffect(() => {
    if (!canCycle) return

    const visibleMs = Math.max(100, intervalMs - FADE_MS * 2 - HOLD_MS)
    let cancelled = false
    let visibleTimer: ReturnType<typeof setTimeout>
    let swapTimer: ReturnType<typeof setTimeout>

    const cycle = () => {
      visibleTimer = setTimeout(() => {
        if (cancelled) return
        setVisible(false) // begin fade to black

        swapTimer = setTimeout(() => {
          if (cancelled) return
          setIndex((i) => (i + 1) % images.length) // swap while hidden
          setVisible(true) // begin fade in from black
          cycle()
        }, FADE_MS + HOLD_MS)
      }, visibleMs)
    }

    cycle()
    return () => {
      cancelled = true
      clearTimeout(visibleTimer)
      clearTimeout(swapTimer)
    }
  }, [canCycle, images.length, intervalMs])

  // Warm the browser cache for the next frame ahead of its turn
  useEffect(() => {
    if (!canCycle) return
    const nextSrc = images[(index + 1) % images.length]
    const img = new window.Image()
    img.src = nextSrc
  }, [canCycle, images, index])

  return (
    <div className={s.reel}>
      <Image
        src={images[index]}
        alt=""
        fill
        sizes={sizes}
        priority
        className={s.frame}
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
      />
    </div>
  )
}
