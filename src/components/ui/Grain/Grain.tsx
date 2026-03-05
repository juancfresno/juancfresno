'use client'

import { useEffect, useRef } from 'react'
import s from './Grain.module.scss'

const TILE_SIZE = 128  // offscreen canvas dimension
const TARGET_FPS = 18  // fotogramas por segundo — sutil, no agresivo

export default function Grain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Tile offscreen — sólo regeneramos este pequeño canvas en cada frame
    const tile    = document.createElement('canvas')
    tile.width    = TILE_SIZE
    tile.height   = TILE_SIZE
    const tCtx    = tile.getContext('2d')!
    const imgData = tCtx.createImageData(TILE_SIZE, TILE_SIZE)
    const data    = imgData.data

    let rafId: number
    let lastTime  = 0
    const interval = 1000 / TARGET_FPS

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }

    const draw = (now: number) => {
      rafId = requestAnimationFrame(draw)
      if (now - lastTime < interval) return
      lastTime = now

      // Generar ruido aleatorio en el tile
      for (let i = 0; i < data.length; i += 4) {
        const v   = (Math.random() * 255) | 0
        data[i]   = v   // R
        data[i+1] = v   // G
        data[i+2] = v   // B
        data[i+3] = 255 // A — opacidad controlada por CSS
      }
      tCtx.putImageData(imgData, 0, 0)

      // Tilear el noise por todo el canvas
      const pattern = ctx.createPattern(tile, 'repeat')
      if (!pattern) return
      ctx.fillStyle = pattern
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })
    rafId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={s.grain}
      aria-hidden="true"
    />
  )
}
