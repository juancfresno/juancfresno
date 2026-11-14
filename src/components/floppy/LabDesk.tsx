'use client'

import { useEffect, useRef, useState } from 'react'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import s from './desk.module.scss'

export type DeskCopy = { label: string; line: string; note: string; aria: string; screenNote: string; photo: string; icons: string[]; objects: string; menu: string }
type Item = { n: string; name: string; kind: string }
type Game = { title: string; sub?: string }
type Stage = { dispose(): void }

// The desk at the bottom of the Lab: the text is plain HTML, the room is one WebGL canvas
// (desk.js), loaded only when the section comes near the viewport. No WebGL = the text alone.
export default function LabDesk({ copy, items, games }: { copy: DeskCopy; items: Item[]; games: Game[] }) {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

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
            ;(window as unknown as { __desk?: unknown }).__desk = stage // QA probe
            setReady(true)
          } catch (err) { console.warn('[desk]', err) }
        })
      }).catch((err) => console.warn('[desk]', err))
    }, { rootMargin: '600px' })
    io.observe(el)
    return () => { dead = true; io.disconnect(); stage?.dispose() }
  }, [copy, items, games])

  return (
    <section className={s.desk} aria-label={copy.aria} data-wf="media">
      <div className={s.head}>
        <ElasticLine className={s.rule} />
        <p className={s.label}>{copy.label}</p>
      </div>
      <div ref={host} className={s.stage}>
        <canvas ref={canvas} className={s.canvas} data-ready={ready || undefined} aria-hidden="true" />
      </div>
      <div className={s.text}>
        <p className={s.line}>{copy.line}</p>
        <p className={s.note}>{copy.note}</p>
      </div>
    </section>
  )
}
