'use client'

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { EFFECTS, SITE_TRANSITION, type TransitionEffect } from '@/components/transition/effects'
import s from '@/components/transition/SiteTransition.module.scss'

// ─── Context ──────────────────────────────────────────────────────────────────
type TransitionCtx = { navigate: (href: string) => void }
const Ctx = createContext<TransitionCtx>({ navigate: () => {} })
export const usePageTransition = () => useContext(Ctx)

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// After a navigation, focus the new page's h1 (or <main>) without scrolling.
function focusPage() {
  const main = document.querySelector<HTMLElement>('main')
  const target = main?.querySelector<HTMLElement>('h1') ?? main
  if (!target) return
  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1')
    target.dataset.transitionFocus = ''
    target.addEventListener('blur', () => {
      target.removeAttribute('tabindex')
      delete target.dataset.transitionFocus
    }, { once: true })
  }
  target.focus({ preventScroll: true })
}

// Same-origin, plain left click on a page link (not a file, not a hash on this page).
function linkTarget(e: MouseEvent): URL | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null
  const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
  if (!a || a.hasAttribute('download') || a.hasAttribute('data-no-transition')) return null
  if (a.target && a.target !== '_self') return null
  const url = new URL(a.href, location.href)
  if (url.origin !== location.origin) return null
  if (url.pathname === location.pathname) return null // hash/query on the same page: browser/Next default
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return null // static files (/lab/…/index.html, PDFs)
  return url
}

// ─── Provider ─────────────────────────────────────────────────────────────────
// Owns the `navigate` seam and the site transition (SITE_TRANSITION in
// components/transition/effects.ts): cover → router.push → wait for the new
// pathname + a frame → reveal → focus. Internal <a>/<Link> clicks are caught
// here, so pages and links don't need to know about it.
export default function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const effect = useRef<TransitionEffect | null>(null)
  const busy = useRef(false)
  const current = useRef(pathname)
  const waiters = useRef<(() => void)[]>([])

  useEffect(() => {
    if (canvasRef.current) effect.current = EFFECTS[SITE_TRANSITION](canvasRef.current)
    return () => effect.current?.cancel()
  }, [])

  // Resolve anyone waiting for the route to change once the new page has committed.
  useEffect(() => {
    current.current = pathname
    const w = waiters.current
    waiters.current = []
    w.forEach((f) => f())
  }, [pathname])

  const routeChanged = useCallback((from: string) => new Promise<void>((resolve) => {
    if (current.current !== from) return resolve()
    const t = window.setTimeout(resolve, 3000) // never leave the page covered
    waiters.current.push(() => { clearTimeout(t); resolve() })
  }), [])

  const finish = useCallback(async (from: string, animate: boolean) => {
    await routeChanged(from)
    await frame()
    await frame()
    if (animate) await effect.current?.reveal()
    focusPage()
    busy.current = false
  }, [routeChanged])

  const navigate = useCallback(async (href: string) => {
    const url = new URL(href, location.href)
    if (url.origin !== location.origin) { location.href = url.href; return }
    if (busy.current) return
    const to = url.pathname + url.search + url.hash
    const from = current.current
    if (url.pathname === from) { router.push(to); return }
    busy.current = true
    const animate = !reduced() && !!effect.current
    if (animate) await effect.current!.cover()
    router.push(to)
    await finish(from, animate)
  }, [router, finish])

  // Every internal link goes through navigate (capture on window, before Link/React handlers).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const url = linkTarget(e)
      if (!url) return
      e.preventDefault()
      navigate(url.pathname + url.search + url.hash)
    }
    window.addEventListener('click', onClick, true)
    return () => window.removeEventListener('click', onClick, true)
  }, [navigate])

  // Back/forward: the route is already changing, so cover at once and reveal the new page.
  useEffect(() => {
    const onPop = () => {
      const from = current.current
      if (busy.current || location.pathname === from) return
      busy.current = true
      const animate = !reduced() && !!effect.current
      if (animate) effect.current!.coverNow()
      finish(from, animate)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [finish])

  return (
    <Ctx.Provider value={{ navigate }}>
      {children}
      <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
    </Ctx.Provider>
  )
}
