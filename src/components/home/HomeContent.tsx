'use client'

import { useState } from 'react'
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

export default function HomeContent({ feedItems }: { feedItems: FeedItem[] }) {
  const [hoveredCat, setHoveredCat] = useState<number | null>(null)
  const currentImage = hoveredCat !== null ? CATEGORY_IMAGES[hoveredCat] : DEFAULT_IMAGE

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
      </div>

      {/* Carousel at bottom */}
      <SocialFeed items={feedItems} />
    </div>
  )
}
