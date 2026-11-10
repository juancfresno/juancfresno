'use client'

// ─── Feed: Canvas / Rejilla ───────────────────────────────────────────────────
// Canvas = the infinite WebGL plane (canvas/FeedCanvas). Rejilla = the static,
// accessible grid of sessions rendered on the server (children), always in the
// HTML. Which one shows is an attribute on <html> (data-feed-view), set before
// paint by FEED_VIEW_SCRIPT on a hard load and by this component on client
// navigation, so neither view flashes. Order: ?view= in the URL, then the
// viewer's saved choice (localStorage 'feed:view'), then the default: Canvas
// with a fine pointer on screens wider than 768 px and no reduced motion,
// Rejilla otherwise (touch / small screens can still opt in to the canvas).
import { useEffect, useLayoutEffect, useState } from 'react'
import type { FeedItem } from '@/content/feed'
import FeedCanvas from './canvas/FeedCanvas'
import v from '@/components/blocks/v0.module.scss'
import f from './feed.module.scss'
import { useUi } from '@/i18n/client'

type View = 'canvas' | 'rejilla'
import { FEED_VIEW_KEY as KEY } from './feedView'


// Same rule as the inline script, for client navigation.
function decide(): View {
  const q = new URLSearchParams(window.location.search).get('view')
  let saved: string | null = null
  try { saved = localStorage.getItem(KEY) } catch {}
  if (q === 'canvas' || q === 'rejilla') return q
  if (saved === 'canvas' || saved === 'rejilla') return saved
  const fine = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)').matches
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return fine && !reduce ? 'canvas' : 'rejilla'
}

const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function FeedViews({ items, intro, children }: { items: FeedItem[]; intro: string; children: React.ReactNode }) {
  const ui = useUi()
  const [view, setView] = useState<View | null>(null)

  useIsoLayout(() => {
    const next = decide()
    document.documentElement.dataset.feedView = next
    setView(next)
    return () => { delete document.documentElement.dataset.feedView }
  }, [])

  const choose = (next: View) => {
    setView(next)
    document.documentElement.dataset.feedView = next
    try { localStorage.setItem(KEY, next) } catch {}
    const url = new URL(window.location.href)
    url.searchParams.set('view', next)
    window.history.replaceState(window.history.state, '', url.toString())
    window.scrollTo({ top: 0 })
  }

  const toggle = (
    <div className={v.segmented} role="group" aria-label={ui.view}>
      <span>{ui.view}:</span>
      <span className={v.segment}>
        <button type="button" aria-pressed={view === 'canvas'} onClick={() => choose('canvas')}>{ui.views.canvas}</button>
        <button type="button" aria-pressed={view !== 'canvas'} onClick={() => choose('rejilla')}>{ui.views.grid}</button>
      </span>
    </div>
  )

  return (
    <div className={f.views}>
      <h1 className={f.srOnly}>{ui.feed.h1}</h1>
      <div className={f.top}>
        <p className={f.intro}>{intro}</p>
        <div className={f.toggle}>{toggle}</div>
      </div>
      <div className={f.canvasView}>
        <FeedCanvas items={items} active={view === 'canvas'} />
      </div>
      <div className={f.gridView}>{children}</div>
    </div>
  )
}
