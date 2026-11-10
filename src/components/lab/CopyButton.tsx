'use client'

import { useState } from 'react'
import s from './lab.module.scss'
import { useUi } from '@/i18n/client'

type Props = { label: string; text: string }

export default function CopyButton({ label, text }: Props) {
  const ui = useUi()
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1600)
    } catch {}
  }
  return (
    <button type="button" className={s.action} onClick={copy} aria-live="polite">
      {done ? ui.copy.done : label}
    </button>
  )
}
