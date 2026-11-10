'use client'

import { useRef, useEffect } from 'react'

interface Props {
  className?: string
}

export default function ElasticLine({ className }: Props) {
  const svgRef  = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const svg  = svgRef.current
    const path = pathRef.current
    if (!svg || !path) return

    // Spring state
    let y  = 0, vy = 0
    let cpx    = 0
    let target = 0
    let w      = 0
    let straight = true

    // Física de muelle correcta:
    // DAMPING = retención de velocidad por frame (0.93 = 7% pérdida → oscila)
    // Con 0.52 la velocidad muere en 3-4 frames → sin rebote visible
    const SPRING_K  = 0.06   // fuerza restauradora
    const DAMPING   = 0.93   // retención por frame — underdamped → oscila
    const PROXIMITY = 55     // px zona de detección vertical
    const MAX_DISP  = 26     // px máximo de target (y puede superarlo en el rebote)

    // Velocidad del ratón para impulso proporcional
    let lastMouseY = 0, lastTime = 0, mouseVY = 0
    let wasNear = false

    // Layout width, not getBoundingClientRect(): a parent may be mid-transform
    // at mount (the WIP intro scales the header line in from scaleX(0)) and the
    // transformed width would freeze the path short. ResizeObserver reports
    // the untransformed content box and fires again on every layout change.
    const measure = (next?: number) => {
      const nw = next ?? svg.clientWidth
      if (!nw || nw === w) return
      w = nw
      if (straight) path.setAttribute('d', `M 0 0.5 L ${w} 0.5`)
    }
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((entries) => measure(entries[0]?.contentRect.width))
      : null
    ro?.observe(svg)

    const onMove = (e: MouseEvent) => {
      // Calcula velocidad Y del ratón (px/ms)
      const now = Date.now()
      const dt  = now - lastTime
      if (dt > 0 && dt < 80) mouseVY = (e.clientY - lastMouseY) / dt
      lastMouseY = e.clientY
      lastTime   = now

      const rect  = svg.getBoundingClientRect()
      const lineY = rect.top + 0.5
      const distY = e.clientY - lineY
      const inX   = e.clientX >= rect.left && e.clientX <= rect.right
      const near  = inX && Math.abs(distY) < PROXIMITY

      if (near) {
        cpx    = e.clientX - rect.left
        target = Math.max(-MAX_DISP, Math.min(MAX_DISP, distY * 0.8))
      } else {
        if (wasNear) {
          // Cursor acaba de salir: inyecta impulso proporcional a la velocidad
          // → pase suave = rebote suave / pase rápido = rebote mayor
          vy += mouseVY * 0.35
        }
        target = 0
      }
      wasNear = near
    }

    window.addEventListener('mousemove', onMove)
    const onResize = () => measure()
    window.addEventListener('resize', onResize)

    let rafId: number

    const tick = () => {
      vy += (target - y) * SPRING_K
      vy *= DAMPING
      y  += vy

      const flat = Math.abs(y) < 0.08 && Math.abs(vy) < 0.05

      if (!flat) {
        straight = false
        path.setAttribute('d', `M 0 0.5 Q ${cpx} ${0.5 + y} ${w} 0.5`)
      } else if (!straight) {
        straight = true
        y = 0; vy = 0
        path.setAttribute('d', `M 0 0.5 L ${w} 0.5`)
      }

      rafId = requestAnimationFrame(tick)
    }

    measure()
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '1px', overflow: 'visible' }}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d="M 0 0.5 L 1 0.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  )
}
