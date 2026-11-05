'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'
import s from './lab.module.scss'

type Props = { slug: string; html: string }

declare global {
  interface Window { fresnoButtons?: (root?: ParentNode) => () => void }
}

// Runs the exact public files of the piece: what you see is what you copy.
export default function LabDemo({ slug, html }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const cleanup = useRef<(() => void) | null>(null)

  const init = () => {
    if (!ref.current || !window.fresnoButtons) return
    cleanup.current?.()
    cleanup.current = window.fresnoButtons(ref.current)
  }

  useEffect(() => {
    init()
    return () => cleanup.current?.()
  }, [])

  return (
    <>
      <link rel="stylesheet" href={`/lab/${slug}/buttons.css`} />
      <Script src={`/lab/${slug}/buttons.js`} strategy="afterInteractive" data-manual onReady={init} />
      <div ref={ref} className={s.stage} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
