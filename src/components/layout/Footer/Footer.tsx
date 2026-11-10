'use client'

import s from './Footer.module.scss'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import LiveClock from '@/components/ui/LiveClock/LiveClock'
import { BehanceLogo, InstagramLogo, DribbbleLogo, LinkedInLogo, XLogo } from '@/components/ui/SocialLogos/SocialLogos'
import GlitchSocialIcon from '@/components/ui/GlitchSocialIcon/GlitchSocialIcon'
import { useHref, useUi } from '@/i18n/client'
import LocaleSwitch from '@/components/ui/LocaleSwitch/LocaleSwitch'

// ─── Social links data ─────────────────────────────────────────────────────────
// Order as in Figma web/footer: Behance · Dribbble · LinkedIn · Instagram · X.
const SOCIALS = [
  { id: 'behance',   label: 'Behance',   href: 'https://www.behance.net/juancfresno',    Icon: BehanceLogo  },
  { id: 'dribbble',  label: 'Dribbble',  href: 'https://dribbble.com/JuanCFresno',       Icon: DribbbleLogo  },
  { id: 'linkedin',  label: 'LinkedIn',  href: 'https://www.linkedin.com/in/juancfresno', Icon: LinkedInLogo },
  { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/juanc.fresno',     Icon: InstagramLogo },
  { id: 'x',         label: 'X',         href: 'https://x.com/JuanCFresno',              Icon: XLogo        },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function Footer() {
  const ui = useUi()
  const href = useHref()
  return (
    <footer className={s.footer}>
      <div className={s.inner}>

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
          {/* © + language + the shortcuts legend ("?"), one mono line. */}
          <div className={s.metaLeft}>
            <span className={s.copyright}>© 2012 — 2026 · <a href={href('/legal')} style={{ color: 'inherit' }}>{ui.footer.legal}</a></span>
            <LocaleSwitch className={s.lang} />
            <button
              type="button"
              className={s.help}
              aria-label={ui.nav.shortcuts}
              aria-keyshortcuts="?"
              onClick={() => window.dispatchEvent(new Event('fresno:shortcuts'))}
            >
              ?
            </button>
          </div>
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
