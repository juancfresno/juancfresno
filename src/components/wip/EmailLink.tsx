'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useUi } from '@/i18n/client'
import { useScramble } from '@/lib/useScramble'
import s from './wip.module.scss'

// Landing email: mailto link that decodes on hover/focus (nav scramble, letters
// only), draws its underline, and copies on a plain click with a "Copied ✓" chip.
// Without JS (or on middle/modified click) it stays a normal mailto.
export default function EmailLink({ email }: { email: string }) {
  const ui = useUi()
  const [active, setActive] = useState(false)
  const [done, setDone] = useState(false)
  const timer = useRef<number>(0)
  const display = useScramble(email, active, true)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(email)
      ok = true
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = email
        ta.setAttribute('readonly', '')
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand('copy')
        ta.remove()
      } catch {}
    }
    if (!ok) return false
    setDone(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(false), 1600)
    return true
  }

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    // Clipboard needs the user gesture: start the copy synchronously, fall
    // back to the mailto only if it fails.
    copy().then((ok) => { if (!ok) window.location.href = `mailto:${email}` })
  }

  return (
    <>
      <a
        className={s.email}
        href={`mailto:${email}`}
        aria-label={email}
        data-no-transition
        onClick={onClick}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
      >
        <span className={s.emailGhost} aria-hidden="true">{email}</span>
        <span className={s.emailLive} aria-hidden="true">{display}</span>
      </a>
      <span className={clsx(s.copied, done && s.copiedOn)} aria-hidden="true">{ui.wip.copiedPill}</span>
      <span className={s.srOnly} role="status" aria-live="polite">{done ? ui.copy.copied : ''}</span>
    </>
  )
}
