'use client'

import { useEffect, useRef } from 'react'
import s from './wip.module.scss'

export type TrailItem = { src: string; r: number } // r = width / height

// Cursor trail for the WIP landing: moving the mouse drops feed pieces along
// the path. A shuffled queue shows every piece once before any repeats; the
// next pieces are decoded ahead, and a piece that is not ready yet is simply
// waited for (the trail skips a beat rather than breaking the order). One pool
// of POOL <img> nodes, reused oldest first, so never more than POOL on screen.
// Only transform / opacity animate (Web Animations API). Touch: a tap drops
// one piece. Reduced motion: nothing is mounted.

const POOL = 7
const AHEAD = 6
const LIFE = 1100 // ms: in 0–18 %, hold to 58 %, out to 100 %
const EASE_IN = 'cubic-bezier(0.19, 1, 0.22, 1)'
const EASE_OUT = 'cubic-bezier(0.55, 0, 0.75, 0.2)'

function shuffle(n: number, avoidFirst?: number) {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  // No back-to-back repeat across two rounds.
  if (n > 1 && a[0] === avoidFirst) [a[0], a[n - 1]] = [a[n - 1], a[0]]
  return a
}

export default function CursorTrail({ items }: { items: TrailItem[] }) {
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = layer.current
    if (!root || !items.length) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let teardown: (() => void) | null = null

    const start = () => {
      // ── Pool ──
      const nodes = Array.from({ length: POOL }, () => {
        const img = document.createElement('img')
        img.className = s.piece
        img.alt = ''
        img.decoding = 'async'
        img.draggable = false
        root.appendChild(img)
        return { img, anim: null as Animation | null }
      })
      let slot = 0
      let z = 1

      // ── Queue + look-ahead decoding ──
      let order = shuffle(items.length)
      let qi = 0
      const state = new Map<string, 'loading' | 'ready' | 'failed'>()
      const preload = () => {
        for (let k = 0; k < AHEAD && qi + k < order.length; k++) {
          const { src } = items[order[qi + k]]
          if (state.has(src)) continue
          state.set(src, 'loading')
          const im = new Image()
          im.decoding = 'async'
          im.src = src
          im.decode().then(
            () => state.set(src, 'ready'),
            () => state.set(src, 'failed'),
          )
        }
      }
      const advance = () => {
        qi++
        if (qi >= order.length) {
          order = shuffle(items.length, order[order.length - 1])
          qi = 0
        }
        preload()
      }
      // The next piece if it is decoded; failed ones are dropped from the round.
      const take = (): TrailItem | null => {
        for (let guard = 0; guard < items.length; guard++) {
          const it = items[order[qi]]
          const st = state.get(it.src)
          if (st === 'failed') { advance(); continue }
          if (st !== 'ready') return null
          advance()
          return it
        }
        return null
      }
      preload()

      const spawn = (x: number, y: number, touch: boolean) => {
        const it = take()
        if (!it) return
        const vw = window.innerWidth
        const base = touch ? Math.min(200, Math.max(140, vw * 0.38)) : Math.min(220, Math.max(130, vw * 0.12))
        let w = it.r >= 1 ? base * 1.15 : base
        let h = w / it.r
        if (h > base * 1.6) { h = base * 1.6; w = h * it.r }
        const n = nodes[slot]
        slot = (slot + 1) % POOL
        n.anim?.cancel()
        n.img.src = it.src
        n.img.style.width = `${Math.round(w)}px`
        n.img.style.height = `${Math.round(h)}px`
        n.img.style.zIndex = String(z++)
        const t = `translate3d(${Math.round(x - w / 2)}px, ${Math.round(y - h / 2)}px, 0)`
        n.anim = n.img.animate(
          [
            { opacity: 0, transform: `${t} scale(0.72)`, easing: EASE_IN },
            { opacity: 1, transform: `${t} scale(1)`, offset: 0.18 },
            { opacity: 1, transform: `${t} scale(1)`, offset: 0.58, easing: EASE_OUT },
            { opacity: 0, transform: `${t} scale(0.86)` },
          ],
          { duration: LIFE, fill: 'forwards' },
        )
      }

      // ── Mouse: one piece per stretch of travelled distance ──
      let lx = 0, ly = 0, has = false, dist = 0
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        if (!has) { lx = e.clientX; ly = e.clientY; has = true; return }
        dist += Math.hypot(e.clientX - lx, e.clientY - ly)
        lx = e.clientX; ly = e.clientY
        const step = Math.min(140, Math.max(80, window.innerWidth * 0.07))
        if (dist >= step) {
          dist = 0
          spawn(e.clientX, e.clientY, false)
        }
      }
      const onLeave = () => { has = false; dist = 0 }

      // ── Touch / pen: a tap (short, still) drops one piece ──
      let down: { x: number; y: number; t: number } | null = null
      const onDown = (e: PointerEvent) => {
        if (e.pointerType === 'mouse') return
        down = { x: e.clientX, y: e.clientY, t: performance.now() }
      }
      const onUp = (e: PointerEvent) => {
        if (e.pointerType === 'mouse' || !down) return
        const still = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && performance.now() - down.t < 500
        down = null
        if (still) spawn(e.clientX, e.clientY, true)
      }
      const onCancel = () => { down = null }

      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', onDown, { passive: true })
      window.addEventListener('pointerup', onUp, { passive: true })
      window.addEventListener('pointercancel', onCancel, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)

      return () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerdown', onDown)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        document.documentElement.removeEventListener('pointerleave', onLeave)
        nodes.forEach((n) => { n.anim?.cancel(); n.img.remove() })
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
  }, [items])

  return <div ref={layer} className={s.trail} aria-hidden="true" />
}
