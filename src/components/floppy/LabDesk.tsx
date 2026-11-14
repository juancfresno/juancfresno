'use client'

import { useEffect, useRef, useState } from 'react'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import s from './desk.module.scss'

export type DeskEra = { key: string; year: string; name: string; line: string; note: string }
export type DeskCopy = { label: string; aria: string; timeline: string; eras: DeskEra[]; screenNote: string; photo: string; icons: string[]; objects: string; menu: string }
type Item = { n: string; name: string; kind: string }
type Game = { title: string; sub?: string }
type Stage = { dispose(): void; setEra(i: number): void }

// The desk at the bottom of the Lab: the text is plain HTML, the room is one WebGL canvas
// (desk.js), loaded only when the section comes near the viewport. No WebGL = the text alone.
export default function LabDesk({ copy, items, games }: { copy: DeskCopy; items: Item[]; games: Game[] }) {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const stageRef = useRef<Stage | null>(null)
  const start = Math.max(0, copy.eras.findIndex((e) => e.key === 'pc'))
  const [era, setEra] = useState(start)
  const eraRef = useRef(start)
  const go = (i: number) => {
    const n = Math.max(0, Math.min(copy.eras.length - 1, i))
    eraRef.current = n; setEra(n); stageRef.current?.setEra(n)
  }
  const E = copy.eras[era]

  useEffect(() => {
    const el = host.current, cv = canvas.current
    if (!el || !cv) return
    let dead = false, stage: Stage | null = null
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      import('./desk.js').then(({ createDesk }) => {
        // the labels and the screen are drawn with the page fonts
        Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(() => {
          if (dead) return
          try {
            // desk.js is untyped JS: call it loosely
            stage = (createDesk as unknown as (h: HTMLElement, c: HTMLCanvasElement, o: object) => Stage)(el, cv, {
              items, games,
              strings: { note: copy.screenNote, photo: copy.photo, icons: copy.icons, objects: copy.objects, menu: copy.menu },
            })
            stageRef.current = stage
            if (eraRef.current !== start) stage.setEra(eraRef.current)
            ;(window as unknown as { __desk?: unknown }).__desk = stage // QA probe
            setReady(true)
          } catch (err) { console.warn('[desk]', err) }
        })
      }).catch((err) => console.warn('[desk]', err))
    }, { rootMargin: '600px' })
    io.observe(el)
    return () => { dead = true; io.disconnect(); stage?.dispose(); stageRef.current = null }
  }, [copy, items, games, start])

  return (
    <section className={s.desk} aria-label={copy.aria} data-wf="media">
      <div className={s.head}>
        <ElasticLine className={s.rule} />
        <p className={s.label}>{copy.label}</p>
      </div>
      <div ref={host} className={s.stage}>
        <canvas ref={canvas} className={s.canvas} data-ready={ready || undefined} aria-hidden="true" />
      </div>
      <div className={s.timelineRow}>
      {/* the timeline: one desk per era, ← → move along it */}
      <div className={s.timeline} role="group" aria-label={copy.timeline}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') { go(era + 1); e.preventDefault() } else if (e.key === 'ArrowLeft') { go(era - 1); e.preventDefault() } }}>
        {copy.eras.map((x, i) => (
          <button key={x.key} type="button" onClick={() => go(i)} aria-pressed={i === era}>
            <span className={s.year}>{x.year}</span><span className={s.eraName}>{x.name}</span>
          </button>
        ))}
      </div>
      </div>
      <div className={s.text} aria-live="polite">
        <p className={s.line} key={`l-${E.key}`}><span className={s.bigYear}>{E.year}</span>{E.line}</p>
        <p className={s.note} key={`n-${E.key}`}>{E.note}</p>
      </div>
    </section>
  )
}
