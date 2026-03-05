'use client'

import { useEffect } from 'react'
import Lenis from '@studio-freight/lenis'

// Expo ease — smooth exponential deceleration (awwwards standard)
const easeExpo = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const lenis = new Lenis({
      // lerp mode — buttery interpolation, the awwwards signature feel.
      // Lower values = smoother/slower catchup. 0.08 is the sweet spot.
      lerp: 0.08,
      easing: easeExpo,
      smoothWheel: true,
      wheelMultiplier: 0.9, // slightly dampen wheel for premium feel
      touchMultiplier: 1.5, // compensate on mobile
    })

    // Exponer la instancia globalmente para acceso desde GSAP ScrollTrigger
    // o desde cualquier componente que lo necesite
    ;(window as unknown as Record<string, unknown>).lenis = lenis

    let rafId: number
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
      cancelAnimationFrame(rafId)
      delete (window as unknown as Record<string, unknown>).lenis
    }
  }, [])

  return <>{children}</>
}
