'use client'

import { useEffect, useState } from 'react'
import s from './wip.module.scss'

// Figma "Rastro de imágenes (cursor)": a 10 px dot with "[ MOVE THE CURSOR ]"
// beside it, resting where the drawing puts the cursor. It invites the first
// move and leaves on it (mouse move or tap). Difference blend: light on the
// background, dark over an image, as in Figma. Touch shows the tap label;
// reduced motion hides it (no trail).
export default function TrailHint({ mouse, touch }: { mouse: string; touch: string }) {
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (gone) return
    let moved = 0
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && ++moved < 3) return
      setGone(true)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
    }
  }, [gone])

  return (
    <div className={s.hint} data-gone={gone ? '' : undefined} aria-hidden="true">
      <span className={s.hintLabel}>
        <span className={s.hintMouse}>{mouse}</span>
        <span className={s.hintTouch}>{touch}</span>
      </span>
      <span className={s.hintDot} />
    </div>
  )
}
