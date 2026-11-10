'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import type { FeedItem } from '@/content/feed'
import { createDeck, type TrailItem } from './deck'
import { BEHAVIOURS, TRAIL_IDS, TRAIL_NAMES, type TrailId } from './variants'
import s from '../wip.module.scss'

export type { TrailItem }

// 6 · Canvas: loaded only when picked, so the default bundle has no WebGL code.
const CanvasBackdrop = dynamic(() => import('../CanvasBackdrop'), { ssr: false })

// Cursor image trail of the WIP landing (the social feed, 600 px thumbs).
// Five variants live in ./variants.ts; production shows DEFAULT_TRAIL. A
// preview can compare them with `?trail=1…6` (6 = the feed canvas as background), which also shows a small mono
// switcher (never rendered without the parameter).
// Shared rules: no repeats until every piece has shown (./deck.ts), ≤ ~7 on
// screen, transform/opacity only, one rAF loop that sleeps at rest, nothing
// loads before the first pointer event or idle time, touch = a tap drops one
// piece, prefers-reduced-motion = nothing is mounted.

// 5 · Tail: Juan's Figma drawing (240 → 150 px, 100 → 25 %) with the delay.
export const DEFAULT_TRAIL: TrailId = 5

function readParam(): TrailId | null {
  const v = Number(new URLSearchParams(window.location.search).get('trail'))
  return (TRAIL_IDS as number[]).includes(v) ? (v as TrailId) : null
}

export default function CursorTrail({ items, canvasItems }: { items: TrailItem[]; canvasItems: FeedItem[] }) {
  const layer = useRef<HTMLDivElement>(null)
  const [variant, setVariant] = useState<TrailId>(DEFAULT_TRAIL)
  const [compare, setCompare] = useState(false)

  // ?trail=N → that variant + the switcher.
  useEffect(() => {
    const v = readParam()
    if (v) { setVariant(v); setCompare(true) }
  }, [])

  useEffect(() => {
    const root = layer.current
    if (!root || !items.length || variant === 6) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const deck = createDeck(items)
    let teardown: (() => void) | null = null

    const start = () => {
      const b = BEHAVIOURS[variant as Exclude<TrailId, 6>]({
        root,
        deck,
        cls: { piece: s.piece, grid: s.gridPiece, strip: s.strip, tint: s.tint },
      })
      let raf = 0
      let last = 0
      const loop = (now: number) => {
        const dt = Math.min(0.034, last ? (now - last) / 1000 : 1 / 60)
        last = now
        raf = b.frame(now, dt) ? requestAnimationFrame(loop) : 0
        if (!raf) last = 0
      }
      const kick = () => { if (!raf) raf = requestAnimationFrame(loop) }

      // Lazy: nothing loads until the first pointer event, or idle time.
      const idle = window.setTimeout(() => deck.wake(), 2500)

      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        deck.wake()
        b.move(e.clientX, e.clientY, performance.now())
        kick()
      }
      const onLeave = () => b.leave()
      let down: { x: number; y: number; t: number } | null = null
      const onDown = (e: PointerEvent) => {
        deck.wake()
        if (e.pointerType === 'mouse') return
        down = { x: e.clientX, y: e.clientY, t: performance.now() }
      }
      const onUp = (e: PointerEvent) => {
        if (e.pointerType === 'mouse' || !down) return
        const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && performance.now() - down.t < 500
        down = null
        // A tap on a link, button or the headline (it cycles languages) is theirs.
        if (!tap || (e.target as Element | null)?.closest?.('a, button, [tabindex]')) return
        b.tap(e.clientX, e.clientY, performance.now())
        kick()
      }
      const onCancel = () => { down = null }

      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', onDown, { passive: true })
      window.addEventListener('pointerup', onUp, { passive: true })
      window.addEventListener('pointercancel', onCancel, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)

      return () => {
        window.clearTimeout(idle)
        cancelAnimationFrame(raf)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerdown', onDown)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        document.documentElement.removeEventListener('pointerleave', onLeave)
        b.destroy()
      }
    }

    const sync = () => {
      teardown?.()
      teardown = mq.matches ? null : start()
    }
    sync()
    mq.addEventListener('change', sync)
    return () => {
      mq.removeEventListener('change', sync)
      teardown?.()
    }
  }, [items, variant])

  const pick = (v: TrailId) => {
    setVariant(v)
    const url = new URL(window.location.href)
    url.searchParams.set('trail', String(v))
    window.history.replaceState(window.history.state, '', url)
  }

  return (
    <>
      <div ref={layer} className={s.trail} aria-hidden="true" />
      {variant === 6 && <CanvasBackdrop items={canvasItems} />}
      {compare && createPortal(
        <div className={s.switcher} role="group" aria-label="Cursor trail">
          <span className={s.switcherLabel}>Trail</span>
          {TRAIL_IDS.map((v) => (
            <button
              key={v}
              type="button"
              className={s.switcherBtn}
              aria-pressed={v === variant}
              onClick={() => pick(v)}
              data-no-transition
            >
              {v} · {TRAIL_NAMES[v]}{v === DEFAULT_TRAIL ? ' ★' : ''}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
