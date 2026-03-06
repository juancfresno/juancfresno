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

const DEFAULT_IMAGE = '/images/hero-poster.jpg'

// ─── Pixel decompose/recompose transition via Canvas ─────────────────────────
// Captures the old image on a canvas, progressively pixelates it (scaling down
// with imageSmoothingEnabled=false then scaling back up), then fades out the
// canvas to reveal the new <Image> underneath.
function usePixelTransition(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const animRef = useRef<number>(0)

  const run = useCallback((oldSrc: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Cancel any running animation
    if (animRef.current) cancelAnimationFrame(animRef.current)

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = oldSrc

    img.onload = () => {
      // Size canvas to the displayed image size
      const rect = canvas.parentElement?.getBoundingClientRect()
      const w = rect?.width || img.naturalWidth
      const h = rect?.height || img.naturalHeight
      canvas.width = w
      canvas.height = h
      canvas.style.opacity = '1'

      // Draw original image
      ctx.drawImage(img, 0, 0, w, h)

      // Animation: progressive pixelation + fade
      const TOTAL_FRAMES = 14
      let frame = 0

      const tick = () => {
        frame++
        const progress = frame / TOTAL_FRAMES

        // Pixelation: draw at smaller and smaller sizes
        const pixelSize = Math.max(1, Math.floor(w * Math.max(0.02, 1 - progress * 2.5)))

        ctx.clearRect(0, 0, w, h)
        ctx.save()
        ctx.imageSmoothingEnabled = false

        // Draw image at tiny size into a corner
        ctx.drawImage(img, 0, 0, pixelSize, Math.max(1, Math.floor(h * (pixelSize / w))))
        // Scale back up — creates blocky pixel effect
        ctx.drawImage(
          canvas,
          0, 0, pixelSize, Math.max(1, Math.floor(h * (pixelSize / w))),
          0, 0, w, h,
        )

        ctx.restore()

        // Fade out
        canvas.style.opacity = String(Math.max(0, 1 - progress * 1.3))

        if (frame < TOTAL_FRAMES) {
          animRef.current = requestAnimationFrame(tick)
        } else {
          // Done — hide canvas
          canvas.style.opacity = '0'
          ctx.clearRect(0, 0, w, h)
        }
      }

      animRef.current = requestAnimationFrame(tick)
    }

    // If image fails to load, just hide canvas
    img.onerror = () => {
      canvas.style.opacity = '0'
    }
  }, [canvasRef])

  // Cleanup
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  return run
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function HomeContent({ feedItems }: { feedItems: FeedItem[] }) {
  const [hoveredCat, setHoveredCat] = useState<number | null>(null)
  const currentImage = hoveredCat !== null ? CATEGORY_IMAGES[hoveredCat] : DEFAULT_IMAGE
  const prevImageRef = useRef(currentImage)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runPixel = usePixelTransition(canvasRef)

  // When image source changes, trigger pixel decompose on the old image
  useEffect(() => {
    if (currentImage !== prevImageRef.current) {
      runPixel(prevImageRef.current)
      prevImageRef.current = currentImage
    }
  }, [currentImage, runPixel])

  return (
    <div className={s.homePage}>
      {/* Text content column */}
      <div className={s.content}>
        <HeroIntro />
        <HeroCategories onCategoryHover={setHoveredCat} />
      </div>

      {/* Poster image — absolutely positioned top-right */}
      <div className={s.posterWrap}>
        <Image
          src={currentImage}
          alt="Juan C. Fresno"
          width={358}
          height={239}
          className={s.posterImg}
          priority
        />
        {/* Canvas overlay for pixel transition */}
        <canvas ref={canvasRef} className={s.pixelCanvas} />
      </div>

      {/* Carousel at bottom */}
      <SocialFeed items={feedItems} />
    </div>
  )
}
