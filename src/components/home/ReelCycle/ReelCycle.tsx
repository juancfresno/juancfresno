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

// Displacement map for the barrel-warp filter below: red channel is a plain
// horizontal gradient (bright at the left edge, dark at the right), green is
// the same vertical. feDisplacementMap reads each channel as "value - 0.5",
// so at the left edge R is bright (>0.5) → pixels shift right (toward
// center); at the right edge R is dark (<0.5) → pixels shift left (toward
// center too). Same logic vertically via green. Net effect: content pulls
// inward at every edge, which is exactly the old-CRT pincushion curve.
const DISPLACEMENT_MAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">
  <rect width="1" height="1" fill="url(#gx)"/>
  <rect width="1" height="1" fill="url(#gy)" style="mix-blend-mode:screen"/>
  <defs>
    <linearGradient id="gx" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff0000"/>
      <stop offset="1" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="gy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#00ff00"/>
      <stop offset="1" stop-color="#000000"/>
    </linearGradient>
  </defs>
</svg>`

interface Props {
  images?: string[]
  intervalMs?: number
  sizes?: string
}

// ─── ReelCycle — hard-cuts through a list of images with a brief white flash
// on each cut (CRT channel-change energy), looping back to the first. Only
// the current + next-up frame are ever in the DOM: the next one preloads
// invisibly one turn ahead so the cut never waits on a network fetch, without
// eagerly loading the entire list at once. A persistent CRT-screen treatment
// (barrel warp + scanlines + vignette + grain) sits over the whole panel at
// all times — it's a static-per-frame look, not motion, so it stays active
// even under prefers-reduced-motion; only the auto-advance/flash stop then. ─
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
      {/* Hidden filter defs — referenced by .warpLayer via filter: url(#reelCrtBarrel) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="reelCrtBarrel" primitiveUnits="objectBoundingBox" x="-5%" y="-5%" width="110%" height="110%">
            <feImage
              href={`data:image/svg+xml;utf8,${encodeURIComponent(DISPLACEMENT_MAP_SVG)}`}
              x="0"
              y="0"
              width="1"
              height="1"
              preserveAspectRatio="none"
              result="displacementMap"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="displacementMap"
              scale="0.035"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div className={s.warpLayer}>
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

      {/* CRT screen treatment — persistent, flat (unwarped), always on regardless of reduced-motion */}
      <div className={s.scanlines} aria-hidden="true" />
      <div className={s.vignette} aria-hidden="true" />
      <div className={s.grain} aria-hidden="true" />
    </div>
  )
}
