'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import s from './ReelCycle.module.scss'

// 18 is intentionally missing from public/images/ — explicit list instead of
// a dense 1-26 range so the cycle never requests a file that isn't there.
const DEFAULT_IMAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26].map(
  (n) => `/images/${String(n).padStart(2, '0')}.webp`
)

// Named separately (not derived from one "interval") so the timing is
// explicit and can't quietly regress into a strobe again. Total cycle per
// image = VISIBLE_MS + FADE_MS + HOLD_MS + FADE_MS = 2500+400+150+400 = 3450ms.
const DEFAULT_VISIBLE_MS = 2500 // how long each image stays fully visible before it starts fading
const DEFAULT_FADE_MS = 400 // fade-to-black and fade-from-black duration, each
const DEFAULT_HOLD_MS = 150 // hold on solid black between the two fades

interface Props {
  images?: string[]
  visibleMs?: number
  fadeMs?: number
  holdMs?: number
  sizes?: string
}

// ─── ReelCycle — each image holds fully visible, then crossfades to solid
// black, holds briefly, then the next fades in from black (slow, calm old
// channel-change — not a strobe). Loops back to the first image after the
// last. Respects prefers-reduced-motion by freezing on the first image with
// no cycling or fading at all. ───────────────────────────────────────────
export default function ReelCycle({
  images = DEFAULT_IMAGES,
  visibleMs = DEFAULT_VISIBLE_MS,
  fadeMs = DEFAULT_FADE_MS,
  holdMs = DEFAULT_HOLD_MS,
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

    let cancelled = false
    let visibleTimer: ReturnType<typeof setTimeout>
    let swapTimer: ReturnType<typeof setTimeout>

    const cycle = () => {
      // Phase 1: hold fully visible for `visibleMs`
      visibleTimer = setTimeout(() => {
        if (cancelled) return
        setVisible(false) // Phase 2: begin fade to black (`fadeMs`)

        swapTimer = setTimeout(() => {
          if (cancelled) return
          // `fadeMs` (fade-out) + `holdMs` (black hold) have now elapsed —
          // swap the image while it's invisible, then fade it back in
          setIndex((i) => (i + 1) % images.length)
          setVisible(true) // Phase 4: fade in from black (`fadeMs`)
          cycle()
        }, fadeMs + holdMs)
      }, visibleMs)
    }

    cycle()
    return () => {
      cancelled = true
      clearTimeout(visibleTimer)
      clearTimeout(swapTimer)
    }
  }, [canCycle, images.length, visibleMs, fadeMs, holdMs])

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
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${fadeMs}ms` }}
      />
    </div>
  )
}
