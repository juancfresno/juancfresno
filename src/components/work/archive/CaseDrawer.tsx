'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUi } from '@/i18n/client'
import { scrambleTo } from '@/lib/scramble'
import { useOverlay, prefersReduced } from './useOverlay'
import { PixelCurtain } from './pixelCurtain'
import type { WorkItem } from './types'
import s from './drawer.module.scss'

// ─── The case drawer (/work) ──────────────────────────────────────────────────
// A light sheet, 88 % of the window (full width ≤ 1024), with the case as drawn
// in Figma "v1 · Casos" (6891:1517): web/case-top (letter · title · lead · the
// question · ficha row), the continuous image block, and web/case-next.
//
// Nothing slides: every change is the PIXEL CURTAIN (pixelCurtain.ts), the row
// hover's Bayer fill at the size of the sheet.
//   open     a blue pixel front crosses from the right edge and leaves the
//            sheet behind it; then the case-top rises line by line and the
//            title decodes.
//   close    the same front, the other way: sheet → pixels → page.
//   change   (← / →, and after the end scene) the WHOLE sheet pixelates: bar,
//            text and images break into a mosaic of 6 → 12 → 24 → 48 px
//            cells (SVG filter on the live content), the next case takes
//            its place under the biggest pixels, and they resolve back
//            48 → 6 → clean into the new layout.
//   the end  web/case-next is a pinned scene: a window onto the next case's
//            first image opens as you keep scrolling (000 → 100 %). At 100 %
//            the picture fills the sheet, breaks into a mosaic, and the
//            mosaic resolves into the next case. Scrolling back closes it.
// Esc / scrim / Close = close, focus trapped and returned (useOverlay).
// Reduced motion: no curtain, no pinned runway (the window is a plain button).
const SHEET = '#ffffff'
const PX_STEPS = [6, 12, 24, 48] // mosaic cell sizes, css px
// n frames, or 120 ms if the page isn't painting (background tab).
const frames = (n = 2) => new Promise<void>((r) => { const f = (k: number) => (k ? requestAnimationFrame(() => f(k - 1)) : r()); f(n); window.setTimeout(r, 120) })
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

type Phase = 'closed' | 'entering' | 'open' | 'leaving'

export default function CaseDrawer({ items, index, onClose, onNav }: {
  items: WorkItem[]
  index: number | null
  onClose: () => void
  onNav: (dir: 1 | -1) => void
}) {
  const t = useUi().work
  const [idx, setIdx] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('closed')
  const [fresh, setFresh] = useState(true) // first case since opening: the case-top rises in
  const idxRef = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nextRef = useRef<HTMLElement>(null)
  const nextImgRef = useRef<HTMLImageElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const curtain = useRef<PixelCurtain | null>(null)
  const seq = useRef(0) // token: a newer transition cancels the older one's tail
  const busy = useRef(false)
  const dir = useRef<1 | -1>(1)
  const hand = useRef(false) // the curtain already holds the next cover (scroll hand-off)
  const raf = useRef(0)

  // Mosaic over the live sheet: one SVG filter per cell size (below, in the
  // portal), switched on the scroller. null = clean.
  const pixelate = (cell: number | null) => {
    const el = scrollRef.current
    if (el) el.style.filter = cell ? `url(#wk-px-${cell})` : ''
  }

  const cur = () => {
    const c = canvasRef.current
    if (!c) return null
    if (!curtain.current) curtain.current = new PixelCurtain(c)
    return curtain.current
  }

  // ── index → what to do ──
  useEffect(() => {
    const from = idxRef.current
    if (index !== null && from === null) {
      idxRef.current = index
      setIdx(index)
      setFresh(true)
      setPhase('entering')
      return
    }
    if (index !== null && from !== null && index !== from) {
      const my = ++seq.current
      const fromHand = hand.current
      hand.current = false
      busy.current = true
      const show = () => {
        idxRef.current = index
        setIdx(index)
        scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
      }
      ;(async () => {
        const c = cur()
        setFresh(false)
        if (!c || prefersReduced()) { show(); busy.current = false; return }
        // The whole sheet breaks into bigger and bigger pixels…
        if (fromHand) pixelate(PX_STEPS[PX_STEPS.length - 1])
        else {
          for (const cell of PX_STEPS) {
            pixelate(cell)
            await wait(55)
            if (my !== seq.current) return
          }
        }
        // …the next case takes its place under them…
        show()
        await frames(2)
        if (my !== seq.current) return
        scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
        if (fromHand) c.clear()
        await wait(70)
        // …and they resolve into it.
        for (const cell of [...PX_STEPS].reverse()) {
          if (my !== seq.current) return
          pixelate(cell)
          await wait(60)
        }
        if (my !== seq.current) return
        pixelate(null)
        busy.current = false
      })()
      return
    }
    if (index === null && from !== null) {
      const my = ++seq.current
      busy.current = true
      idxRef.current = null
      pixelate(null)
      const done = () => {
        if (my !== seq.current) return
        setIdx(null)
        setPhase('closed')
        curtain.current?.release()
        curtain.current = null
        busy.current = false
      }
      ;(async () => {
        const c = cur()
        if (!c || prefersReduced()) { setPhase('leaving'); await wait(160); done(); return }
        c.size()
        c.solidColor(SHEET)
        await c.run({ to: 'solid', dir: 'right', ms: 220, band: 0.1 })
        if (my !== seq.current) return
        setPhase('leaving')
        await frames(1)
        if (my !== seq.current) return
        await c.run({ to: 'clear', dir: 'right', ms: 360, band: 0.12, weight: 0.6 })
        done()
      })()
    }
  }, [index])

  // ── entering: lay the sheet in pixels, then show the real one ──
  useEffect(() => {
    if (phase !== 'entering') return
    const my = ++seq.current
    busy.current = true
    ;(async () => {
      const c = cur()
      if (c && !prefersReduced()) {
        await frames(1)
        if (my !== seq.current) return
        c.size()
        c.clear()
        c.solidColor(SHEET)
        await c.run({ to: 'solid', dir: 'left', ms: 560, band: 0.1 })
        if (my !== seq.current) return
      }
      setPhase('open')
      await frames(2)
      if (my !== seq.current) return
      c?.clear()
      busy.current = false
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
    })()
  }, [phase])

  // The page behind steps back while the drawer is up.
  useEffect(() => {
    const html = document.documentElement
    if (phase === 'entering' || phase === 'open') html.dataset.workOpen = 'drawer'
    else delete html.dataset.workOpen
    return () => { delete html.dataset.workOpen }
  }, [phase])

  useEffect(() => () => { cancelAnimationFrame(raf.current); curtain.current?.release() }, [])

  // Title decodes on open and on every change of case.
  useEffect(() => {
    const el = titleRef.current
    if (phase !== 'open' || idx === null || !el || prefersReduced()) return
    const to = items[idx].title
    const cancel = scrambleTo(el, to, to, 620)
    return () => { cancel(); el.textContent = to }
  }, [idx, phase, items])

  const go = useCallback((d: 1 | -1) => {
    if (busy.current) return
    dir.current = d
    onNav(d)
  }, [onNav])

  // Close always answers, also half-way through a transition (the newer
  // sequence cancels the older one's tail).
  const close = onClose

  // ── the end: the next cover fills the sheet, mosaic, then the next case ──
  const commit = useCallback(() => {
    if (busy.current || idxRef.current === null) return
    dir.current = 1
    const img = nextImgRef.current
    const c = cur()
    if (!c || prefersReduced() || !img || !img.complete || !img.naturalWidth) { onNav(1); return }
    busy.current = true
    const my = ++seq.current
    c.size()
    c.solidImage(img)
    c.fill()
    ;(async () => {
      for (const blocks of [1, 2, 4]) {
        await wait(60)
        if (my !== seq.current) return
        c.solidImage(img, blocks)
        c.fill()
      }
      await wait(70)
      if (my !== seq.current) return
      hand.current = true
      onNav(1)
    })()
  }, [onNav])

  // ── scroll: reading line, bar state, the next scene's progress ──
  const onScroll = useCallback(() => {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const sc = scrollRef.current, nx = nextRef.current, bar = barRef.current
      if (!sc || !nx || !bar) return
      const top = sc.scrollTop
      const nextTop = nx.offsetTop
      const runway = nx.offsetHeight - sc.clientHeight
      bar.style.setProperty('--read', String(Math.max(0, Math.min(1, top / Math.max(1, nextTop - sc.clientHeight)))))
      bar.toggleAttribute('data-scrolled', top > 120)
      bar.toggleAttribute('data-dark', top >= nextTop - 28)
      const p = runway > 8 ? Math.max(0, Math.min(1, (top - nextTop) / runway)) : 0
      nx.style.setProperty('--p', p.toFixed(4))
      nx.style.setProperty('--e', Math.pow(p, 1.8).toFixed(4))
      if (pctRef.current) pctRef.current.textContent = `${String(Math.round(p * 100)).padStart(3, '0')} %`
      if (p >= 0.995) commit()
    })
  }, [commit])

  // A new case starts at the top with a closed window.
  useEffect(() => {
    const nx = nextRef.current, bar = barRef.current
    nx?.style.setProperty('--p', '0')
    nx?.style.setProperty('--e', '0')
    bar?.style.setProperty('--read', '0')
    bar?.removeAttribute('data-scrolled')
    bar?.removeAttribute('data-dark')
    if (pctRef.current) pctRef.current.textContent = '000 %'
  }, [idx])

  useOverlay(index !== null, panelRef, close, (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
  })

  if (idx === null || typeof document === 'undefined') return null
  const it = items[idx]
  const next = items[(idx + 1) % items.length]
  const total = String(items.length).padStart(2, '0')
  const ficha: [string, string][] = [[t.client, it.client]]
  if (it.studio) ficha.push([t.via, it.studio])
  ficha.push([t.role, it.role], [t.year, it.year])
  const nextImg = next.images[0] ?? next.cover

  return createPortal(
    <div className={s.root} data-phase={phase} data-fresh={fresh ? '' : undefined}>
      {/* Mosaic filters: a 2 px sample in the middle of each cell, tiled, dilated to the cell. */}
      <svg className={s.defs} width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          {PX_STEPS.map((c) => (
            <filter key={c} id={`wk-px-${c}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feFlood x={c / 2 - 1} y={c / 2 - 1} width="2" height="2" />
              <feComposite width={c} height={c} />
              <feTile result="grid" />
              <feComposite in="SourceGraphic" in2="grid" operator="in" />
              <feMorphology operator="dilate" radius={c / 2} />
            </filter>
          ))}
        </defs>
      </svg>
      <div className={s.scrim} onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t.dialog(it.title)}
        tabIndex={-1}
      >
        <div ref={scrollRef} className={s.scroll} onScroll={onScroll}>
          <div ref={barRef} className={s.bar}>
            <span className={s.count}><b>{it.n}</b> / {total}</span>
            <span className={s.barTitle} aria-hidden="true">{it.title}</span>
            <span className={s.actions}>
              <button type="button" className={s.ctl} onClick={() => go(-1)} aria-label={t.prev}>←</button>
              <button type="button" className={s.ctl} onClick={() => go(1)} aria-label={t.next}>→</button>
              <button type="button" className={s.ctl} onClick={close} data-autofocus>{t.close} <kbd>{t.esc}</kbd></button>
            </span>
            <span className={s.read} aria-hidden="true" />
          </div>

          <article className={s.sheet} key={it.slug}>
            <header className={s.top}>
              <div className={s.topRow}>
                <p className={s.letter} aria-hidden="true">{Array.from(it.title)[0]}</p>
                <div className={s.cab}>
                  <h2 ref={titleRef} className={s.title}>{it.title}</h2>
                  <p className={s.lead} data-cursor="text">{it.lead}</p>
                  {it.question && <p className={s.question} data-cursor="text">{it.question}</p>}
                </div>
              </div>
              <dl className={s.ficha}>
                {ficha.map(([k, v], i) => (
                  <div key={k} style={{ ['--i' as string]: i }}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </header>

            <div className={s.block}>
              {it.images.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.src}
                  src={img.src}
                  width={img.w}
                  height={img.h}
                  alt={t.image(it.title, i + 1, it.images.length)}
                  loading={i < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              ))}
            </div>
          </article>

          <section ref={nextRef} className={s.next} aria-label={t.nextProject} key={`next-${it.slug}`}>
            <div className={s.pin}>
              <button type="button" className={s.window} onClick={commit} aria-label={t.nextOpen(next.title)} data-cursor="view">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={nextImgRef} src={nextImg.src} alt="" decoding="async" />
              </button>
              <span className={s.tick} data-c="tl" aria-hidden="true" />
              <span className={s.tick} data-c="tr" aria-hidden="true" />
              <span className={s.tick} data-c="bl" aria-hidden="true" />
              <span className={s.tick} data-c="br" aria-hidden="true" />
              <p className={s.nCode} aria-hidden="true">{t.nextCode}</p>
              <p className={s.nSlash} aria-hidden="true">{t.nextSlash}</p>
              <p className={s.nName} aria-hidden="true">
                <span>{next.n} / {total}</span>
                <b>{next.title}</b>
              </p>
              <p className={s.nKeep} aria-hidden="true">
                <span>{t.keep}</span>
                <span ref={pctRef}>000 %</span>
                <i />
              </p>
            </div>
          </section>
        </div>
        <canvas ref={canvasRef} className={s.curtain} aria-hidden="true" />
      </div>
    </div>,
    document.body,
  )
}
