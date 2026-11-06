'use client'

import { useEffect, useRef, useState } from 'react'
import s from './Shortcuts.module.scss'

// ─── Keyboard shortcuts legend ────────────────────────────────────────────────
// "?" opens it, Esc closes it. G (grid) and D (theme) are handled by their own
// components; M (modes) is announced as coming soon. Ignored while typing.
const KEYS: { k: string; label: string; soon?: boolean }[] = [
  { k: 'G', label: 'Retícula' },
  { k: 'D', label: 'Tema claro / oscuro' },
  { k: 'M', label: 'Modos', soon: true },
  { k: '?', label: 'Ayuda' },
]

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

export default function Shortcuts() {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (e.key === '?') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      } else if (e.key === 'm' || e.key === 'M') {
        setToast(true)
        window.setTimeout(() => setToast(false), 1600)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('fresno:shortcuts', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('fresno:shortcuts', onOpen)
    }
  }, [])

  // Move focus into the dialog and give it back on close.
  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement as HTMLElement | null
      panelRef.current?.focus()
    } else {
      lastFocus.current?.focus?.()
    }
  }, [open])

  return (
    <>
      {open && (
        <div className={s.backdrop} onClick={() => setOpen(false)}>
          <div
            ref={panelRef}
            className={s.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={s.head}>
              <p id="shortcuts-title" className={s.title}>{'{ atajos ↘'}</p>
              <button type="button" className={s.close} onClick={() => setOpen(false)} aria-label="Cerrar atajos">
                Esc
              </button>
            </div>
            <ul className={s.list}>
              {KEYS.map(({ k, label, soon }) => (
                <li key={k} className={s.row}>
                  <kbd className={s.key}>{k}</kbd>
                  <span className={s.label}>{label}</span>
                  {soon && <span className={s.soon}>próximamente</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className={s.toast} data-on={toast || undefined} role="status" aria-live="polite">
        {toast ? 'Modos · próximamente' : ''}
      </div>
    </>
  )
}
