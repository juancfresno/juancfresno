'use client'

import { useEffect, useRef, useState } from 'react'
import { useUi } from '@/i18n/client'
import { startLogoDonut, type LogoDonutHandle } from './donutGl'
import FresnoLogo from './FresnoLogo'
import v from '@/components/blocks/v0.module.scss'
import a from './about.module.scss'

// The FRESNO© wordmark as a floating, turning 3D donut (donutGl.ts): click it
// for a liquid ripple; the Ink / Glass chips switch its material. Its colour is
// the CSS `color` of the canvas. No WebGL2 = the flat SVG logo instead.
export default function LogoDonut() {
  const ui = useUi().about.logo
  const ref = useRef<HTMLCanvasElement>(null)
  const handle = useRef<LogoDonutHandle | null>(null)
  const [flat, setFlat] = useState(false)
  const [glass, setGlass] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const h = startLogoDonut(ref.current)
    if (!h) { setFlat(true); return }
    handle.current = h
    return () => { handle.current = null; h.stop() }
  }, [])
  useEffect(() => { handle.current?.setGlass(glass) }, [glass])

  if (flat) return <FresnoLogo />
  return (
    <>
      <canvas ref={ref} className={a.donut} role="img" aria-label="Fresno©" />
      <div className={`${v.chipToggle} ${a.donutMode}`} role="group" aria-label={ui.group}>
        <button type="button" aria-pressed={!glass} onClick={() => setGlass(false)}>{ui.ink}</button>
        <button type="button" aria-pressed={glass} onClick={() => setGlass(true)}>{ui.glass}</button>
      </div>
    </>
  )
}
