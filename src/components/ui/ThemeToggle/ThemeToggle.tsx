'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import clsx from 'clsx'
import s from './ThemeToggle.module.scss'
import { useUi } from '@/i18n/client'

// ─── Theme toggle ─────────────────────────────────────────────────────────────
// Dark is the default; the choice is saved in localStorage ('theme') and
// applied before paint by the inline script in layout.tsx. Press "D" to
// toggle from the keyboard. Built as a list of modes so the extra
// art-direction modes can be added later without changing the UI.
export const THEMES = ['dark', 'light'] as const
export type Theme = (typeof THEMES)[number]

function apply(theme: Theme) {
  const root = document.documentElement
  root.classList.add('theme-anim')
  root.dataset.theme = theme
  try { localStorage.setItem('theme', theme) } catch {}
  window.setTimeout(() => root.classList.remove('theme-anim'), 400)
}

export default function ThemeToggle({ className }: { className?: string }) {
  const ui = useUi()
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const current = document.documentElement.dataset.theme
    if (current === 'light') setTheme('light')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === 'd' || e.key === 'D') {
        setTheme((prev) => {
          const next: Theme = prev === 'dark' ? 'light' : 'dark'
          apply(next)
          return next
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={clsx(s.toggle, className)} role="group" aria-label={ui.theme.group} data-in="fade" data-wire="THEME" style={{ '--in-d': '90ms' } as CSSProperties}>
      {THEMES.map((t, i) => (
        <span key={t} className={s.item}>
          {i > 0 && <span className={s.sep} aria-hidden="true">/</span>}
          <button
            type="button"
            className={clsx(s.btn, theme === t && s.on)}
            aria-pressed={theme === t}
            onClick={() => { setTheme(t); apply(t) }}
          >
            {ui.theme[t]}
          </button>
        </span>
      ))}
    </div>
  )
}
