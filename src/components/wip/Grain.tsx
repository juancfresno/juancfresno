'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import s from './wip.module.scss'

// Animated film grain over the WIP landing: the feed canvas texture
// (public/feed/grain.webp, 512 px gaussian noise, alpha ≤ 24 %) drawn at 0.5
// scale, its offset jumping at 12 fps like the feed canvas. Only transform
// changes; opacity per theme lives in the stylesheet (light ≈ × 0.7 of dark,
// as in the feed). Portalled to <body> so it also covers the header and the
// footer (no seam at <main>'s stacking context). Paused while the tab is
// hidden; reduced motion = still grain.
const STEP_MS = 83
const TILE = 256

export default function Grain() {
  const el = useRef<HTMLDivElement>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => setHost(document.body), [])

  useEffect(() => {
    const node = el.current
    if (!host || !node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    const tick = () => {
      const x = Math.floor(Math.random() * TILE)
      const y = Math.floor(Math.random() * TILE)
      node.style.transform = `translate3d(${-x}px, ${-y}px, 0)`
    }
    const run = () => {
      window.clearInterval(timer)
      timer = document.hidden ? 0 : window.setInterval(tick, STEP_MS)
    }
    run()
    document.addEventListener('visibilitychange', run)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', run)
    }
  }, [host])

  if (!host) return null
  return createPortal(
    <div className={s.grain} aria-hidden="true">
      <div ref={el} className={s.grainTex} />
    </div>,
    host,
  )
}
