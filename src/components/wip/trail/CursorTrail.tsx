'use client'

import { useEffect, useRef } from 'react'
import { createDeck, type TrailItem } from './deck'
import { BEHAVIOURS, type TrailId } from './variants'
import s from '../wip.module.scss'

export type { TrailItem }

// Cursor image trail (the social feed, 600 px thumbs). Since the canvas
// background became the default, the trails are a comparison mode only:
// `?trail=1…5` (wip/Backdrop.tsx picks it and shows the switcher).
// Shared rules: no repeats until every piece has shown (./deck.ts), ≤ ~7 on
// screen, transform/opacity only, one rAF loop that sleeps at rest, nothing
// loads before the first pointer event or idle time, touch = a tap drops one
// piece, prefers-reduced-motion = nothing is mounted.

export default function CursorTrail({ items, variant }: { items: TrailItem[]; variant: TrailId }) {
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = layer.current
    if (!root || !items.length) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const deck = createDeck(items)
    let teardown: (() => void) | null = null

    const start = () => {
      const b = BEHAVIOURS[variant]({
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

  return <div ref={layer} className={s.trail} aria-hidden="true" />
}
