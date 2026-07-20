'use client'

import { useRef, type MouseEvent } from 'react'
import s from './CtaButton.module.scss'

interface Props {
  href: string
  label: string
}

// ─── CtaButton — black at rest, cream text. On hover/focus a circular fill
// expands from the cursor entry point, inverting to cream bg + black text.
// On leave it contracts back toward the exit point (same mechanism, reversed
// coordinates) rather than holding — reads as one continuous motion. ────────
export default function CtaButton({ href, label }: Props) {
  const ref = useRef<HTMLAnchorElement>(null)

  const setOrigin = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    el.style.setProperty('--y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  const resetOrigin = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--x', '50%')
    el.style.setProperty('--y', '50%')
  }

  return (
    <a
      ref={ref}
      href={href}
      className={s.cta}
      onMouseEnter={setOrigin}
      onMouseLeave={setOrigin}
      onFocus={resetOrigin}
    >
      <span className={s.base}>{label}</span>
      <span className={s.fill} aria-hidden="true">
        <span className={s.fillLabel}>{label}</span>
      </span>
    </a>
  )
}
