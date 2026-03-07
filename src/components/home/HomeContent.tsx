'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
  const mediaRef = useRef<HTMLDivElement>(null)
  const prevImgRef = useRef<string | null>(null)
  const swapTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const endTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Parallax effect on the media column
  useMouseParallax(mediaRef)

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

  return (
    <div className={s.homePage}>
      {/* ── Hero: 50 / 50 grid ──────────────────────────────── */}
      <div className={s.heroGrid}>
        {/* Left — text content */}
        <div className={s.textCol}>
          <HeroIntro />
          <HeroCategories onCategoryHover={handleCategoryHover} />
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
    </div>
  )
}
