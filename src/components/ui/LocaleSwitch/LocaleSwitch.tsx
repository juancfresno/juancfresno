'use client'

import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { HTML_LANG, LOCALES, LOCALE_COOKIE, LOCALE_STORAGE, switchLocalePath, type Locale } from '@/i18n/config'
import { useLocale, useUi } from '@/i18n/client'
import { usePageTransition } from '@/providers/PageTransition'
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
            <a
              href={href}
              hrefLang={HTML_LANG[l]}
              lang={HTML_LANG[l]}
              className={clsx(s.btn, on && s.on)}
              aria-current={on ? 'true' : undefined}
              aria-label={ui.lang.to[l]}
              data-no-transition
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                e.preventDefault()
                rememberLocale(l)
                if (on) return
                navigate(switchLocalePath(window.location.pathname, l) + window.location.search + window.location.hash)
              }}
            >
              {l}
            </a>
          </span>
        )
      })}
    </div>
  )
}
