'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUi } from '@/i18n/client'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import CaseDrawer from './CaseDrawer'
import type { WorkItem } from './types'
import s from './archive.module.scss'

// ─── /work list, the Biakone way (biakone.com/work) ──────────────────────────
// Mono uppercase rows across the whole width, resting at half strength:
//   ↘  NN  NAME ……………………………………………… VIA  CATEGORY  YEAR
// The row under the pointer (or with keyboard focus) is the ACTIVE one: full
// strength, the arrow shows, and its two ends step in towards the middle on a
// spring. ONE picture, fixed in the middle of the window, shows the active
// case's cover; a change of case wipes the new cover over the old one (top →
// bottom, with a small settle). Dividers are ElasticLines, as on Biakone.
// Rows are buttons (never navigate): every one opens the case drawer; the row
// of the open case stays active and follows ← / →. URL hash #slug while a case
// is open (shareable; opens on load).
// Touch / small screens: no picture, rows at full strength.

const preloaded = new Set<string>()
const preload = (src?: string) => {
  if (!src || preloaded.has(src)) return
  preloaded.add(src)
  const im = new Image()
  im.decoding = 'async'
  im.src = src
}

// The fixed picture: the current cover on top of the one before it.
function Stage({ it, on }: { it: WorkItem | null; on: boolean }) {
  const [pair, setPair] = useState<{ cur: WorkItem | null; prev: WorkItem | null }>({ cur: null, prev: null })
  useEffect(() => {
    if (!it) return
    setPair((p) => (p.cur?.slug === it.slug ? p : { cur: it, prev: p.cur }))
  }, [it])
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className={s.stage} data-on={on && pair.cur ? '' : undefined} aria-hidden="true">
      {pair.prev && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`p-${pair.prev.slug}`} className={s.stagePrev} src={pair.prev.cover.src} alt="" decoding="async" />
      )}
      {pair.cur && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={pair.cur.slug} className={s.stageImg} src={pair.cur.cover.src} alt="" decoding="async" />
      )}
    </div>,
    document.body,
  )
}

export default function WorkArchive({ items }: { items: WorkItem[] }) {
  const ui = useUi()
  const t = ui.work
  const [hover, setHover] = useState<number | null>(null)
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [fine, setFine] = useState(false)
  const opener = useRef<HTMLButtonElement | null>(null)
  const active = hover ?? openIdx

  // #slug on load.
  useEffect(() => {
    setFine(window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    const slug = decodeURIComponent(window.location.hash.slice(1))
    const i = items.findIndex((x) => x.slug === slug)
    if (i < 0) return
    opener.current = document.querySelector<HTMLButtonElement>(`[data-row-btn="${slug}"]`)
    setOpenIdx(i)
  }, [items])

  // Hash follows what is open.
  useEffect(() => {
    const url = window.location.pathname + window.location.search
    if (openIdx === null) { if (window.location.hash) history.replaceState(history.state, '', url) }
    else history.replaceState(history.state, '', `${url}#${items[openIdx].slug}`)
  }, [openIdx, items])

  const activate = useCallback((i: number) => {
    setHover(i)
    preload(items[i].cover.src)
    preload(items[i].images[0]?.src)
  }, [items])

  const closeDrawer = useCallback(() => {
    setOpenIdx(null)
    requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }))
  }, [])

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
      <ol className={s.list} aria-label={t.list} onPointerLeave={() => setHover(null)}>
        {items.map((it, i) => (
          <li key={it.slug} className={s.item} data-on={active === i ? '' : undefined}>
            {i === 0 && <ElasticLine className={`${s.line} ${s.lineTop}`} />}
            <button
              type="button"
              className={s.row}
              data-row-btn={it.slug}
              data-cursor="view"
              data-cursor-label={ui.cursor.row}
              aria-label={`${it.name} · ${it.via} · ${it.category} · ${it.year}. ${t.open(it.name)}`}
              aria-haspopup="dialog"
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') activate(i) }}
              onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) activate(i) }}
              onBlur={() => setHover(null)}
              onClick={(e) => { opener.current = e.currentTarget; setHover(null); setOpenIdx(i) }}
            >
              <span className={s.left} aria-hidden="true">
                <span className={s.arrow}>↘</span>
                <span className={s.code}>{it.n}</span>
                <span className={s.name}>{it.name}</span>
              </span>
              <span className={s.right} aria-hidden="true">
                <span className={s.via}>{it.via}</span>
                <span className={s.cat}>{it.category}</span>
                <span>{it.year}</span>
              </span>
            </button>
            <ElasticLine className={s.line} />
          </li>
        ))}
      </ol>

      {fine && <Stage it={hover !== null ? items[hover] : null} on={hover !== null && openIdx === null} />}

      <CaseDrawer items={items} index={openIdx} onClose={closeDrawer} onNav={navDrawer} />
    </div>
  )
}
