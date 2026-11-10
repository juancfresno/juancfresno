'use client'

import dynamic from 'next/dynamic'
import type { FeedItem } from '@/content/feed'

// What sits behind the hero copy: the feed mosaic through the fisheye
// (bg/OrbBackdrop, lens 1, Juan's pick of 10 Nov 2026). Code-split and
// client-only (WebGL2); the stage is absolute inside the hero.
const OrbBackdrop = dynamic(() => import('./bg/OrbBackdrop'), { ssr: false })

export default function Backdrop({ feed }: { feed: FeedItem[] }) {
  return <OrbBackdrop items={feed} mode="lens" />
}
