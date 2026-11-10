'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useHref, useUi } from '@/i18n/client'
import NavClock from '@/components/ui/NavClock/NavClock'
import { WIP } from '@/lib/wip'
import { startNoSignal } from './noSignal'
import s from './NoSignal.module.scss'

// 404 · "No signal": a TV with no input. Full-viewport analog snow (canvas,
// noSignal.ts) with occasional RGB tears; the error card sits centred on an
// ink plate so the text always reads. HUD: channel + Valencia time and a
// running timecode top-left, "no input" / "signal 0%" in the bottom corners.
// WIP (lib/wip.ts): only "Back home" (the v1.0 sections are not live yet).

const pad = (n: number) => String(n).padStart(2, '0')
// 25 fps broadcast timecode: HH:MM:SS:FF
const timecode = (ms: number) => {
  const f = Math.floor(ms / 40)
  return `${pad(Math.floor(f / 90000))}:${pad(Math.floor(f / 1500) % 60)}:${pad(Math.floor(f / 25) % 60)}:${pad(f % 25)}`
}

export default function NoSignal() {
  const ui = useUi()
  const href = useHref()
  const t = ui.notFound
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const tc = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = stage.current
    const cv = canvas.current
    if (!el || !cv) return
    return startNoSignal(cv, {
      onTear: (dx) => {
        el.style.setProperty('--tear-x', `${dx}px`)
        if (dx) el.dataset.tear = ''
        else delete el.dataset.tear
      },
      onTick: (ms) => { if (tc.current) tc.current.textContent = `TC ${timecode(ms)}` },
    })
  }, [])

  return (
    <div ref={stage} className={s.stage}>
      <canvas ref={canvas} className={s.snow} aria-hidden="true" data-wf-label="NO SIGNAL" />
      <div className={s.screen} aria-hidden="true" />

      <div className={s.hud} aria-hidden="true">
        <span className={s.tl}>{t.channel} · <NavClock /></span>
        <span className={s.tc} ref={tc}>TC 00:00:00:00</span>
        <span className={s.bl}>{t.input}</span>
        <span className={s.br}>{t.signal}</span>
      </div>

      <section className={s.card} aria-labelledby="no-signal-title">
        <p className={s.code}><i className={s.dot} aria-hidden="true" />{t.code}</p>
        <h1 id="no-signal-title" className={s.title} data-text={t.heading}>{t.heading}</h1>
        <p className={s.line}>{t.line}</p>
        <p className={s.links}>
          <Link href={href('/')} className={s.link}>{t.home}</Link>
          {!WIP && <Link href={href('/work')} className={s.link}>{t.work}</Link>}
        </p>
      </section>
    </div>
  )
}
