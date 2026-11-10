'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { HTML_LANG, LOCALES, LOCALE_COOKIE, LOCALE_STORAGE, switchLocalePath, type Locale } from '@/i18n/config'
import { useLocale, useUi } from '@/i18n/client'
import { usePageTransition } from '@/providers/PageTransition'
import { useScramble } from '@/lib/useScramble'
import s from '../ThemeToggle/ThemeToggle.module.scss'

// ─── Language selector · "ES / EN" ────────────────────────────────────────────
// Same voice as the theme toggle (Diseño may restyle it). Each option is a
// real link to the same page in that language (crawlable, hreflang); a click
// saves the choice (cookie NEXT_LOCALE, read by the proxy, + localStorage),
// keeps ?query and #hash, and goes through the site transition, which turns a
// language change into a covered full page load (providers/PageTransition).
const ORDER: Locale[] = ['es', 'en']

export function rememberLocale(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`
  try { localStorage.setItem(LOCALE_STORAGE, l) } catch {}
}

// One option: chip + decode on hover / focus (the nav link effect).
function LocaleOption({ l, on, href, label, onGo }: { l: Locale; on: boolean; href: string; label: string; onGo: (e: React.MouseEvent) => void }) {
  const [hot, setHot] = useState(false)
  const text = useScramble(l, hot)
  return (
    <a
      href={href}
      hrefLang={HTML_LANG[l]}
      lang={HTML_LANG[l]}
      className={clsx(s.btn, on && s.on)}
      aria-current={on ? 'true' : undefined}
      aria-label={label}
      data-no-transition
      onClick={onGo}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
    >
      {text}
    </a>
  )
}

export default function LocaleSwitch({ className, pair }: { className?: string; pair?: boolean }) {
  const locale = useLocale()
  const ui = useUi()
  const pathname = usePathname() || '/'
  const { navigate } = usePageTransition()

  return (
    <div className={clsx(s.toggle, pair && s.pair, className)} role="group" aria-label={ui.lang.group}>
      {ORDER.filter((l) => LOCALES.includes(l)).map((l, i) => {
        const on = l === locale
        const href = switchLocalePath(pathname, l)
        return (
          <span key={l} className={s.item}>
            {i > 0 && <span className={s.sep} aria-hidden="true">/</span>}
            <LocaleOption
              l={l}
              on={on}
              href={href}
              label={ui.lang.to[l]}
              onGo={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                e.preventDefault()
                rememberLocale(l)
                if (on) return
                navigate(switchLocalePath(window.location.pathname, l) + window.location.search + window.location.hash)
              }}
            />
          </span>
        )
      })}
    </div>
  )
}
