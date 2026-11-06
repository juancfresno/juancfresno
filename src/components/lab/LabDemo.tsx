'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'
import s from './lab.module.scss'

type Props = { slug: string; html: string; css: string; js: string; init: string }

type InitFn = (root?: ParentNode) => () => void

// Runs the exact public files of the piece: what you see is what you copy.
// Each piece exposes a global init fn (window[init]) that returns its cleanup.
export default function LabDemo({ slug, html, css, js, init }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const cleanup = useRef<(() => void) | null>(null)

  const start = () => {
    const fn = (window as unknown as Record<string, InitFn | undefined>)[init]
    if (!ref.current || typeof fn !== 'function') return
    cleanup.current?.()
    cleanup.current = fn(ref.current)
  }

  useEffect(() => {
    start()
    return () => {
      cleanup.current?.()
      cleanup.current = null
    }
  }, [init])

  return (
    <>
      <link rel="stylesheet" href={`/lab/${slug}/${css}`} />
      <Script src={`/lab/${slug}/${js}`} strategy="afterInteractive" data-manual onReady={start} />
      <div ref={ref} className={s.stage} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
