'use client'

import { useState, type CSSProperties } from 'react'

import s from './Footer.module.scss'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import LiveClock from '@/components/ui/LiveClock/LiveClock'
import { BehanceLogo, InstagramLogo, DribbbleLogo, LinkedInLogo, XLogo } from '@/components/ui/SocialLogos/SocialLogos'
import GlitchSocialIcon from '@/components/ui/GlitchSocialIcon/GlitchSocialIcon'
import { useHref, useUi } from '@/i18n/client'
import LocaleSwitch from '@/components/ui/LocaleSwitch/LocaleSwitch'
import { WIP } from '@/lib/wip'
import { useScramble } from '@/lib/useScramble'
import clsx from 'clsx'

// ─── Social links data ─────────────────────────────────────────────────────────
// Order as in Figma web/footer: Behance · Dribbble · LinkedIn · Instagram · X.
const SOCIALS = [
  { id: 'behance',   label: 'Behance',   href: 'https://www.behance.net/juancfresno',    Icon: BehanceLogo  },
  { id: 'dribbble',  label: 'Dribbble',  href: 'https://dribbble.com/JuanCFresno',       Icon: DribbbleLogo  },
  { id: 'linkedin',  label: 'LinkedIn',  href: 'https://www.linkedin.com/in/juancfresno', Icon: LinkedInLogo },
  { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/juanc.fresno',     Icon: InstagramLogo },
  { id: 'x',         label: 'X',         href: 'https://x.com/JuanCFresno',              Icon: XLogo        },
]

// "?" — same chip + decode as the nav links, on hover and keyboard focus.
function HelpButton({ label }: { label: string }) {
  const [hot, setHot] = useState(false)
  const text = useScramble('?', hot)
  return (
    <button
      type="button"
      className={s.help}
      aria-label={label}
      aria-keyshortcuts="?"
      onClick={() => window.dispatchEvent(new Event('fresno:shortcuts'))}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
    >
      {text}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Footer() {
  const ui = useUi()
  const href = useHref()
  return (
    <footer className={s.footer} {...(WIP ? { 'data-in': 'rise', 'data-wire': 'FOOTER', style: { '--in-d': '480ms' } as CSSProperties } : {})}>
      <div className={clsx(s.inner, WIP && s.wip)}>

        <div className={s.top}>
          {WIP && (
            <span className={s.availability}>
              <i className={s.dot} aria-hidden="true" />
              {ui.wip.available}
            </span>
          )}
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
        </div>


        {/* Divider */}
        <ElasticLine className={s.line} />

        {/* Meta row */}
        <div className={s.meta}>
          {/* © + language + the shortcuts legend ("?"), one mono line. */}
          <div className={s.metaLeft}>
            <span className={s.copyright}>© 2012 — 2026{!WIP && <> · <a href={href('/legal')} style={{ color: 'inherit' }}>{ui.footer.legal}</a></>}</span>
            <LocaleSwitch className={s.lang} {...(WIP ? { pair: true } : {})} />
            <HelpButton label={ui.nav.shortcuts} />
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
