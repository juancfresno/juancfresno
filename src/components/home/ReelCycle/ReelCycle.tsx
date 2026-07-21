'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
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
  sizes?: string
}

// ─── ReelCycle — hard-cuts through a list of images with a brief white flash
// on each cut (CRT channel-change energy), looping back to the first. Only
// the current + next-up frame are ever in the DOM: the next one preloads
// invisibly one turn ahead so the cut never waits on a network fetch, without
// eagerly loading the entire list at once. Respects prefers-reduced-motion
// by freezing on the first image with no cycling or flashing at all. ───────
export default function ReelCycle({
  images = DEFAULT_IMAGES,
  intervalMs = DEFAULT_INTERVAL_MS,
  sizes = '(max-width: 1024px) 100vw, 38vw',
}: Props) {
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

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

  const nextIndex = (index + 1) % images.length
  const canCycle = !reducedMotion && images.length > 1

  return (
    <div className={s.reel}>
      <Image src={images[index]} alt="" fill sizes={sizes} priority className={s.frame} />

      {/* Preloads one turn ahead — invisible, just warms the browser cache before its turn */}
      {canCycle && (
        <Image
          src={images[nextIndex]}
          alt=""
          fill
          sizes={sizes}
          aria-hidden="true"
          className={s.preload}
        />
      )}

      {canCycle && <div key={index} className={s.flash} aria-hidden="true" />}
    </div>
  )
}
