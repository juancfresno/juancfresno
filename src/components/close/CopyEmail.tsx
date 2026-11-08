'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { CLOSE, PERSON } from '@/content/site'
import s from './close.module.scss'

// Big email (mailto) + a "Copy" button that turns into "Copied" for 1.6 s.
// Falls back to a hidden textarea + execCommand when the Clipboard API is
// missing or blocked (http previews, old Safari).
export default function CopyEmail({ size = 'xl', className }: { size?: 'xl' | 'md'; className?: string }) {
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
      <a className={s.emailLink} href={`mailto:${PERSON.email}`} data-no-transition>
        {PERSON.email}
      </a>
      <button type="button" className={clsx(s.copy, done && s.copyDone)} onClick={copy} aria-label={done ? 'Email copied' : `Copy ${PERSON.email}`}>
        <span aria-hidden="true">[ {done ? CLOSE.copied : CLOSE.copy} ]</span>
      </button>
      <span className={s.srOnly} role="status" aria-live="polite">{done ? 'Email copied to clipboard' : ''}</span>
    </div>
  )
}
