'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import type { FeedItem } from '@/content/feed'
import type { TrailItem } from './trail/deck'
import { TRAIL_IDS, TRAIL_NAMES, type TrailId } from './trail/variants'
import type { OrbMode } from './bg/orb'
import TrailHint from './TrailHint'
import s from './wip.module.scss'

// What sits behind the WIP copy. Default (production): the feed plane
// (CanvasBackdrop). Previews compare with
//   ?bg=plane | sphere | tunnel | lens   (WebGL backgrounds)
//   ?trail=1…5                          (the earlier cursor trails, no bg)
// and get a mono switcher; nothing of it renders without a parameter. Each
// option is code-split, so the default bundle only carries the plane.
const CanvasBackdrop = dynamic(() => import('./CanvasBackdrop'), { ssr: false })
const OrbBackdrop = dynamic(() => import('./bg/OrbBackdrop'), { ssr: false })
const CursorTrail = dynamic(() => import('./trail/CursorTrail'), { ssr: false })

const BGS = ['plane', 'sphere', 'tunnel', 'lens'] as const
type Bg = (typeof BGS)[number]
type Mode = { kind: 'bg'; bg: Bg } | { kind: 'trail'; n: TrailId }
const BG_NAMES: Record<Bg, string> = { plane: 'Plane', sphere: 'Sphere', tunnel: 'Tunnel', lens: 'Lens' }
export const DEFAULT_BG: Bg = 'plane'

function readMode(): { mode: Mode; compare: boolean } {
  const q = new URLSearchParams(window.location.search)
  const t = Number(q.get('trail'))
  if ((TRAIL_IDS as number[]).includes(t)) return { mode: { kind: 'trail', n: t as TrailId }, compare: true }
  const b = q.get('bg') as Bg | null
  if (b && BGS.includes(b)) return { mode: { kind: 'bg', bg: b }, compare: true }
  return { mode: { kind: 'bg', bg: DEFAULT_BG }, compare: false }
}

export default function Backdrop({ feed, trail, hint }: { feed: FeedItem[]; trail: TrailItem[]; hint: { mouse: string; touch: string } }) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [compare, setCompare] = useState(false)

  useEffect(() => {
    const r = readMode()
    setMode(r.mode)
    setCompare(r.compare)
  }, [])

  const pick = (m: Mode) => {
    setMode(m)
    const url = new URL(window.location.href)
    url.searchParams.delete('bg'); url.searchParams.delete('trail')
    if (m.kind === 'bg') url.searchParams.set('bg', m.bg)
    else url.searchParams.set('trail', String(m.n))
    window.history.replaceState(window.history.state, '', url)
  }

  if (!mode) return null
  return (
    <>
      {mode.kind === 'bg' && mode.bg === 'plane' && <CanvasBackdrop items={feed} />}
      {mode.kind === 'bg' && mode.bg !== 'plane' && <OrbBackdrop key={mode.bg} items={feed} mode={mode.bg as OrbMode} />}
      {mode.kind === 'trail' && <><CursorTrail key={mode.n} items={trail} variant={mode.n} /><TrailHint mouse={hint.mouse} touch={hint.touch} /></>}
      {compare && createPortal(
        <div className={s.switcher} role="group" aria-label="Background">
          <span className={s.switcherLabel}>Bg</span>
          {BGS.map((b) => (
            <button key={b} type="button" className={s.switcherBtn} data-no-transition
              aria-pressed={mode.kind === 'bg' && mode.bg === b} onClick={() => pick({ kind: 'bg', bg: b })}>
              {BG_NAMES[b]}{b === DEFAULT_BG ? ' ★' : ''}
            </button>
          ))}
          <span className={s.switcherLabel}>Trail</span>
          {TRAIL_IDS.map((n) => (
            <button key={n} type="button" className={s.switcherBtn} data-no-transition
              aria-pressed={mode.kind === 'trail' && mode.n === n} onClick={() => pick({ kind: 'trail', n })}>
              {n} · {TRAIL_NAMES[n]}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
