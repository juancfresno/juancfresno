'use client'

import { useState, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from 'react'
import Image from 'next/image'
import HeroIntro from '@/components/home/HeroIntro/HeroIntro'
import HeroCategories from '@/components/home/HeroCategories/HeroCategories'
import SocialFeed from '@/components/home/SocialFeed/SocialFeed'
import type { FeedItem } from '@/lib/feeds/types'
import s from './HomeContent.module.scss'

// Map each category index to a carousel image
const CATEGORY_IMAGES = [
  '/images/carousel-1.jpg', // Art direction
  '/images/carousel-2.jpg', // Visual Design
  '/images/carousel-3.jpg', // Interaction
  '/images/carousel-4.jpg', // Brand Identity
  '/images/carousel-5.jpg', // Strategy
  '/images/carousel-6.jpg', // Develop
]

// ─── Color dot themes ───────────────────────────────────────────────────────
const COLOR_DOTS = [
  { color: '#C6DBF9', textColor: '#10100e' },  // Light blue
  { color: '#8DF8CD', textColor: '#10100e' },  // Mint green
] as const

// ─── Pixel expansion config ─────────────────────────────────────────────────
const PIXEL_CELL = 18         // px — size of each expanding pixel block
const EXPAND_MS  = 550        // ms — duration of the pixel fill animation
const COLLAPSE_MS = 500       // ms — duration of the pixel clear animation

// ─── Fisher-Yates shuffle ───────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Get cells sorted by distance from origin (radial expansion) ────────────
function getCellsFromPoint(
  W: number, H: number, originX: number, originY: number,
): { c: number; r: number }[] {
  const cols = Math.ceil(W / PIXEL_CELL)
  const rows = Math.ceil(H / PIXEL_CELL)
  const oc = Math.floor(originX / PIXEL_CELL)
  const or_ = Math.floor(originY / PIXEL_CELL)

  const cells = Array.from({ length: cols * rows }, (_, i) => ({
    c: i % cols,
    r: Math.floor(i / cols),
  }))

  // Sort by distance from origin cell, with slight randomization for organic feel
  cells.sort((a, b) => {
    const da = Math.hypot(a.c - oc, a.r - or_)
    const db = Math.hypot(b.c - oc, b.r - or_)
    return da - db + (Math.random() - 0.5) * 2.5
  })

  return cells
}

// ─── Edge distortion threshold (fraction from edge where effect activates) ──
const EDGE_ZONE = 0.15 // 15% from each edge

// ─── Mouse parallax + edge distortion hook ──────────────────────────────────
// Sets --mx, --my (parallax), --edge-x, --edge-y (edge proximity 0→1),
// and --edge-active (0 or 1) CSS custom properties.
function useMouseParallax(
  ref: React.RefObject<HTMLElement | null>,
  strength = 15,
) {
  const rafRef = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const nx = (e.clientX - rect.left) / rect.width   // 0 → 1
        const ny = (e.clientY - rect.top) / rect.height    // 0 → 1
        const x = (nx - 0.5) * 2  // -1 → 1
        const y = (ny - 0.5) * 2

        // Parallax
        el.style.setProperty('--mx', `${x * strength}px`)
        el.style.setProperty('--my', `${y * strength}px`)

        // Edge proximity: 0 at center → 1 at very edge
        const edgeX = Math.max(0, Math.max((EDGE_ZONE - nx) / EDGE_ZONE, (nx - (1 - EDGE_ZONE)) / EDGE_ZONE))
        const edgeY = Math.max(0, Math.max((EDGE_ZONE - ny) / EDGE_ZONE, (ny - (1 - EDGE_ZONE)) / EDGE_ZONE))
        const edgeStrength = Math.min(1, Math.max(edgeX, edgeY))

        el.style.setProperty('--edge-x', edgeX.toFixed(3))
        el.style.setProperty('--edge-y', edgeY.toFixed(3))
        el.style.setProperty('--edge-active', edgeStrength > 0 ? '1' : '0')
        el.style.setProperty('--edge-strength', edgeStrength.toFixed(3))
      })
    }

    const handleLeave = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        el.style.setProperty('--mx', '0px')
        el.style.setProperty('--my', '0px')
        el.style.setProperty('--edge-x', '0')
        el.style.setProperty('--edge-y', '0')
        el.style.setProperty('--edge-active', '0')
        el.style.setProperty('--edge-strength', '0')
      })
    }

    window.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [ref, strength])
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeContent({ feedItems }: { feedItems: FeedItem[] }) {
  const [hoveredCat, setHoveredCat] = useState<number | null>(null)
  const [displayedImg, setDisplayedImg] = useState<string | null>(null)
  const [isGlitching, setIsGlitching] = useState(false)
  const [activeTheme, setActiveTheme] = useState<number | null>(null) // index into COLOR_DOTS or null
  const mediaRef = useRef<HTMLDivElement>(null)
  const prevImgRef = useRef<string | null>(null)
  const swapTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const endTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const busyRef = useRef(false)
  const rafRef2 = useRef<number>(undefined)

  // Parallax effect on the media column
  useMouseParallax(mediaRef)

  // ── Pixel expansion animation (fill or clear) ────────────────────────────
  const animatePixels = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cells: { c: number; r: number }[],
      durationMs: number,
      mode: 'fill' | 'clear',
      fillColor: string,
    ): Promise<void> =>
      new Promise(resolve => {
        if (rafRef2.current) cancelAnimationFrame(rafRef2.current)
        let index = 0
        let t0: number | null = null

        const frame = (ts: number) => {
          if (!t0) t0 = ts
          const progress = Math.min((ts - t0) / durationMs, 1)
          const target = Math.floor(progress * cells.length)

          if (mode === 'fill') {
            ctx.fillStyle = fillColor
            while (index < target) {
              const { c, r } = cells[index++]
              ctx.fillRect(c * PIXEL_CELL, r * PIXEL_CELL, PIXEL_CELL, PIXEL_CELL)
            }
          } else {
            while (index < target) {
              const { c, r } = cells[index++]
              ctx.clearRect(c * PIXEL_CELL, r * PIXEL_CELL, PIXEL_CELL, PIXEL_CELL)
            }
          }

          if (progress < 1) {
            rafRef2.current = requestAnimationFrame(frame)
          } else {
            // Flush remaining
            if (mode === 'fill') {
              ctx.fillStyle = fillColor
              while (index < cells.length) {
                const { c, r } = cells[index++]
                ctx.fillRect(c * PIXEL_CELL, r * PIXEL_CELL, PIXEL_CELL, PIXEL_CELL)
              }
            } else {
              while (index < cells.length) {
                const { c, r } = cells[index++]
                ctx.clearRect(c * PIXEL_CELL, r * PIXEL_CELL, PIXEL_CELL, PIXEL_CELL)
              }
            }
            resolve()
          }
        }

        rafRef2.current = requestAnimationFrame(frame)
      }),
    []
  )

  // ── Handle dot click → pixel expand from dot, switch theme ────────────────
  const handleDotClick = useCallback(
    async (dotIndex: number, e: ReactMouseEvent<HTMLButtonElement>) => {
      if (busyRef.current) return
      busyRef.current = true

      const cvs = canvasRef.current
      if (!cvs) { busyRef.current = false; return }
      const ctx = cvs.getContext('2d')
      if (!ctx) { busyRef.current = false; return }

      const W = window.innerWidth
      const H = window.innerHeight
      cvs.width = W
      cvs.height = H
      cvs.style.pointerEvents = 'all'

      // Get dot position in viewport
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      const originX = rect.left + rect.width / 2
      const originY = rect.top + rect.height / 2

      if (activeTheme === dotIndex) {
        // Same dot → collapse back to default (dark theme)
        const cells = getCellsFromPoint(W, H, originX, originY)
        // First fill with current color, then clear
        ctx.fillStyle = COLOR_DOTS[dotIndex].color
        ctx.fillRect(0, 0, W, H)
        setActiveTheme(null)
        await animatePixels(ctx, shuffle(cells), COLLAPSE_MS, 'clear', '')
        cvs.style.pointerEvents = 'none'
      } else {
        // New dot → expand with new color
        const cells = getCellsFromPoint(W, H, originX, originY)
        const { color } = COLOR_DOTS[dotIndex]
        await animatePixels(ctx, cells, EXPAND_MS, 'fill', color)
        setActiveTheme(dotIndex)
        // Keep canvas filled — it's the new bg
        // After state update, the CSS theme class handles the actual bg,
        // so we can clear the canvas
        await new Promise(r => setTimeout(r, 60))
        ctx.clearRect(0, 0, W, H)
        cvs.style.pointerEvents = 'none'
      }

      busyRef.current = false
    },
    [activeTheme, animatePixels]
  )

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef2.current) cancelAnimationFrame(rafRef2.current)
    }
  }, [])

  // Handle category hover → glitch transition → swap image
  const handleCategoryHover = useCallback((index: number | null) => {
    setHoveredCat(index)
    const nextImg = index !== null ? CATEGORY_IMAGES[index] : null

    if (nextImg !== prevImgRef.current) {
      prevImgRef.current = nextImg

      // Clear pending timers
      if (swapTimerRef.current) clearTimeout(swapTimerRef.current)
      if (endTimerRef.current) clearTimeout(endTimerRef.current)

      // 1. Start glitch
      setIsGlitching(true)

      // 2. Swap image mid-glitch (at ~120ms — aligns with opacity-0 keyframe)
      swapTimerRef.current = setTimeout(() => {
        setDisplayedImg(nextImg)
      }, 120)

      // 3. End glitch (at ~450ms)
      endTimerRef.current = setTimeout(() => {
        setIsGlitching(false)
      }, 450)
    }
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (swapTimerRef.current) clearTimeout(swapTimerRef.current)
      if (endTimerRef.current) clearTimeout(endTimerRef.current)
    }
  }, [])

  const showVideo = hoveredCat === null

  // Active theme class + CSS custom properties for color inversion
  const themeClass = activeTheme !== null ? s.themed : ''
  const themeStyle = activeTheme !== null
    ? {
        '--theme-bg': COLOR_DOTS[activeTheme].color,
        '--theme-text': COLOR_DOTS[activeTheme].textColor,
      } as React.CSSProperties
    : undefined

  return (
    <div className={`${s.homePage} ${themeClass}`} style={themeStyle}>
      {/* ── Hero: 50 / 50 grid ──────────────────────────────── */}
      <div className={s.heroGrid}>
        {/* Left — text content */}
        <div className={s.textCol}>
          <HeroIntro />
          <HeroCategories onCategoryHover={handleCategoryHover} />

          {/* ── Color dots ── */}
          <div className={s.colorDots}>
            {COLOR_DOTS.map((dot, i) => (
              <button
                key={dot.color}
                className={`${s.colorDot} ${activeTheme === i ? s.colorDotActive : ''}`}
                style={{ '--dot-color': dot.color } as React.CSSProperties}
                onClick={(e) => handleDotClick(i, e)}
                aria-label={`Switch to ${dot.color} theme`}
              />
            ))}
          </div>
        </div>

        {/* Right — media (video default / category images on hover) */}
        <div className={s.mediaCol} ref={mediaRef}>
          <div className={s.mediaParallax}>
            <div
              className={`${s.mediaFrame} ${isGlitching ? s.glitching : ''}`}
            >
              {/* Default state: video showreel (poster fallback if no .mp4) */}
              <video
                className={`${s.video} ${showVideo ? s.visible : ''}`}
                src="/videos/hero-reel.mp4"
                poster="/images/hero-poster.jpg"
                autoPlay
                loop
                muted
                playsInline
              />

              {/* Hovered category image */}
              {displayedImg && (
                <div className={`${s.imgWrap} ${!showVideo ? s.visible : ''}`}>
                  <Image
                    src={displayedImg}
                    alt="Selected category"
                    fill
                    sizes="50vw"
                    className={s.img}
                    priority
                  />
                </div>
              )}

              {/* Scanlines — subtle CRT overlay */}
              <div className={s.scanlines} aria-hidden="true" />

              {/* Edge distortion — noise/grain intensifies near edges */}
              <div className={s.edgeDistortion} aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Dribbble carousel — full width, pushed to bottom ── */}
      <div className={s.feedWrap}>
        <SocialFeed items={feedItems} />
      </div>

      {/* ── Pixel expansion canvas (sits on top during transition) ── */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={s.pixelCanvas}
      />
    </div>
  )
}
