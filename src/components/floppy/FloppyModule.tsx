'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import s from './floppy.module.scss'

export type FloppyItem = { n: string; name: string; kind: string; year: string; what: string; href: string; label?: string; shell?: string; accent?: string }
type Stage = { setActive(i: number): void; next(): void; prev(): void; dispose(): void }
type Props = { items: FloppyItem[]; labName: string; labHref: string; strings: { region: string; prev: string; next: string } }

// Lab module (Figma 7025:21805): the text is plain HTML; the disks are one WebGL
// canvas over it (pointer-events: none, the section handles the pointer), loaded
// only when the module comes near the viewport. No WebGL = the text alone.
export default function FloppyModule({ items, labName, labHref, strings }: Props) {
  const host = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<Stage | null>(null)
  const [active, setActive] = useState(0)
  const [ready, setReady] = useState(false)
  const it = items[active]

  useEffect(() => {
    const el = host.current, cv = canvas.current
    if (!el || !cv) return
    let dead = false
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      import('./stage.js').then(({ createFloppyStage }) => {
        if (dead) return
        const data = items.map((x) => ({ n: x.n, title: x.name, en: x.name, kind: x.kind, year: x.year, label: x.label, shell: x.shell, accent: x.accent }))
        const run = () => {
          if (dead) return
          try {
            const st = createFloppyStage(el, cv, { items: data, onChange: (i: number) => setActive(i) })
            stage.current = st
            ;(window as unknown as { __floppyStage?: unknown }).__floppyStage = st // QA probe
            setReady(true)
          } catch (err) { console.warn('[floppy]', err) }
        }
        // the generated labels need the page fonts
        Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(run)
      }).catch((err) => console.warn('[floppy]', err))
    }, { rootMargin: '600px' })
    io.observe(el)
    return () => { dead = true; io.disconnect(); stage.current?.dispose(); stage.current = null }
  }, [items])

  const go = (d: number) => { if (stage.current) (d > 0 ? stage.current.next() : stage.current.prev()); else setActive((a) => (a + d + items.length) % items.length) }

  return (
    <section
      ref={host}
      className={s.mod}
      aria-label={strings.region}
      data-wf="media"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { go(1); e.preventDefault() } else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault() }
      }}
    >
      <div className={s.head}>
        <div className={s.top}>
          <p className={s.mark} aria-hidden="true">L — B</p>
          <Link className={s.lab} href={labHref}>/ {labName}</Link>
        </div>
        <ElasticLine className={s.rule} />
        <div className={s.info} aria-live="polite">
          <div className={s.row}>
            <span className={s.num}>#{it.n}</span>
            <span className={s.kind}>{it.kind}</span>
          </div>
          <Link className={s.title} href={it.href}>{it.name}</Link>
        </div>
      </div>
      <p className={s.what} key={it.n}>{it.what}</p>
      <div className={s.nav}>
        <button type="button" onClick={() => go(-1)} aria-label={strings.prev}>‹</button>
        <span aria-hidden="true">{it.n} / {String(items.length).padStart(3, '0')}</span>
        <button type="button" onClick={() => go(1)} aria-label={strings.next}>›</button>
      </div>
      <canvas ref={canvas} className={s.canvas} data-ready={ready || undefined} aria-hidden="true" />
    </section>
  )
}
