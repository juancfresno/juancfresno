'use client'

import { useEffect, useRef } from 'react'
import { useUi } from '@/i18n/client'
import { SELECTED, SELECTED_H, type SelectedPlate } from '@/content/work-selected'
import s from './selected.module.scss'

// "/ Selected projects" — Figma web/projects-grid (7297:9127): seven plates on
// a free layout + web/case-info-row under each. Liquid: every measure is its
// Figma value at 1680 as a share of the block width (cqw); one column ≤ 768.
// Plates with a case (`slug`) are buttons that open it in the /work drawer
// (window event `work:open`, heard by WorkArchive); the rest are not linked.
// Each plate develops when it enters the screen: the image comes up through a
// 4×4 Bayer dither mask in three steps, then its info row types in.
function Plate({ p }: { p: SelectedPlate }) {
  const ui = useUi()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { el.dataset.in = ''; return }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { el.dataset.in = ''; io.disconnect() }
    }, { rootMargin: '0px 0px -12% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const media = (
    <span className={s.media} style={{ aspectRatio: `${p.w} / ${p.h}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} alt="" loading="lazy" decoding="async" />
      {p.card && (
        <span className={s.card} aria-hidden="true">
          <span className={s.cardHead}>
            <i>This is not just about lighting.</i>
            <em>It is about enabling vision and supporting bold ideas.</em>
            <b>Without compromise.</b>
          </span>
          <span className={s.cardFoot}>
            <span className={s.cardMark} />
            <span className={s.cardText}>
              We understand that great spaces begin with questions, not answers. <em>With doubt before certainty. With vision that exists long before specifications.</em> <i>We provide the tools, systems, and partnership that let creators stay true to their vision.</i>
            </span>
          </span>
        </span>
      )}
      <span className={s.dither} aria-hidden="true" />
    </span>
  )

  return (
    <div
      ref={ref}
      className={s.plate}
      style={{ ['--x' as string]: p.x, ['--y' as string]: p.y, ['--w' as string]: p.w }}
    >
      {p.slug ? (
        <button
          type="button"
          className={s.hit}
          data-cursor="view"
          data-cursor-label={ui.cursor.row}
          aria-haspopup="dialog"
          aria-label={ui.work.open(p.name)}
          onClick={() => window.dispatchEvent(new CustomEvent('work:open', { detail: p.slug }))}
        >
          {media}
        </button>
      ) : media}
      <div className={s.info}>
        <span className={s.row}>
          <span className={s.code} aria-hidden="true">{p.code}</span>
          <span className={s.tags}>{p.tags}</span>
        </span>
        <span className={s.name}>{p.name}</span>
      </div>
    </div>
  )
}

export default function SelectedGrid() {
  const t = useUi().work
  return (
    <section className={s.wrap} aria-labelledby="selected-label">
      <div className={s.grid} style={{ ['--fh' as string]: SELECTED_H }}>
        <p id="selected-label" className={s.label}>{t.selectedSlash}</p>
        {SELECTED.map((p) => <Plate key={p.id} p={p} />)}
      </div>
    </section>
  )
}
