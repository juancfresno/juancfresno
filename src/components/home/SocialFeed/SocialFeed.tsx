'use client'

import { useRef, useEffect, useState } from 'react'
import s from './SocialFeed.module.scss'

// ─── Mock feed data — simulates Dribbble shots ──────────────────────────────────
// Each item has a gradient that mimics a real shot thumbnail.
// Replace with real API data (Dribbble/Instagram) when ready.
const FEED_ITEMS = [
  { id: 1,  gradient: 'linear-gradient(135deg, #003dff 0%, #0066ff 50%, #00aaff 100%)', label: 'Brand Identity System' },
  { id: 2,  gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', label: 'Dashboard UI' },
  { id: 3,  gradient: 'linear-gradient(135deg, #8df8cd 0%, #6ee7b7 50%, #34d399 100%)', label: 'Mobile App Concept' },
  { id: 4,  gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #f0932b 100%)', label: 'Visual Direction' },
  { id: 5,  gradient: 'linear-gradient(135deg, #d5f936 0%, #a8e063 50%, #56ab2f 100%)', label: 'Interaction Design' },
  { id: 6,  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)', label: 'Web Experience' },
  { id: 7,  gradient: 'linear-gradient(135deg, #ffffe6 0%, #ffd93d 50%, #ff9f43 100%)', label: 'Typography Exploration' },
  { id: 8,  gradient: 'linear-gradient(135deg, #003dff 0%, #6c5ce7 50%, #a29bfe 100%)', label: 'Art Direction' },
  { id: 9,  gradient: 'linear-gradient(135deg, #2d3436 0%, #636e72 50%, #b2bec3 100%)', label: 'Product Design' },
  { id: 10, gradient: 'linear-gradient(135deg, #00b894 0%, #00cec9 50%, #0984e3 100%)', label: 'Visual System' },
  { id: 11, gradient: 'linear-gradient(135deg, #e17055 0%, #d63031 50%, #b71540 100%)', label: 'Editorial Design' },
  { id: 12, gradient: 'linear-gradient(135deg, #fdcb6e 0%, #f39c12 50%, #e74c3c 100%)', label: 'Campaign Creative' },
]

// ─── Component ───────────────────────────────────────────────────────────────────
export default function SocialFeed() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  // ── Pause on hover, resume on leave ─────────────────────────────────────────
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

  // Duplicate items for seamless infinite loop
  const items = [...FEED_ITEMS, ...FEED_ITEMS]

  return (
    <section className={s.section}>
      {/* Label */}
      <div className={s.header}>
        <span className={s.label}>{'{ últimos trabajos }'}</span>
        <span className={s.sublabel}>Dribbble & Instagram</span>
      </div>

      {/* Marquee track */}
      <div className={s.marquee} ref={trackRef}>
        <div
          className={s.track}
          style={{ animationPlayState: paused ? 'paused' : 'running' }}
        >
          {items.map((item, i) => (
            <a
              key={`${item.id}-${i}`}
              href="https://dribbble.com/my-playbook"
              target="_blank"
              rel="noopener noreferrer"
              className={s.card}
              aria-label={item.label}
            >
              <div
                className={s.cardInner}
                style={{ background: item.gradient }}
              />
              <span className={s.cardLabel}>{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
