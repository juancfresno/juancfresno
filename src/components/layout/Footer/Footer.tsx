'use client'

import s from './Footer.module.scss'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import LiveClock from '@/components/ui/LiveClock/LiveClock'
import { BehanceLogo, InstagramLogo, DribbbleLogo, LinkedInLogo } from '@/components/ui/SocialLogos/SocialLogos'
import GlitchSocialIcon from '@/components/ui/GlitchSocialIcon/GlitchSocialIcon'
import { useHref, useUi } from '@/i18n/client'
import CopyEmail from '@/components/close/CopyEmail'
import { WIP } from '@/lib/wip'

// ─── Social links data ─────────────────────────────────────────────────────────
const SOCIALS = [
  { id: 'behance',   label: 'Behance',   href: 'https://www.behance.net/juancfresno',    Icon: BehanceLogo  },
  { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/juanc.fresno',     Icon: InstagramLogo },
  { id: 'dribbble',  label: 'Dribbble',  href: 'https://dribbble.com/JuanCFresno',       Icon: DribbbleLogo  },
  { id: 'linkedin',  label: 'LinkedIn',  href: 'https://www.linkedin.com/in/juancfresno', Icon: LinkedInLogo },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function Footer() {
  const ui = useUi()
  const href = useHref()
  return (
    <footer className={s.footer}>
      <div className={s.inner}>

        {/* WIP landing (lib/wip.ts): the email lives here, there is no close block. */}
        {WIP && <CopyEmail size="md" className={s.email} />}

        {/* Social wordmarks */}
        <nav className={s.social} aria-label={ui.footer.socials}>
            {SOCIALS.map(({ id, label, href: url, Icon }) => (
              <GlitchSocialIcon
                key={id}
                href={url}
                label={label}
                icon={<Icon />}
                className={s.socialLink}
                social={id}
              />
            ))}
          </nav>


        {/* Divider */}
        <ElasticLine className={s.line} />

        {/* Meta row */}
        <div className={s.meta}>
          <span className={s.copyright}>© 2012 — 2026{!WIP && <> · <a href={href('/legal')} style={{ color: 'inherit' }}>{ui.footer.legal}</a></>}</span>
          <div className={s.metaRight}>
            <LiveClock />
            <span className={s.location}>
              ⌖ {ui.footer.place}&nbsp;&nbsp;39.6649° N , 0.2126° W
            </span>
          </div>
        </div>

      </div>
    </footer>
  )
}
