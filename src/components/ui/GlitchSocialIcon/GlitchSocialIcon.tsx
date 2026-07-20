import type { ReactNode } from 'react'
import s from './GlitchSocialIcon.module.scss'

interface Props {
  href: string
  label: string
  icon: ReactNode
  className?: string
}

// ─── GlitchSocialIcon — white VHS glitch wrapper, 3 layers of the same color ──
// No color split: the R/B channels are white like the main layer. The effect
// is a horizontal band displacement in white — "white VHS tape" glitch.
// Shared by Footer and the home page so both use the exact same hover effect.
export default function GlitchSocialIcon({ href, label, icon, className }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${s.link} ${className || ''}`}
      aria-label={label}
    >
      <span className={s.glWrap}>
        {/* Canal B — desplaza izquierda con clip-path */}
        <span className={`${s.glLayer} ${s.glB}`}>{icon}</span>
        {/* Canal R — desplaza derecha con clip-path */}
        <span className={`${s.glLayer} ${s.glR}`}>{icon}</span>
        {/* Capa principal — shake + flicker */}
        <span className={`${s.glLayer} ${s.glMain}`}>{icon}</span>
      </span>
    </a>
  )
}
