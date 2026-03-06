'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import s from './InfiniteGallery.module.scss'

// ═══════════════════════════════════════════════════════════════════════════════
// Gallery items — placeholder cards with colored rectangles
// ═══════════════════════════════════════════════════════════════════════════════
const COLORS = ['#003dff', '#D5F936', '#8DF8CD', '#FFFFE6', '#c6dbf9', '#ff6b35', '#a855f7', '#ddedff']

interface GalleryItem {
  id: number
  label: string
  color: string
  width: number
  height: number
}

function generateItems(): GalleryItem[] {
  const labels = [
    'Visual Exploration', 'Type Study', 'Color System', 'Motion Test',
    'Grid Layout', 'Brand Sketch', 'UI Concept', 'Texture Pack',
    'Icon Set', 'Poster Draft', 'Gradient Map', 'Comp Study',
    'Photo Edit', 'Logo Variant', 'Pattern Tile', 'Mood Board',
    '3D Render', 'Illustration', 'Data Viz', 'Micro Animation',
    'Lettering', 'Collage', 'Print Layout', 'Web Concept',
  ]

  const sizes: [number, number][] = [
    [240, 320], [280, 200], [200, 280], [320, 240],
    [260, 260], [300, 200], [220, 300], [280, 280],
  ]

  return labels.map((label, i) => ({
    id: i,
    label,
    color: COLORS[i % COLORS.length],
    width: sizes[i % sizes.length][0],
    height: sizes[i % sizes.length][1],
  }))
}

const ITEMS = generateItems()

// Grid config
const COLS = 6
const ROWS = 4
const GAP = 16
const CELL_W = 320 + GAP
const CELL_H = 340 + GAP
const TILE_W = COLS * CELL_W
const TILE_H = ROWS * CELL_H

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function InfiniteGallery() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [viewport, setViewport] = useState({ w: 1680, h: 900 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const offsetStart = useRef({ x: 0, y: 0 })
  const velocity = useRef({ x: 0, y: 0 })
  const lastMouse = useRef({ x: 0, y: 0, t: 0 })
  const rafId = useRef<number>(0)

  // ── Read viewport safely after mount ─────────────────────────────────────
  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── Momentum physics ─────────────────────────────────────────────────────
  const animateMomentum = useCallback(() => {
    const FRICTION = 0.94
    const MIN_SPEED = 0.5

    const tick = () => {
      velocity.current.x *= FRICTION
      velocity.current.y *= FRICTION

      if (
        Math.abs(velocity.current.x) < MIN_SPEED &&
        Math.abs(velocity.current.y) < MIN_SPEED
      ) {
        velocity.current = { x: 0, y: 0 }
        return
      }

      setOffset((prev) => ({
        x: prev.x + velocity.current.x,
        y: prev.y + velocity.current.y,
      }))

      rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)
  }, [])

  // ── Pointer handlers ─────────────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true
      cancelAnimationFrame(rafId.current)
      velocity.current = { x: 0, y: 0 }

      dragStart.current = { x: e.clientX, y: e.clientY }
      offsetStart.current = { ...offset }
      lastMouse.current = { x: e.clientX, y: e.clientY, t: Date.now() }

      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [offset]
  )

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return

    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y

    setOffset({
      x: offsetStart.current.x + dx,
      y: offsetStart.current.y + dy,
    })

    const now = Date.now()
    const dt = now - lastMouse.current.t || 1
    velocity.current = {
      x: ((e.clientX - lastMouse.current.x) / dt) * 16,
      y: ((e.clientY - lastMouse.current.y) / dt) * 16,
    }
    lastMouse.current = { x: e.clientX, y: e.clientY, t: now }
  }, [])

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    animateMomentum()
  }, [animateMomentum])

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => cancelAnimationFrame(rafId.current)
  }, [])

  // ── Compute visible cells with infinite tiling ────────────────────────────
  const { w: viewW, h: viewH } = viewport
  const tilesX = Math.ceil(viewW / TILE_W) + 2
  const tilesY = Math.ceil(viewH / TILE_H) + 2

  const baseX = ((offset.x % TILE_W) + TILE_W) % TILE_W
  const baseY = ((offset.y % TILE_H) + TILE_H) % TILE_H

  const positioned: { item: GalleryItem; x: number; y: number; key: string }[] = []

  for (let ty = -1; ty < tilesY; ty++) {
    for (let tx = -1; tx < tilesX; tx++) {
      ITEMS.slice(0, COLS * ROWS).forEach((item, idx) => {
        const col = idx % COLS
        const row = Math.floor(idx / COLS)
        const x = baseX + tx * TILE_W + col * CELL_W
        const y = baseY + ty * TILE_H + row * CELL_H

        if (x + item.width < -100 || x > viewW + 100) return
        if (y + item.height < -100 || y > viewH + 100) return

        positioned.push({ item, x, y, key: `${tx}-${ty}-${idx}` })
      })
    }
  }

  return (
    <div
      ref={canvasRef}
      className={s.canvas}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {positioned.map(({ item, x, y, key }) => (
        <div
          key={key}
          className={s.card}
          style={{
            transform: `translate(${x}px, ${y}px)`,
            width: item.width,
            height: item.height,
          }}
        >
          <div
            className={s.cardMedia}
            style={{ backgroundColor: item.color }}
          />
          <span className={s.cardLabel}>{item.label}</span>
        </div>
      ))}

      <div className={s.hint}>
        <span>drag to explore</span>
      </div>
    </div>
  )
}
