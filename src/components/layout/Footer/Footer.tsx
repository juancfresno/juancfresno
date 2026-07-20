'use client'

import { usePathname } from 'next/navigation'
import s from './Footer.module.scss'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import LiveClock from '@/components/ui/LiveClock/LiveClock'
import { BehanceLogo, InstagramLogo, DribbbleLogo, LinkedInLogo } from '@/components/ui/SocialLogos/SocialLogos'

// ─── White VHS glitch wrapper — 3 capas del mismo color (blanco) ──────────────
// Sin split de color: los channels R/B son blancos como el main.
// El efecto es desplazamiento horizontal de bandas en blanco — "cinta VHS blanca".
function GlitchSocialIcon({ Icon }: { Icon: () => React.JSX.Element }) {
  return (
    <span className={s.socialGlWrap}>
      {/* Canal B — desplaza izquierda con clip-path */}
      <span className={`${s.socialGlLayer} ${s.socialGlB}`}><Icon /></span>
      {/* Canal R — desplaza derecha con clip-path */}
      <span className={`${s.socialGlLayer} ${s.socialGlR}`}><Icon /></span>
      {/* Capa principal — shake + flicker */}
      <span className={`${s.socialGlLayer} ${s.socialGlMain}`}><Icon /></span>
    </span>
  )
}

// ─── Social links data ─────────────────────────────────────────────────────────
const SOCIALS = [
  { id: 'behance',   label: 'Behance',   href: 'https://www.behance.net/juancfresno',    Icon: BehanceLogo  },
  { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/juancfresno',      Icon: InstagramLogo },
  { id: 'dribbble',  label: 'Dribbble',  href: 'https://dribbble.com/my-playbook',       Icon: DribbbleLogo  },
  { id: 'linkedin',  label: 'LinkedIn',  href: 'https://www.linkedin.com/in/juancfresno', Icon: LinkedInLogo },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function Footer() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const isLight = pathname === '/contact' || isHome

  return (
    <footer className={`${s.footer} ${isLight ? s.light : ''} ${isHome ? `${s.homeFooter} ${s.homeReel}` : ''}`}>
      <div className={s.inner}>

        {/* Social wordmarks — omitted on home, already inline in the hero copy */}
        {!isHome && (
          <nav className={s.social} aria-label="Redes sociales">
            {SOCIALS.map(({ id, label, href, Icon }) => (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={s.socialLink}
                aria-label={label}
              >
                <GlitchSocialIcon Icon={Icon} />
              </a>
            ))}
          </nav>
        )}

        {/* Divider */}
        <ElasticLine className={s.line} />

        {/* Meta row */}
        <div className={s.meta}>
          <span className={s.copyright}>© 2012 — 2026</span>
          <div className={s.metaRight}>
            <LiveClock />
            <span className={s.location}>
              ⌖ Valencia &#123;Spain&#125;&nbsp;&nbsp;39.6649° N , 0.2126° W
            </span>
          </div>
        </div>

      </div>
    </footer>
  )
}
