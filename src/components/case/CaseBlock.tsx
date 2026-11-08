'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Img, Note } from '@/content/cases'
import s from './case.module.scss'
import v from '@/components/blocks/v0.module.scss'

// ─── Behance block ────────────────────────────────────────────────────────────
// One continuous column: every image in Behance order, content width, gap 0,
// no captions, no cropping (intrinsic aspect ratio). When the case has
// annotations (Shoeciety v0), a "Notes: ON/OFF" toggle draws them over it.
// Note coordinates come from Figma (block 1552 px wide), so they are placed in
// percentages of the block and scale with it.
const BLOCK_W = 1552

export default function CaseBlock({ images, title, notes }: { images: Img[]; title: string; notes?: { blockHeight: number; items: Note[] } }) {
  const [on, setOn] = useState(true)
  const H = notes?.blockHeight ?? 1
  const px = (x: number) => `${(x / BLOCK_W) * 100}%`
  const py = (y: number) => `${(y / H) * 100}%`

  return (
    <section className={s.blockWrap} aria-label={`${title}: project images`}>
      {notes && (
        <div className={s.notesBar}>
          <div className={v.segmented} role="group" aria-label="Notes over the images">
            <span>Notes:</span>
            <span className={v.segment}>
              <button type="button" aria-pressed={on} onClick={() => setOn(true)}>ON</button>
              <button type="button" aria-pressed={!on} onClick={() => setOn(false)}>OFF</button>
            </span>
          </div>
        </div>
      )}

      <div className={s.block} data-block>
        {images.map((img, i) => (
          <Image
            key={img.src}
            src={img.src}
            width={img.w}
            height={img.h}
            alt={i === 0 ? title : ''}
            className={s.blockImg}
            sizes="(max-width: 768px) 100vw, calc(100vw - 8rem)"
            loading={i < 1 ? 'eager' : 'lazy'}
            priority={false}
            unoptimized
          />
        ))}

        {notes && on && (
          <div className={s.notes}>
            <svg className={s.lines} viewBox={`0 0 ${BLOCK_W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
              {notes.items.map((n) => (
                <line key={n.title} x1={n.dot[0]} y1={n.dot[1]} x2={n.end[0]} y2={n.end[1]} vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
            {notes.items.map((n) => (
              <span key={`d-${n.title}`} className={s.dot} style={{ left: px(n.dot[0]), top: py(n.dot[1]) }} aria-hidden="true" />
            ))}
            {notes.items.map((n) => (
              <aside key={`c-${n.title}`} className={s.note} style={{ left: px(n.card[0]), top: py(n.card[1]) }}>
                <p className={s.noteTitle}>{n.title}</p>
                <p className={s.noteText}>{n.text}</p>
              </aside>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
