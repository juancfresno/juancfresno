'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import s from './SocialFeed.module.scss'
import type { FeedItem } from '@/lib/feeds/types'

// ─── Fallback items using local carousel images ─────────────────────────────
const FALLBACK_ITEMS: FeedItem[] = [
  { id: 'fb-1',  source: 'dribbble',  imageUrl: '/images/carousel-1.jpg', permalink: 'https://dribbble.com/juancfresno', label: 'Visual Design',       date: '' },
  { id: 'fb-2',  source: 'dribbble',  imageUrl: '/images/carousel-2.jpg', permalink: 'https://dribbble.com/juancfresno', label: 'Brand Identity',      date: '' },
  { id: 'fb-3',  source: 'dribbble',  imageUrl: '/images/carousel-3.jpg', permalink: 'https://dribbble.com/juancfresno', label: 'Interaction Design',  date: '' },
  { id: 'fb-4',  source: 'dribbble',  imageUrl: '/images/carousel-4.jpg', permalink: 'https://dribbble.com/juancfresno', label: 'Art Direction',       date: '' },
  { id: 'fb-5',  source: 'dribbble',  imageUrl: '/images/carousel-5.jpg', permalink: 'https://dribbble.com/juancfresno', label: 'Product Design',      date: '' },
  { id: 'fb-6',  source: 'dribbble',  imageUrl: '/images/carousel-6.jpg', permalink: 'https://dribbble.com/juancfresno', label: 'Web Experience',      date: '' },
  { id: 'fb-7',  source: 'dribbble',  imageUrl: '/images/carousel-7.jpg', permalink: 'https://dribbble.com/juancfresno', label: 'Campaign Creative',   date: '' },
]

// ─── Feed card with image ────────────────────────────────────────────────────
function FeedCard({ item }: { item: FeedItem }) {
  const [imgError, setImgError] = useState(false)
  const hasImage = item.imageUrl && !imgError
  const isLocal = item.imageUrl?.startsWith('/images/')

  return (
    <a
      href={item.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className={s.card}
      aria-label={item.label}
    >
      <div className={s.cardInner}>
        {hasImage ? (
          isLocal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.label}
              className={s.cardImageLocal}
              loading="lazy"
            />
          ) : (
            <Image
              src={item.imageUrl}
              alt={item.label}
              fill
              sizes="240px"
              className={s.cardImage}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          )
        ) : (
          <div
            className={s.cardGradient}
            style={{ background: 'linear-gradient(135deg, #003dff 0%, #00aaff 100%)' }}
          />
        )}
        <span className={s.sourceBadge}>
          {item.source === 'instagram' ? 'IG' : 'DR'}
        </span>
      </div>
    </a>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
interface SocialFeedProps {
  items?: FeedItem[]
}

export default function SocialFeed({ items }: SocialFeedProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    const pause = () => setPaused(true)
    const resume = () => setPaused(false)

    el.addEventListener('mouseenter', pause)
    el.addEventListener('mouseleave', resume)
    return () => {
      el.removeEventListener('mouseenter', pause)
      el.removeEventListener('mouseleave', resume)
    }
  }, [])

  // Use provided items, fallback to local images if empty
  const feedItems = items && items.length > 0 ? items : FALLBACK_ITEMS

  // Duplicate for seamless infinite loop
  const displayItems = [...feedItems, ...feedItems]

  return (
    <section className={s.section}>
      <div className={s.marquee} ref={trackRef}>
        <div
          className={s.track}
          style={{ animationPlayState: paused ? 'paused' : 'running' }}
        >
          {displayItems.map((item, i) => (
            <FeedCard key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
