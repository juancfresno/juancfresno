'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useHref, useUi } from '@/i18n/client'
import { WIP } from '@/lib/wip'
import { startNoSignal } from './noSignal'
import { startPageGlitch } from './pageGlitch'
import s from './NoSignal.module.scss'

// 404 · "No signal" (Figma 6957:9370, Juan's redesign): a TV with no input.
// Full-viewport analog snow (canvas, noSignal.ts) behind header AND footer,
// and one ink plate flush with the right edge, vertically centred:
// "/404 · line · / BACK HOME ↘". Every few seconds a page-wide glitch burst
// (pageGlitch.ts) breaks the whole screen. While mounted, html[data-nosignal]
// gives the chrome the dark tokens and a transparent footer.
// WIP (lib/wip.ts): only "Back home" (the v1.0 sections are not live yet).

export default function NoSignal() {
  const ui = useUi()
  const href = useHref()
  const t = ui.notFound
  const card = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = card.current
    const cv = canvas.current
    if (!el || !cv) return
    const root = document.documentElement
    root.dataset.nosignal = ''
    const snow = startNoSignal(cv, {
      onTear: (dx) => {
        el.style.setProperty('--tear-x', `${dx}px`)
        if (dx) el.dataset.tear = ''
        else delete el.dataset.tear
      },
    })
    const glitch = startPageGlitch({ snow: cv, kick: snow.kick })
    return () => {
      glitch()
      snow()
      delete root.dataset.nosignal
    }
  }, [])

  return (
    <div className={s.stage}>
      <canvas ref={canvas} className={s.snow} aria-hidden="true" data-ns-snow="" data-wf-label="NO SIGNAL" />
      <div className={s.screen} aria-hidden="true" />

      <section ref={card} className={s.card} data-ns-card="" aria-labelledby="no-signal-title">
        <h1 id="no-signal-title" className={s.code}>
          {t.code}<span className={s.srOnly}> · {t.title}</span>
        </h1>
        <p className={s.line}>{t.line}</p>
        <p className={s.actions}>
          <span className={s.slash} aria-hidden="true">/</span>
          <Link href={href('/')} className={s.link}>{t.home}</Link>
          {!WIP && <Link href={href('/work')} className={s.link}>{t.work}</Link>}
        </p>
      </section>
    </div>
  )
}
