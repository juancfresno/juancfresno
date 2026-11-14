'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useUi } from '@/i18n/client'
// Same tab + panel as the featured module's MaterialMenu, so it borrows its styles.
import f from '@/components/home/featured/featured.module.scss'
import s from './archive.module.scss'

// How a row of the /work list answers the pointer. Juan compares them from a
// side tab like the Material one above; the choice is kept in
// localStorage['work:hover'].
//   headline — the project name, huge, filled with its cover, behind the list
//   rule     — a line draws under the row, the name steps in, a calm cover follows
//   inverse  — the row turns over into a solid band
//   pixel    — the earlier one: blue Bayer pixels + RGB-split cover (kept)
//   swell    — the row comes closer: it grows a little, its neighbours less, the list opens around it
export const HOVER_STYLES = ['headline', 'rule', 'inverse', 'pixel', 'swell'] as const
export type HoverStyle = (typeof HOVER_STYLES)[number]
export const HOVER_DEFAULT: HoverStyle = 'headline'
export const HOVER_KEY = 'work:hover'
export const isHoverStyle = (v: unknown): v is HoverStyle => HOVER_STYLES.includes(v as HoverStyle)

export default function HoverMenu({ value, onChange }: { value: HoverStyle; onChange: (v: HoverStyle) => void }) {
  const t = useUi().work.hover
  const [open, setOpen] = useState(false)
  const id = useId()
  const dock = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const out = (e: PointerEvent) => { if (!dock.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', out)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', out) }
  }, [open])

  return (
    <div className={s.hoverMenu}>
      <div className={f.rail}>
        <div ref={dock} className={f.dock} data-open={open || undefined}>
          <div id={id} className={f.panel} role="radiogroup" aria-label={t.aria} inert={!open}>
            <p className={f.panelTitle}>{t.title}</p>
            {HOVER_STYLES.map((h, i) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={value === h}
                className={f.opt}
                onClick={() => { onChange(h); setOpen(false) }}
              >
                <span className={f.optNum}>{String(i + 1).padStart(2, '0')}</span>
                {t.styles[h]}
              </button>
            ))}
          </div>
          <button type="button" className={f.tab} aria-expanded={open} aria-controls={id} aria-label={t.aria} onClick={() => setOpen((o) => !o)}>
            <svg className={f.tabShape} viewBox="0 0 30 140" preserveAspectRatio="none" aria-hidden="true">
              <path d="M30 0Q30 14 18 14Q4 14 4 28L4 112Q4 126 18 126Q30 126 30 140Z" />
            </svg>
            <span className={f.tabLabel}>
              <span className={f.tabDots} aria-hidden="true"><i /><i /><i /><i /></span>
              {t.tab}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
