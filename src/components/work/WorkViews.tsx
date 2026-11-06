'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HoverIndex, { type IndexRow } from './HoverIndex'
import s from './work.module.scss'
import v from '@/components/blocks/v0.module.scss'

// ─── Lista / Portadas ─────────────────────────────────────────────────────────
// State lives in the URL (?view=portadas) and is remembered per viewer in
// localStorage ('work:view'). The server renders the list; the saved or linked
// view is applied on mount.
type View = 'lista' | 'portadas'
const KEY = 'work:view'

export default function WorkViews({ rows }: { rows: IndexRow[] }) {
  const [view, setView] = useState<View>('lista')

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('view')
    let saved: string | null = null
    try { saved = localStorage.getItem(KEY) } catch {}
    const next = fromUrl === 'portadas' || fromUrl === 'lista' ? fromUrl : saved === 'portadas' ? 'portadas' : 'lista'
    setView(next)
  }, [])

  const choose = (next: View) => {
    setView(next)
    try { localStorage.setItem(KEY, next) } catch {}
    const url = new URL(window.location.href)
    if (next === 'portadas') url.searchParams.set('view', 'portadas')
    else url.searchParams.delete('view')
    window.history.replaceState(window.history.state, '', url.toString())
  }

  return (
    <div className={s.views}>
      <div className={v.segmented} role="group" aria-label="Vista">
        <span>Vista:</span>
        <span className={v.segment}>
          <button type="button" aria-pressed={view === 'lista'} onClick={() => choose('lista')}>Lista</button>
          <button type="button" aria-pressed={view === 'portadas'} onClick={() => choose('portadas')}>Portadas</button>
        </span>
      </div>

      {view === 'lista' ? (
        <HoverIndex rows={rows} label="Proyectos" />
      ) : (
        <ul className={s.covers} aria-label="Proyectos en portadas">
          {rows.map((r, i) => {
            const meta = (
              <div className={s.coverMeta}>
                <span className={s.coverName}>
                  <span className={r.nda ? s.blur : undefined}>{r.name}</span>
                </span>
                <span className={v.mono}>{r.discipline} · {r.year}</span>
              </div>
            )
            return (
              <li key={r.key}>
                {r.href && r.cover ? (
                  <Link href={r.href} className={s.cover}>
                    <div className={s.coverMedia}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.cover.src} width={r.cover.w} height={r.cover.h} alt="" loading={i < 2 ? 'eager' : 'lazy'} decoding="async" />
                    </div>
                    {meta}
                  </Link>
                ) : (
                  <div className={s.cover}>
                    <div className={`${s.coverMedia} ${s.coverNda}`}>
                      <span className={s.pill}>NDA</span>
                    </div>
                    {meta}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
