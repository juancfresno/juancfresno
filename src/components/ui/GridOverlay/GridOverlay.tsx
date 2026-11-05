'use client'

import { useEffect, useRef, useState } from 'react'
import s from './GridOverlay.module.scss'

// ─── Grid overlay ─────────────────────────────────────────────────────────────
// Press "G" anywhere (outside form fields) to show the layout grid the site is
// built on: same container, margins and gutter as `@mixin container` + the
// 12-column grid (4 columns on mobile). Esc hides it. The badge reads the live
// values from the DOM, so it stays true at every viewport width.
export default function GridOverlay() {
  const [visible, setVisible] = useState(false)
  const [spec, setSpec] = useState('')
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === 'g' || e.key === 'G') setVisible((v) => !v)
      if (e.key === 'Escape') setVisible(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!visible) return
    const measure = () => {
      const el = innerRef.current
      if (!el) return
      const cs = getComputedStyle(el)
      const cols = cs.gridTemplateColumns.split(' ').length
      const gap = Math.round(parseFloat(cs.columnGap))
      const margin = Math.round(parseFloat(cs.paddingLeft) + el.getBoundingClientRect().left)
      setSpec(`${cols} col · ${gap} gutter · ${margin} margin`)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [visible])

  if (!visible) return null

  return (
    <div className={s.overlay} aria-hidden="true">
      <div ref={innerRef} className={s.inner}>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={s.col} />
        ))}
      </div>
      <div className={s.badge}>
        {spec} <span className={s.key}>G</span>
      </div>
    </div>
  )
}
