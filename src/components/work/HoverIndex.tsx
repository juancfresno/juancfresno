'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import type { Img } from '@/content/cases'
import s from './work.module.scss'

// ─── Project index with a floating preview ────────────────────────────────────
// Figma "Work · v0" → "02 · Índice": Nº · Proyecto · Disciplina · Cliente /
// estudio · Año. On pointer devices a thumbnail follows the cursor over rows
// that have a cover (plus a small "Name · Year" label). On touch devices each
// row shows its own small fixed thumbnail instead. NDA rows: name and client
// blurred, NDA pill, no link and no preview.
export type IndexRow = {
  key: string
  n: string
  name: string
  discipline: string
  client: string
  year: string
  href?: string
  nda?: boolean
  cover?: Img
}

export default function HoverIndex({ rows, head = true, label }: { rows: IndexRow[]; head?: boolean; label?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const floatRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const raf = useRef<number>(0)

  // Follow the cursor with a little easing (instant with reduced motion).
  useEffect(() => {
    if (active === null) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const loop = () => {
      const p = pos.current
      const k = reduce ? 1 : 0.22
      p.x += (p.tx - p.x) * k
      p.y += (p.ty - p.y) * k
      const el = floatRef.current
      if (el) el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [active])

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const W = 400, H = 272, GAP = 24
    let tx = e.clientX + GAP
    let ty = e.clientY - H / 2
    if (tx + W > window.innerWidth - 16) tx = e.clientX - W - GAP
    ty = Math.max(16, Math.min(ty, window.innerHeight - H - 40))
    const p = pos.current
    if (active === null) { p.x = tx; p.y = ty }
    p.tx = tx
    p.ty = ty
  }

  const current = active !== null ? rows[active] : null

  return (
    <div className={s.index} onPointerMove={onMove} onPointerLeave={() => setActive(null)} aria-label={label}>
      {head && (
        <div className={clsx(s.row, s.head)} aria-hidden="true">
          <span>Nº</span>
          <span>Proyecto</span>
          <span className={s.colDisc}>Disciplina</span>
          <span className={s.colClient}>Cliente / estudio</span>
          <span className={s.colYear}>Año</span>
        </div>
      )}
      <ol className={s.list}>
        {rows.map((r, i) => {
          const inner = (
            <>
              <span className={s.n}>{r.n}</span>
              <span className={s.name}>
                <span className={clsx(r.nda && s.blur)}>{r.name}</span>
                {r.nda && <span className={s.pill}>NDA</span>}
                {r.href && <span className={s.arrow} aria-hidden="true">↗</span>}
              </span>
              <span className={clsx(s.cell, s.colDisc)}>{r.discipline}</span>
              <span className={clsx(s.cell, s.colClient, r.nda && s.blur)}>{r.client}</span>
              <span className={clsx(s.cell, s.colYear)}>{r.year}</span>
              {r.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={s.touchThumb} src={r.cover.src} width={r.cover.w} height={r.cover.h} alt="" loading="lazy" decoding="async" />
              )}
            </>
          )
          return (
            <li
              key={r.key}
              className={clsx(s.item, active === i && s.on)}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse' && r.cover) setActive(i); else setActive(null) }}
            >
              {r.href ? (
                <Link href={r.href} className={s.row} onFocus={() => r.cover && setActive(null)}>
                  {inner}
                </Link>
              ) : (
                <div className={s.row} aria-label={r.nda ? `${r.discipline}, ${r.year} · proyecto bajo NDA` : undefined}>
                  {inner}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <div ref={floatRef} className={clsx(s.float, current && s.floatOn)} aria-hidden="true">
        {rows.map((r, i) =>
          r.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={r.key} src={r.cover.src} alt="" className={clsx(s.floatImg, active === i && s.floatImgOn)} loading="lazy" decoding="async" />
          ) : null,
        )}
        {current && <span className={s.floatLabel}>{current.name} · {current.year}</span>}
      </div>
    </div>
  )
}
