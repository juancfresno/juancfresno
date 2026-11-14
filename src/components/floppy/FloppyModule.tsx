'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import { useScramble } from '@/lib/useScramble'
import s from './floppy.module.scss'

export type FloppyItem = {
  n: string; name: string; kind: string; year: string; what: string; how: string; built: string; href: string
  label?: string; shell?: string; accent?: string; translucent?: boolean
}
type View = 'field' | 'ring'
type Stage = { setActive(i: number): void; next(): void; prev(): void; setOpen(o: boolean, silent?: boolean): void; setView(v: View): void; setScroll(q: number): void; span: number; dispose(): void }
type Strings = { region: string; prev: string; next: string; open: string; close: string; built: string; how: string; year: string; viewField: string; viewRing: string; views: string; viewsAria: string; flow: string; field: string; ring: string; boxLine: string; boxCta: string }
type Props = { items: FloppyItem[]; labName: string; labHref: string; strings: Strings; mode?: 'free' | 'scroll' | 'flow'; total?: number; depth?: FloppyItem[]; views?: boolean }
type Layout = 'flow' | View

// The three ways to look at the disks, drawn small: floating down the page, scattered, a wheel.
const ICONS: Record<Layout, React.ReactNode> = {
  flow: <><rect x="1.5" y="0.5" width="5" height="5" /><rect x="8.5" y="4.5" width="5" height="5" /><rect x="13.5" y="10.5" width="3" height="3" /></>,
  field: <><rect x="0.5" y="6.5" width="5" height="5" /><rect x="7.5" y="1.5" width="7" height="7" /><rect x="16.5" y="9.5" width="3" height="3" /></>,
  ring: <><ellipse cx="10" cy="7" rx="9.5" ry="5" /><rect x="7.5" y="7.5" width="5" height="5" data-solid="" /></>,
}

// Text that changes like an old terminal: the block cursor eats the old string and types the new one.
function Typed({ text }: { text: string }) {
  const [shown, setShown] = useState(text)
  const [busy, setBusy] = useState(false)
  const prev = useRef(text)
  useEffect(() => {
    if (text === prev.current) return
    const from = prev.current
    prev.current = text
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(text); return }
    let i = from.length, typing = false, id: ReturnType<typeof setTimeout>
    setBusy(true)
    const step = () => {
      if (!typing) { i = Math.max(0, i - 2); setShown(from.slice(0, i)); if (i === 0) typing = true; id = setTimeout(step, 16) }
      else { i += 1; setShown(text.slice(0, i)); id = i >= text.length ? setTimeout(() => setBusy(false), 650) : setTimeout(step, 30) }
    }
    id = setTimeout(step, 0)
    return () => clearTimeout(id)
  }, [text])
  return <span className={s.typed} aria-hidden="true">{shown || '\u200b'}<span className={s.caret} data-on={busy || undefined} /></span>
}

// Closing link: same behaviour as the landing email (letters decode on hover, the underline draws).
function BoxLink({ href, text, on }: { href: string; text: string; on: boolean }) {
  const [hot, setHot] = useState(false)
  const live = useScramble(text, hot, true)
  return (
    <Link className={s.finaleCta} href={href} tabIndex={on ? 0 : -1} aria-label={text}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)} onFocus={() => setHot(true)} onBlur={() => setHot(false)}>
      <span className={s.ghost} aria-hidden="true">{text}</span>
      <span className={s.live} aria-hidden="true">{live}</span>
    </Link>
  )
}

// Lab module (Figma 7025:21805): the text is plain HTML; the disks are one WebGL
// canvas over it (pointer-events: none, the section handles the pointer), loaded
// only when the module comes near the viewport. No WebGL = the text alone.
// Two views (scattered field / wheel) and a ficha: a click on the active disk
// brings it forward over a card with the long description and the link.
export default function FloppyModule({ items, labName, labHref, strings, mode: modeProp = 'free', total = items.length, depth = [], views = false }: Props) {
  // Lab: the visitor picks the view. Floating = the Home flow; scattered / wheel = the free module.
  const [layout, setLayout] = useState<Layout>(modeProp === 'flow' ? 'flow' : 'field')
  const mode = views ? (layout === 'flow' ? 'flow' : 'free') : modeProp
  const viewRef = useRef<View>('field')
  const host = useRef<HTMLElement>(null)
  const runway = useRef<HTMLDivElement>(null)
  const scrollTo = useRef<(i: number) => void>(() => {})
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<Stage | null>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const links = useRef<(HTMLAnchorElement | null)[]>([])
  const flow = mode === 'flow'
  const [active, setActive] = useState(0)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('field')
  const [finale, setFinale] = useState(false)
  const it = items[Math.min(active, items.length - 1)] ?? items[0]

  useEffect(() => {
    const el = host.current, cv = canvas.current
    if (!el || !cv) return
    let dead = false
    let unscroll = () => {}
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      import('./stage.js').then(({ createFloppyStage }) => {
        if (dead) return
        // flow: the disks shown plus the ones that only give depth (blurred, far away or in the foreground)
        const data = (flow ? [...items, ...depth] : items).map((x) => ({ n: x.n, title: x.name, en: x.name, kind: x.kind, year: x.year, label: x.label, shell: x.shell, accent: x.accent, translucent: x.translucent }))
        const run = () => {
          if (dead) return
          try {
            if (!flow && !matchMedia('(prefers-reduced-motion: reduce)').matches) el.dataset.intro = 'pending'
            // stage.js is untyped JS: its option types are inferred from defaults, so call it loosely
            const st = (createFloppyStage as unknown as (h: HTMLElement, c: HTMLCanvasElement, o: object) => Stage)(el, cv, {
              items: data,
              onChange: (i: number) => setActive(i),
              onOpen: (o: boolean) => setOpen(o),
              onEnter: () => { el.dataset.intro = 'in' },
              onRequest: (i: number) => scrollTo.current(i),
              onFinale: (f: boolean) => setFinale(f),
              onPick: (i: number) => links.current[i]?.click(),
              flow: flow ? { main: items.length } : null,
              // the Home files every disk into the box (the ones not shown stand in it already)
              box: mode === 'scroll' && !matchMedia('(prefers-reduced-motion: reduce)').matches ? { total } : null,
            })
            stage.current = st
            if (!flow && viewRef.current === 'ring') st.setView('ring')
            // Scroll mode (Home): the module is pinned inside a tall runway and the page scroll
            // is the timeline. Native scroll, nothing hijacked; reduced motion keeps the free module.
            const rw = runway.current
            if (mode === 'scroll' && rw && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
              const n = items.length
              const span = () => Math.max(1, rw.offsetHeight - window.innerHeight)
              const onScroll = () => st.setScroll((Math.min(1, Math.max(0, -rw.getBoundingClientRect().top / span()))) * st.span)
              scrollTo.current = (i) => {
                const k = i >= n ? st.span : Math.max(0, i) // past the last disk = the end: it goes into the box
                window.scrollTo({ top: rw.getBoundingClientRect().top + window.scrollY + (span() * k) / st.span, behavior: 'smooth' })
              }
              window.addEventListener('scroll', onScroll, { passive: true })
              window.addEventListener('resize', onScroll)
              unscroll = () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
              rw.style.setProperty('--steps', String(st.span))
              rw.dataset.scroll = ''
              onScroll()
            }
            ;(window as unknown as { __floppyStage?: unknown }).__floppyStage = st // QA probe
            setReady(true)
          } catch (err) { delete el.dataset.intro; console.warn('[floppy]', err) }
        }
        // the drawn fallback labels need the page fonts
        Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(run)
      }).catch((err) => console.warn('[floppy]', err))
    }, { rootMargin: '600px' })
    io.observe(el)
    return () => { dead = true; io.disconnect(); unscroll(); scrollTo.current = () => {}; stage.current?.dispose(); stage.current = null }
  }, [items, mode, total, depth, flow])

  useEffect(() => { if (open) closeBtn.current?.focus({ preventScroll: true }) }, [open])

  const go = (d: number) => {
    if (runway.current?.dataset.scroll !== undefined) scrollTo.current(active + d)
    else if (stage.current) (d > 0 ? stage.current.next() : stage.current.prev())
    else setActive((a) => (a + d + items.length) % items.length)
  }
  const toggle = (o: boolean) => { setOpen(o); stage.current?.setOpen(o, true) }
  const pick = (v: View) => { viewRef.current = v; setView(v); stage.current?.setView(v) }
  const choose = (l: Layout) => {
    if (l === layout) return
    setOpen(false); setFinale(false); setLayout(l)
    if ((l === 'flow') !== (layout === 'flow')) setReady(false) // another canvas and another stage
    if (l !== 'flow') { viewRef.current = l; setView(l); if (layout !== 'flow') stage.current?.setView(l) }
  }
  const picker = views && (
    <div className={s.picker} role="group" aria-label={strings.viewsAria}>
      <span className={s.pickerLabel} aria-hidden="true">{strings.views}</span>
      <div className={s.pickerSet}>
        {(['flow', 'field', 'ring'] as const).map((l) => (
          <button key={l} type="button" onClick={() => choose(l)} aria-pressed={layout === l}>
            <svg viewBox="0 0 20 14" width="20" height="14" aria-hidden="true">{ICONS[l]}</svg>
            <span>{strings[l]}</span>
          </button>
        ))}
      </div>
    </div>
  )
  const wrap = (body: React.ReactElement) => (views ? <div className={s.withViews}>{picker}{body}</div> : body)

  // Flow (Home): a normal section of the page, nothing pinned. Each disk has its spot and its
  // text in the document; the canvas is a sticky viewport layer over them.
  if (flow) return wrap(
    <section ref={host} className={`${s.mod} ${s.flow}`} aria-label={strings.region} data-wf="media">
      <div className={s.sky}><canvas ref={canvas} className={s.canvas} data-ready={ready || undefined} aria-hidden="true" /></div>
      <div className={s.head}>
        <div className={s.top}>
          <p className={s.mark} aria-hidden="true">L — <Typed text={it.name.charAt(0).toUpperCase()} /></p>
          <Link className={s.lab} href={labHref}>/ {labName}</Link>
        </div>
        <ElasticLine className={s.rule} />
      </div>
      <ol className={s.stations}>
        {items.map((x, i) => (
          <li key={x.n} className={s.station} data-side={i % 2 ? 'r' : 'l'}>
            <div className={s.spot} data-floppy-spot="" />
            <div className={s.note}>
              <div className={s.row}><span className={s.num}>#{x.n}</span><span className={s.kind}>{x.kind}</span></div>
              <Link ref={(el) => { links.current[i] = el }} className={s.title} href={x.href}>{x.name}</Link>
              <p className={s.noteWhat}>{x.what}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )

  return wrap(
    <div ref={runway} className={mode === 'scroll' ? s.runway : undefined} style={{ ['--n' as string]: items.length }}>
    <section
      ref={host}
      className={s.mod}
      aria-label={strings.region}
      data-wf="media"
      data-view={view}
      data-open={open || undefined}
      data-finale={finale || undefined}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { go(1); e.preventDefault() }
        else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault() }
        else if (e.key === 'Escape' && open) { toggle(false); e.preventDefault() }
      }}
    >
      <div className={s.head}>
        <div className={s.top}>
          {/* L for Lab, then the initial of whatever is in focus */}
          <p className={s.mark} aria-hidden="true">L — <Typed text={it.name.charAt(0).toUpperCase()} /></p>
          <Link className={s.lab} href={labHref}>/ {labName}</Link>
        </div>
        <ElasticLine className={s.rule} />
        <div className={s.info} aria-live="polite">
          <div className={s.row}>
            <span className={s.num}>#{it.n}</span>
            <span className={s.kind}><span className={s.srOnly}>{it.kind}</span><Typed text={it.kind} /></span>
          </div>
          <button type="button" className={s.title} onClick={() => toggle(true)} aria-expanded={open} aria-label={it.name}><Typed text={it.name} /></button>
        </div>
      </div>
      <p className={s.what} key={it.n}>{it.what}</p>

      <article className={s.card} data-floppy-card="" aria-hidden={!open} key={`card-${it.n}`}>
        <div className={s.cardRow}>
          <span>#{it.n}</span>
          <span>{it.kind} · {it.year}</span>
        </div>
        <h3 className={s.cardTitle}>{it.name}</h3>
        <p className={s.cardWhat}>{it.what}</p>
        <dl className={s.cardSpecs}>
          <div><dt>{strings.how}</dt><dd>{it.how}</dd></div>
          <div><dt>{strings.built}</dt><dd>{it.built}</dd></div>
        </dl>
        <div className={s.cardActions}>
          <Link className={s.cta} href={it.href} tabIndex={open ? 0 : -1}>{strings.open} <span aria-hidden="true">→</span></Link>
          <button ref={closeBtn} type="button" className={s.close} onClick={() => toggle(false)} tabIndex={open ? 0 : -1}>{strings.close} <span aria-hidden="true">✕</span></button>
        </div>
      </article>

      <div className={s.finale} aria-hidden={!finale}>
        <p className={s.finaleLine}>{strings.boxLine}</p>
        <BoxLink href={labHref} text={`${strings.boxCta} →`} on={finale} />
      </div>
      <div className={s.nav}>
        <button type="button" onClick={() => go(-1)} aria-label={strings.prev}>‹</button>
        <span aria-hidden="true">{it.n} / {String(total).padStart(3, '0')}</span>
        <button type="button" onClick={() => go(1)} aria-label={strings.next}>›</button>
      </div>
      {!views && <div className={s.views} role="group">
        <button type="button" onClick={() => pick('field')} aria-pressed={view === 'field'} aria-label={strings.viewField} title={strings.viewField}>
          <svg viewBox="0 0 20 14" width="20" height="14" aria-hidden="true"><rect x="0.5" y="6.5" width="5" height="5" /><rect x="7.5" y="1.5" width="7" height="7" /><rect x="16.5" y="9.5" width="3" height="3" /></svg>
        </button>
        <button type="button" onClick={() => pick('ring')} aria-pressed={view === 'ring'} aria-label={strings.viewRing} title={strings.viewRing}>
          <svg viewBox="0 0 20 14" width="20" height="14" aria-hidden="true"><ellipse cx="10" cy="7" rx="9.5" ry="5" /><rect x="7.5" y="7.5" width="5" height="5" className={s.solid} /></svg>
        </button>
      </div>}
      <canvas ref={canvas} className={s.canvas} data-ready={ready || undefined} aria-hidden="true" />
    </section>
    </div>
  )
}
