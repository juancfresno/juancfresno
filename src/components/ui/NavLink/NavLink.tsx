'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import clsx from 'clsx'
import s from './NavLink.module.scss'
import { usePageTransition } from '@/providers/PageTransition'
import { useScramble } from '@/lib/useScramble'

// ─── Arrow SVG ↘ — draws from shaft tip to arrowhead on hover ─────────────────
// ViewBox 9×9 · shaft: M1.5,1.5 → L7.5,7.5 (len≈8.5) · head: M7.5,3.5 → L7.5,7.5 → L3.5,7.5 (len=8)
export const NavArrow = () => (
  <svg
    className={s.navArrow}
    width="9"
    height="9"
    viewBox="0 0 9 9"
    fill="none"
    aria-hidden="true"
  >
    {/* Shaft — diagonal from origin to corner */}
    <path
      className={s.navArrowShaft}
      d="M 1.5 1.5 L 7.5 7.5"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
    />
    {/* Head — L-bracket at the arrow tip: down then left */}
    <path
      className={s.navArrowHead}
      d="M 7.5 3.5 L 7.5 7.5 L 3.5 7.5"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// ─── NavLinkItem — scramble + chip + arrow + transition ───────────────────────
// The header nav link, reusable: hover/focus = blue chip grows in (spring),
// the label decodes left to right (420 ms) and the arrow draws. Reduced motion
// = instant (no scramble, no transitions).
export default function NavLinkItem({
  label,
  href,
  active = false,
  arrow = true,
  className,
}: {
  label: string
  href: string
  active?: boolean
  arrow?: boolean
  className?: string
}): ReactNode {
  const { navigate } = usePageTransition()
  const [hovered, setHovered] = useState(false)
  const scrambled = useScramble(label, hovered)

  return (
    <a
      href={href}
      className={clsx(s.navLink, active && s.active, className)}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      onClick={(e) => {
        // Permitir Cmd/Ctrl+click para abrir en nueva pestaña
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(href)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <span className={s.navLinkText} aria-hidden="true">{scrambled}</span>
      {arrow && <NavArrow />}
    </a>
  )
}
