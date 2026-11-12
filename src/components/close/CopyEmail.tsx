'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { PERSON_BASE as PERSON } from '@/content/person'
import { useUi } from '@/i18n/client'
import s from './close.module.scss'

// Big email (mailto) + a "Copy" button that turns into "Copied" for 1.6 s.
// Falls back to a hidden textarea + execCommand when the Clipboard API is
// missing or blocked (http previews, old Safari).
export default function CopyEmail({ size = 'xl', className }: { size?: 'xl' | 'md'; className?: string }) {
  const ui = useUi()
  const [done, setDone] = useState(false)
  const timer = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(PERSON.email)
      ok = true
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = PERSON.email
        ta.setAttribute('readonly', '')
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand('copy')
        ta.remove()
      } catch {}
    }
    if (!ok) return
    setDone(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(false), 1600)
  }

  return (
    <div className={clsx(s.email, size === 'md' && s.emailMd, className)}>
      <a className={s.emailLink} href={`mailto:${PERSON.email}`} data-no-transition data-cursor="copy">
        {PERSON.email}
      </a>
      <button type="button" data-cursor="copy" className={clsx(s.copy, done && s.copyDone)} onClick={copy} aria-label={done ? ui.copy.copied : ui.copy.copyEmail(PERSON.email)}>
        <span aria-hidden="true">[ {done ? ui.copy.done : ui.copy.copy} ]</span>
      </button>
      <span className={s.srOnly} role="status" aria-live="polite">{done ? ui.copy.status : ''}</span>
    </div>
  )
}
