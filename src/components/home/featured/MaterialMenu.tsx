'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useUi } from '@/i18n/client'
import { MATERIAL_GROUPS, MATERIALS, type MaterialId } from './materials'
import s from './featured.module.scss'

// Discreet side tab on the left edge of the featured module (sticky while the
// module is on screen). Opens a small panel to switch the card material.
export default function MaterialMenu({ value, onChange }: { value: MaterialId; onChange: (m: MaterialId) => void }) {
  const t = useUi().featured
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
    <div className={s.rail}>
      <div ref={dock} className={s.dock} data-open={open || undefined}>
        <div id={id} className={s.panel} role="radiogroup" aria-label={t.aria} inert={!open}>
          <p className={s.panelTitle}>{t.title}</p>
          {MATERIAL_GROUPS.map((gr) => (
            <div key={gr.id} className={s.group} role="presentation">
              <p className={s.groupTitle}>{t.groups[gr.id]}</p>
              {gr.items.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={value === m}
                  className={s.opt}
                  onClick={() => { onChange(m); setOpen(false) }}
                >
                  <span className={s.optNum}>{String(MATERIALS.indexOf(m) + 1).padStart(2, '0')}</span>
                  {t.materials[m]}
                </button>
              ))}
            </div>
          ))}
        </div>
        <button type="button" className={s.tab} aria-expanded={open} aria-controls={id} aria-label={t.aria} onClick={() => setOpen((o) => !o)}>
          <svg className={s.tabShape} viewBox="0 0 30 140" preserveAspectRatio="none" aria-hidden="true">
            <path d="M30 0Q30 14 18 14Q4 14 4 28L4 112Q4 126 18 126Q30 126 30 140Z" />
          </svg>
          <span className={s.tabLabel}>
            <span className={s.tabDots} aria-hidden="true"><i /><i /><i /><i /></span>
            {t.tab}
          </span>
        </button>
      </div>
    </div>
  )
}
