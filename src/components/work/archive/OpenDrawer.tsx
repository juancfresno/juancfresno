'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUi } from '@/i18n/client'
import { useOverlay, prefersReduced } from './useOverlay'
import { FichaList, Chips } from './Ficha'
import type { WorkItem } from './types'
import s from './open.module.scss'

// ─── ?open=drawer (default) ───────────────────────────────────────────────────
// Side drawer from the right (58 % desktop, full width ≤ 768): sticky ficha
// bar at the top, then chips + lead, then every image as one continuous
// column without gaps (the Behance block), then "Next project". The page
// behind dims and steps back 2.5vw (html[data-work-open]). ← / → = previous /
// next project (content crossfades, scroll to top), Esc / scrim = close.
// Enter 620 ms expo, exit 420 ms; reduced motion = fades.
const EXIT_MS = 440

export default function OpenDrawer({ items, index, onClose, onNav }: {
  items: WorkItem[]
  index: number | null
  onClose: () => void
  onNav: (dir: 1 | -1) => void
}) {
  const t = useUi().work
  const [idx, setIdx] = useState<number | null>(index)
  const [phase, setPhase] = useState<'closed' | 'open'>('closed')
  const [swap, setSwap] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Mount → next frame open; null → exit, then unmount.
  useEffect(() => {
    if (index !== null) {
      if (idx === null) {
        setIdx(index)
        requestAnimationFrame(() => requestAnimationFrame(() => setPhase('open')))
      } else if (index !== idx) {
        // Next / previous: fade the content out, swap, back in at the top.
        setSwap(true)
        const ms = prefersReduced() ? 0 : 160
        const id = window.setTimeout(() => {
          setIdx(index)
          scrollRef.current?.scrollTo({ top: 0 })
          requestAnimationFrame(() => setSwap(false))
        }, ms)
        return () => window.clearTimeout(id)
      }
    } else if (idx !== null) {
      setPhase('closed')
      const id = window.setTimeout(() => setIdx(null), prefersReduced() ? 160 : EXIT_MS)
      return () => window.clearTimeout(id)
    }
  }, [index, idx])

  useEffect(() => {
    const html = document.documentElement
    if (phase === 'open') html.dataset.workOpen = 'drawer'
    else delete html.dataset.workOpen
    return () => { delete html.dataset.workOpen }
  }, [phase])

  useOverlay(index !== null, panelRef, onClose, (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); onNav(1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); onNav(-1) }
  })

  if (idx === null || typeof document === 'undefined') return null
  const it = items[idx]
  const next = items[(idx + 1) % items.length]
  const total = String(items.length).padStart(2, '0')

  return createPortal(
    <div className={s.drawerRoot} data-phase={phase}>
      <div className={s.scrim} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={s.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={t.dialog(it.title)}
        tabIndex={-1}
      >
        <div ref={scrollRef} className={s.drawerScroll}>
          <div className={s.drawerBar}>
            <span className={s.dCount}><b>{it.n}</b> / {total}</span>
            <span className={s.dTitle}>{it.title}</span>
            <span className={s.dActions}>
              <button type="button" className={s.ctl} onClick={() => onNav(-1)} aria-label={t.prev}>←</button>
              <button type="button" className={s.ctl} onClick={() => onNav(1)} aria-label={t.next}>→</button>
              <button type="button" className={s.ctl} onClick={onClose} data-autofocus>{t.close} <kbd>{t.esc}</kbd></button>
            </span>
          </div>

          <div className={s.drawerBody} data-swap={swap ? '' : undefined}>
            <header className={s.dHead}>
              <p className={s.dKind}>{it.year} · {it.kind}</p>
              <h2 className={s.dH2}>{it.title}</h2>
              <Chips chips={it.chips} />
              <div className={s.dCols}>
                <p className={s.dLead}>{it.lead}</p>
                <FichaList it={it} />
              </div>
            </header>

            <div className={s.dStrip}>
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

            <button type="button" className={s.dNext} onClick={() => onNav(1)}>
              <span className={s.dNextLabel}>{t.nextProject} · {next.n}/{total}</span>
              <span className={s.dNextTitle}>{next.title} <span aria-hidden="true">→</span></span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
