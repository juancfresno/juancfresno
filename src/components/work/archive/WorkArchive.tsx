'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useUi } from '@/i18n/client'
import { scrambleTo } from '@/lib/scramble'
import HoverPreview, { type PreviewHandle } from './HoverPreview'
import OpenDrawer from './OpenDrawer'
import ExpandPanel from './ExpandPanel'
import OpenStage from './OpenStage'
import { prefersReduced } from './useOverlay'
import { OPEN_MODES, type OpenMode, type WorkItem } from './types'
import s from './archive.module.scss'

// ─── /work list: Project · Via · Category · Role · Year (4 · 3 · 2 · 2 · 1) ───
// Figma 03 · Archive (6951:13618). Rows are buttons, not links: they never go
// to /work/[slug]; they open the project in place, three ways (?open=):
//   drawer (default) — side drawer from the right   → OpenDrawer
//   expand           — the row opens in place (FLIP) → ExpandPanel
//   stage            — the preview flies into a full stage → OpenStage
// URL hash #slug while a project is open (shareable; opens on load).
//
// Row hover (fine pointers): the blue nav chip sweeps through the row from the
// left (exit sweeps out to the right), text turns ink, the project name
// decodes (useScramble, 420 ms), an arrow draws itself, the other rows dim to
// 35 %, and ONE floating cover follows the cursor (HoverPreview: spring,
// velocity skew, RGB split, `NN / 30 · NAME` chip). Keyboard focus = the same.
// First two images of the project preload on hover. Touch: no hover, each row
// shows a small fixed thumbnail.

function Row({ it, i, active, expanded, mode, panelId, onEnter, onLeave, onFocusRow, onBlurRow, onOpen }: {
  it: WorkItem
  i: number
  active: boolean
  expanded: boolean
  mode: OpenMode
  panelId: string
  onEnter: (i: number, e: React.PointerEvent) => void
  onLeave: () => void
  onFocusRow: (i: number, el: HTMLElement) => void
  onBlurRow: () => void
  onOpen: (i: number, el: HTMLButtonElement) => void
}) {
  const t = useUi().work
  // Name decode on activation: case-preserving glyphs (lib/scramble), so the
  // Switzer line keeps its width while it resolves.
  const nameRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = nameRef.current
    if (!active || !el || prefersReduced()) return
    const cancel = scrambleTo(el, it.name, it.name, 420)
    return () => { cancel(); el.textContent = it.name }
  }, [active, it.name])
  return (
    <button
      type="button"
      className={s.row}
      data-row-btn={it.slug}
      aria-label={`${it.name} · ${it.via} · ${it.category} · ${it.role} · ${it.year}. ${t.open(it.name)}`}
      aria-expanded={mode === 'expand' ? expanded : undefined}
      aria-controls={mode === 'expand' && expanded ? panelId : undefined}
      aria-haspopup={mode === 'expand' ? undefined : 'dialog'}
      onPointerEnter={(e) => onEnter(i, e)}
      onPointerLeave={onLeave}
      onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) onFocusRow(i, e.currentTarget) }}
      onBlur={onBlurRow}
      onClick={(e) => onOpen(i, e.currentTarget)}
    >
      <span className={s.sweep} aria-hidden="true" />
      <span className={s.project} data-name aria-hidden="true">
        <span className={s.thumb}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.cover.src} alt="" loading="lazy" decoding="async" width={it.cover.w} height={it.cover.h} />
        </span>
        <span ref={nameRef} className={s.nameText}>{it.name}</span>
        <svg className={s.arrow} width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
          <path className={s.arrowShaft} d="M 1.5 1.5 L 7.5 7.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
          <path className={s.arrowHead} d="M 7.5 3.5 L 7.5 7.5 L 3.5 7.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={s.via} aria-hidden="true">{it.via}</span>
      <span className={s.cat} aria-hidden="true">{it.category}</span>
      <span className={s.role} aria-hidden="true">{it.role}</span>
      <span className={s.year} aria-hidden="true">{it.year}</span>
    </button>
  )
}

const preloaded = new Set<string>()
const preload = (src?: string) => {
  if (!src || preloaded.has(src)) return
  preloaded.add(src)
  const im = new Image()
  im.decoding = 'async'
  im.src = src
}

export default function WorkArchive({ items }: { items: WorkItem[] }) {
  const ui = useUi()
  const a = ui.archive
  const [mode, setMode] = useState<OpenMode>('drawer')
  const [hover, setHover] = useState<number | null>(null)
  const [openIdx, setOpenIdx] = useState<number | null>(null) // drawer / stage
  const [expanded, setExpanded] = useState<number | null>(null)
  const [stageOrigin, setStageOrigin] = useState<DOMRect | null>(null)
  const [stageRow, setStageRow] = useState<HTMLElement | null>(null)
  const preview = useRef<PreviewHandle>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const fine = useRef(false)
  const snap = useRef<{ tops: Map<Element, number>; anchor: Element | null; anchorTop: number; opening: boolean } | null>(null)
  const total = String(items.length).padStart(2, '0')

  // The expand FLIP keeps the clicked row still itself; the browser's own
  // scroll anchoring would adjust a second time.
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.overflowAnchor
    html.style.overflowAnchor = 'none'
    return () => { html.style.overflowAnchor = prev }
  }, [])

  // ?open= and #slug on load.
  useEffect(() => {
    fine.current = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const q = new URLSearchParams(window.location.search).get('open') as OpenMode | null
    const m: OpenMode = q && OPEN_MODES.includes(q) ? q : 'drawer'
    setMode(m)
    const fromHash = () => {
      const slug = decodeURIComponent(window.location.hash.slice(1))
      const i = items.findIndex((x) => x.slug === slug)
      if (i < 0) return
      if (m === 'expand') {
        setExpanded(i)
        requestAnimationFrame(() => {
          const li = listRef.current?.children[i] as HTMLElement | undefined
          if (li) window.scrollTo({ top: window.scrollY + li.getBoundingClientRect().top - 96, behavior: 'instant' })
        })
      } else {
        opener.current = document.querySelector<HTMLButtonElement>(`[data-row-btn="${slug}"]`)
        setStageRow(opener.current)
        setStageOrigin(null)
        setOpenIdx(i)
      }
    }
    fromHash()
  }, [items])

  // Hash follows what is open.
  const current = mode === 'expand' ? expanded : openIdx
  useEffect(() => {
    const url = window.location.pathname + window.location.search
    if (current === null) { if (window.location.hash) history.replaceState(history.state, '', url) }
    else history.replaceState(history.state, '', `${url}#${items[current].slug}`)
  }, [current, items])

  // ── Hover ──
  const onEnter = useCallback((i: number, e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !fine.current) return
    setHover(i)
    preview.current?.show(i, e.clientX, e.clientY)
    preload(items[i].images[0]?.src)
    preload(items[i].images[1]?.src)
  }, [items])
  const onLeave = useCallback(() => setHover(null), [])
  const onFocusRow = useCallback((i: number, el: HTMLElement) => {
    setHover(i)
    if (fine.current) preview.current?.anchor(i, el.getBoundingClientRect())
    preload(items[i].images[0]?.src)
  }, [items])
  const onBlurRow = useCallback(() => {
    if (fine.current && document.activeElement?.closest('[data-row-btn]')) return
    setHover(null)
    preview.current?.hide()
  }, [])
  const onListMove = (e: React.PointerEvent) => { if (e.pointerType === 'mouse') preview.current?.move(e.clientX, e.clientY) }
  const onListLeave = () => { setHover(null); preview.current?.hide() }

  // ── Expand: FLIP snapshot → state → animate ──
  const snapshot = (anchor: Element | null, opening: boolean) => {
    const tops = new Map<Element, number>()
    const list = listRef.current
    if (!list) return
    Array.from(list.children).forEach((li) => tops.set(li, li.getBoundingClientRect().top))
    const after = document.querySelector('[data-flip-after]')
    if (after) tops.set(after, after.getBoundingClientRect().top)
    snap.current = { tops, anchor, anchorTop: anchor?.getBoundingClientRect().top ?? 0, opening }
  }

  useLayoutEffect(() => {
    const sn = snap.current
    if (!sn) return
    snap.current = null
    // Keep the clicked row still (a panel above it may have closed).
    if (sn.anchor) {
      const d = sn.anchor.getBoundingClientRect().top - sn.anchorTop
      if (Math.abs(d) > 0.5) window.scrollBy({ top: d, behavior: 'instant' }) // html has scroll-behavior: smooth
    }
    const reduce = prefersReduced()
    sn.tops.forEach((oldTop, el) => {
      const dy = oldTop - el.getBoundingClientRect().top
      if (Math.abs(dy) < 0.5 || reduce) return
      ;(el as HTMLElement).animate(
        [{ transform: `translate3d(0, ${dy}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
        { duration: 620, easing: 'cubic-bezier(0.19, 1, 0.22, 1)' },
      )
    })
    const panel = panelRef.current
    if (panel && sn.opening) {
      panel.animate(
        reduce
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: 'translate3d(0, -24px, 0)' }, { opacity: 1, transform: 'none' }],
        { duration: reduce ? 160 : 560, delay: reduce ? 0 : 80, easing: 'cubic-bezier(0.19, 1, 0.22, 1)', fill: 'backwards' },
      )
      // Bring the opened row near the top if the panel would run off screen.
      const li = panel.parentElement
      if (li) {
        const r = li.getBoundingClientRect()
        if (r.bottom > window.innerHeight || r.top < 72) {
          window.scrollTo({ top: window.scrollY + r.top - 96, behavior: reduce ? 'auto' : 'smooth' })
        }
      }
      requestAnimationFrame(() => panel.focus({ preventScroll: true }))
    }
  }, [expanded])

  const collapse = useCallback((then?: () => void) => {
    const panel = panelRef.current
    const li = panel?.parentElement ?? null
    const finish = () => {
      snapshot(li, false)
      setExpanded(null)
      then?.()
    }
    if (!panel || prefersReduced()) { finish(); return }
    panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }).onfinish = finish
  }, [])

  // ── Open ──
  const onOpen = useCallback((i: number, el: HTMLButtonElement) => {
    opener.current = el
    if (mode === 'expand') {
      preview.current?.hide()
      if (expanded === i) { collapse(() => el.focus({ preventScroll: true })); return }
      snapshot(el.parentElement, true)
      setExpanded(i)
      return
    }
    if (mode === 'stage') {
      setStageOrigin(preview.current?.rect() ?? null)
      setStageRow(el)
      preview.current?.hide(true)
    } else {
      preview.current?.hide()
    }
    setOpenIdx(i)
  }, [mode, expanded, collapse])

  const closeOverlay = useCallback(() => {
    setOpenIdx(null)
    // Return focus to the row (drawer now; the stage after its fly-back).
    if (mode === 'drawer') requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }))
  }, [mode])

  const navDrawer = useCallback((dir: 1 | -1) => {
    setOpenIdx((v) => {
      if (v === null) return v
      const n = (v + dir + items.length) % items.length
      opener.current = document.querySelector<HTMLButtonElement>(`[data-row-btn="${items[n].slug}"]`)
      return n
    })
  }, [items])

  return (
    <div className={s.wrap}>
      <div className={s.head} aria-hidden="true">
        <span>{a.project}</span>
        <span>{a.via}</span>
        <span className={s.cat}>{a.category}</span>
        <span className={s.role}>{a.role}</span>
        <span className={s.year}>{a.year}</span>
      </div>
      <ol
        ref={listRef}
        className={clsx(s.list, expanded !== null && s.hasOpen)}
        aria-label={ui.work.list}
        onPointerMove={onListMove}
        onPointerLeave={onListLeave}
      >
        {items.map((it, i) => (
          <li key={it.slug} className={s.item} data-on={hover === i ? '' : undefined} data-open={expanded === i ? '' : undefined}>
            <Row
              it={it}
              i={i}
              active={hover === i}
              expanded={expanded === i}
              mode={mode}
              panelId={`work-panel-${it.slug}`}
              onEnter={onEnter}
              onLeave={onLeave}
              onFocusRow={onFocusRow}
              onBlurRow={onBlurRow}
              onOpen={onOpen}
            />
            {mode === 'expand' && expanded === i && (
              <ExpandPanel
                ref={panelRef}
                it={it}
                id={`work-panel-${it.slug}`}
                onClose={() => collapse(() => opener.current?.focus({ preventScroll: true }))}
              />
            )}
          </li>
        ))}
      </ol>

      <HoverPreview ref={preview} items={items} total={total} />

      {mode === 'drawer' && (
        <OpenDrawer items={items} index={openIdx} onClose={closeOverlay} onNav={navDrawer} />
      )}
      {mode === 'stage' && (
        <OpenStage
          items={items}
          index={openIdx}
          origin={stageOrigin}
          rowEl={stageRow}
          onClose={() => setOpenIdx(null)}
          onClosed={() => requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }))}
        />
      )}
    </div>
  )
}
