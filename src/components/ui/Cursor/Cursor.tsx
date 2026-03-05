'use client'

import { useEffect, useRef } from 'react'
import s from './Cursor.module.scss'

// Arrow shape — stroked, tip at (0,0) — misma geometría que biakone.com
function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  col: string,
  alpha: number,
) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = col
  ctx.lineWidth = 1.2
  ctx.translate(x, y)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 16)
  ctx.lineTo(3.5, 11.5)
  ctx.lineTo(7, 18)
  ctx.lineTo(9, 17)
  ctx.lineTo(5.5, 10.5)
  ctx.lineTo(11, 10.5)
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

export default function Cursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Solo en dispositivos con ratón/trackpad
    if (!window.matchMedia('(pointer: fine)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width  = innerWidth
      canvas.height = innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Posición del ratón
    let mx = innerWidth / 2, my = innerHeight / 2
    let lx = mx, ly = my
    let idle = 0, ig = 0 // ig = intensidad del glitch (0→1)

    // Posiciones independientes por canal — easing diferente = separación cromática
    let rx = mx, ry = my // rojo   — más lento (más lag)
    let gx = mx, gy = my // verde
    let bx = mx, by = my // azul
    let wx = mx, wy = my // blanco — cursor principal

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
    }
    document.addEventListener('mousemove', onMove)

    let rafId: number

    const loop = () => {
      // Detección de idle
      const moved = Math.abs(mx - lx) > 0.1 || Math.abs(my - ly) > 0.1
      moved ? (idle = 0) : idle++
      lx = mx; ly = my

      // ig sube suavemente cuando llevas >40 frames sin mover
      ig += ((idle > 40 ? 1 : 0) - ig) * 0.04

      // Jitter por canal (solo activo con ig > 0)
      const jx = ig * (Math.random() - 0.5) * 3
      const jy = ig * (Math.random() - 0.5) * 3

      // Cada canal lerp al ratón a velocidad distinta → separación RGB en movimiento
      rx += (mx - rx) * 0.55
      ry += (my - ry) * 0.55
      gx += (mx - gx) * 0.72
      gy += (my - gy) * 0.72
      bx += (mx - bx) * 0.88
      by += (my - by) * 0.88
      wx += (mx - wx) * 0.68
      wy += (my - wy) * 0.68

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Rojo — lag máximo + jitter fuerte
      drawArrow(
        ctx,
        rx + jx * 1.5 + ig * (Math.random() - 0.5) * 2,
        ry + jy * 1.5 + ig * (Math.random() - 0.5) * 2,
        '#ff0033',
        0.55 + ig * 0.3,
      )
      // Verde
      drawArrow(ctx, gx + jx * 0.5, gy + jy * 0.5, '#00ff88', 0.3 + ig * 0.2)
      // Azul — jitter invertido (opuesto al rojo)
      drawArrow(
        ctx,
        bx - jx * 1.2 + ig * (Math.random() - 0.5) * 2,
        by - jy * 1.2 + ig * (Math.random() - 0.5) * 2,
        '#003dff',
        0.6 + ig * 0.3,
      )
      // Blanco — cursor principal
      drawArrow(
        ctx,
        wx + (Math.random() - 0.5) * ig * 2,
        wy + (Math.random() - 0.5) * ig * 2,
        '#fcfcf7',
        0.5 + ig * 0.2,
      )

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      document.removeEventListener('mousemove', onMove)
    }
  }, [])

  return <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
}
