'use client'

import { useEffect, useRef } from 'react'

// Shared by the drawer and the stage: while `active`, lock page scroll (with
// scrollbar compensation), trap Tab inside `ref`, Esc → onClose, ← / → →
// onKey. Focus moves into the overlay on open; the caller returns it.
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'

export function useOverlay(
  active: boolean,
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  onKey?: (e: KeyboardEvent) => void,
) {
  const cb = useRef({ onClose, onKey })
  cb.current = { onClose, onKey }

  useEffect(() => {
    if (!active) return
    const html = document.documentElement
    const body = document.body
    const sb = window.innerWidth - html.clientWidth
    const prev = { overflow: html.style.overflow, pr: body.style.paddingRight }
    html.style.overflow = 'hidden'
    if (sb > 0) body.style.paddingRight = `${sb}px`

    const first = () => ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current
    requestAnimationFrame(() => requestAnimationFrame(() => first()?.focus({ preventScroll: true })))

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cb.current.onClose(); return }
      if (e.key === 'Tab' && ref.current) {
        const els = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement)
        if (!els.length) { e.preventDefault(); return }
        const a = els[0], z = els[els.length - 1]
        if (e.shiftKey && (document.activeElement === a || document.activeElement === ref.current)) { e.preventDefault(); z.focus() }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
        return
      }
      cb.current.onKey?.(e)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      html.style.overflow = prev.overflow
      body.style.paddingRight = prev.pr
    }
  }, [active, ref])
}

export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
