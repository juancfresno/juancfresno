'use client'

import s from './Footer.module.scss'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import LiveClock from '@/components/ui/LiveClock/LiveClock'
import { BehanceLogo, InstagramLogo, DribbbleLogo, LinkedInLogo } from '@/components/ui/SocialLogos/SocialLogos'
import GlitchSocialIcon from '@/components/ui/GlitchSocialIcon/GlitchSocialIcon'

// ─── Social links data ─────────────────────────────────────────────────────────
const SOCIALS = [
  { id: 'behance',   label: 'Behance',   href: 'https://www.behance.net/juancfresno',    Icon: BehanceLogo  },
  { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/juanc.fresno',     Icon: InstagramLogo },
  { id: 'dribbble',  label: 'Dribbble',  href: 'https://dribbble.com/JuanCFresno',       Icon: DribbbleLogo  },
  { id: 'linkedin',  label: 'LinkedIn',  href: 'https://www.linkedin.com/in/juancfresno', Icon: LinkedInLogo },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>

        {/* Social wordmarks */}
        <nav className={s.social} aria-label="Redes sociales">
            {SOCIALS.map(({ id, label, href, Icon }) => (
              <GlitchSocialIcon
                key={id}
                href={href}
                label={label}
                icon={<Icon />}
                className={s.socialLink}
              />
            ))}
          </nav>


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
