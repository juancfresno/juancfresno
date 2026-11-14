'use client'

import { useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

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
// Full-screen footer on every page except Contact: the contact module that used
// to close the home (`close`, a server component passed by the layout) on top,
// then the rows of the live WIP landing: availability tag + socials, the line,
// © · language · ? and clock · place.
// On desktop it is anchored: its content is fixed to the viewport and the page
// above lifts to uncover it (clip-path on the footer box). On Contact only the
// classic rows show.
export default function Footer({ close }: { close?: ReactNode }) {
  const ui = useUi()
  const href = useHref()
  const pathname = usePathname() || '/'
  const full = !!close && !/\/contact\/?$/.test(pathname)
  const root = useRef<HTMLElement | null>(null)

  // The content is fixed and clipped: bring it on screen when focus lands in it.
  const onFocus = () => {
    const el = root.current
    if (!el || !full) return
    if (el.getBoundingClientRect().bottom > window.innerHeight + 4) el.scrollIntoView({ block: 'end' })
  }

  return (
    <footer ref={root} data-site-footer className={clsx(s.footer, full && s.full)} onFocusCapture={onFocus}>
      <div className={s.screen}>
        {full && <div className={s.close}>{close}</div>}

        <div className={s.inner}>
          <div className={s.top}>
            {full && (
              <span className={s.availability}>
                <i className={s.dot} aria-hidden="true" />
                {ui.footer.available}
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
              {/* Hover / focus shows the Valencia clip (components/ui/SocialPreview). */}
              <span
                className={s.location}
                data-social="valencia"
                tabIndex={0}
                role="group"
                aria-label={ui.footer.placeLabel}
              >
                ⌖ {ui.footer.place}&nbsp;&nbsp;39.6649° N , 0.2126° W
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
