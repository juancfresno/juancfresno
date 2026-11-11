'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { EFFECTS, SITE_TRANSITION, type TransitionEffect } from '@/components/transition/effects'
import s from '@/components/transition/SiteTransition.module.scss'
import { parsePath } from '@/i18n/config'
import { LANG_SWITCH_KEY } from './langSwitch'
import { applyPageTheme, currentPageTheme, pageThemeOf } from '@/lib/pageTheme'

// ─── Context ──────────────────────────────────────────────────────────────────
type TransitionCtx = { navigate: (href: string) => void }
const Ctx = createContext<TransitionCtx>({ navigate: () => {} })
export const usePageTransition = () => useContext(Ctx)

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── Page theme (blue Contact) ────────────────────────────────────────────────
// Page and chrome (nav, tab bar, footer) change theme together once the
// full-screen cover is down, so nothing shows the switch; the effect re-tints
// its plane to the new page's colours as it reveals.

// Destination line for the transition HUD: "→ ABOUT · 01" (nav label and its
// position), "→ WORK · SHOECIETY" below a section, "→ HOME" for the home page.
function hudLine(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/'
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-site-header] nav a[href]'))
  for (let i = 0; i < links.length; i++) {
    const p = new URL(links[i].href).pathname.replace(/\/$/, '')
    if (path !== p && !path.startsWith(p + '/')) continue
    const label = (links[i].getAttribute('aria-label') || links[i].textContent || '').trim().toUpperCase()
    const rest = path.slice(p.length + 1).split('/')[0]
    return `→ ${label} · ${rest ? rest.replace(/-/g, ' ').toUpperCase() : String(i + 1).padStart(2, '0')}`
  }
  const home = document.querySelector<HTMLAnchorElement>('[data-site-header] a[aria-label]')?.getAttribute('aria-label')
  return `→ ${(home || 'Home').toUpperCase()}`
}

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
// pathname + 2 frames → reveal (the effect measures the new page here) → focus.
// Back/forward covers at once and runs the effect mirrored. Reduced motion =
// the effect's veil-only fade. Internal <a>/<Link> clicks are caught
// here, so pages and links don't need to know about it.
export default function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const effect = useRef<TransitionEffect | null>(null)
  const busy = useRef(false)
  const current = useRef(pathname)
  const waiters = useRef<(() => void)[]>([])
  // In-memory history (pathnames + index) so back/forward knows its direction.
  const stack = useRef<string[]>([pathname])
  const at = useRef(0)
  const lastClick = useRef<{ x: number; t: number } | null>(null)

  useEffect(() => {
    if (canvasRef.current) effect.current = EFFECTS[SITE_TRANSITION](canvasRef.current)
    // Arriving from a language switch (full load): reveal this page with the effect.
    let flagged = false
    try { flagged = !!sessionStorage.getItem(LANG_SWITCH_KEY); sessionStorage.removeItem(LANG_SWITCH_KEY) } catch {}
    const root = document.documentElement
    if (flagged && effect.current) {
      busy.current = true
      const fx = effect.current
      // Same full cover as the old page ended with (header/footer bands, lines),
      // then the boxes grow out of the grid into the new page.
      const still = reduced()
      ;(still ? (fx.coverNow({ still }), Promise.resolve()) : fx.cover({ back: false })).then(async () => {
        delete root.dataset.langSwitch
        await frame()
        await fx.reveal()
        busy.current = false
      })
    } else {
      delete root.dataset.langSwitch
    }
    // Back to this page from the bfcache after a language switch: drop the cover.
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) { effect.current?.cancel(); busy.current = false } }
    window.addEventListener('pageshow', onShow)
    return () => { window.removeEventListener('pageshow', onShow); effect.current?.cancel() }
  }, [])

  // The committed route decides the page theme (before paint): direct loads,
  // reduced motion and anything the transition did not flip end up right here.
  useLayoutEffect(() => { applyPageTheme(pageThemeOf(pathname)) }, [pathname])

  // Resolve anyone waiting for the route to change once the new page has committed.
  useEffect(() => {
    current.current = pathname
    if (stack.current[at.current] !== pathname) {
      stack.current = stack.current.slice(0, at.current + 1).concat(pathname)
      at.current = stack.current.length - 1
    }
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
    const animate = !!effect.current
    // The grid drops from the clicked column (a pointer click in the last 600 ms).
    const c = lastClick.current
    const originX = c && performance.now() - c.t < 600 ? c.x : undefined
    const opts = { back: false, originX, still: reduced(), hud: hudLine(url.pathname) }
    // Another language = another root layout: full cover, then a full page load.
    if (parsePath(url.pathname).locale !== parsePath(location.pathname).locale) {
      if (animate) {
        await effect.current!.cover(opts)
        try { sessionStorage.setItem(LANG_SWITCH_KEY, '1') } catch {}
      }
      location.assign(to)
      return
    }
    stack.current = stack.current.slice(0, at.current + 1).concat(url.pathname)
    at.current = stack.current.length - 1
    if (animate) await effect.current!.cover(opts)
    // Covered: the page theme (blue Contact), the nav chip (pathname) and the
    // scroll all change under the cover.
    const theme = pageThemeOf(url.pathname)
    if (theme !== currentPageTheme()) applyPageTheme(theme)
    router.push(to)
    await finish(from, animate)
  }, [router, finish])

  // Every internal link goes through navigate (capture on window, before Link/React handlers).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.detail > 0) lastClick.current = { x: e.clientX, t: performance.now() }
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
      // Forward only when the next entry we know of is this one; anything else reads as back.
      const forward = stack.current[at.current + 1] === location.pathname
      if (forward) at.current += 1
      else if (stack.current[at.current - 1] === location.pathname) at.current -= 1
      const animate = !!effect.current
      if (animate) effect.current!.coverNow({ back: !forward, still: reduced() })
      const theme = pageThemeOf(location.pathname)
      if (theme !== currentPageTheme()) applyPageTheme(theme)
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
