'use client'

import { useEffect, useRef, useState } from 'react'
import { startLogoDonut } from './donutGl'
import FresnoLogo from './FresnoLogo'

// The FRESNO© wordmark as a floating, turning 3D donut (donutGl.ts). Its colour
// is the CSS `color` of the canvas. No WebGL2 = the flat SVG logo instead.
export default function LogoDonut({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [flat, setFlat] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const stop = startLogoDonut(ref.current)
    if (!stop) setFlat(true)
    return stop ?? undefined
  }, [])
  if (flat) return <FresnoLogo />
  return <canvas ref={ref} className={className} role="img" aria-label="Fresno©" />
}
