'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { EFFECTS, SITE_TRANSITION, type TransitionEffect } from '@/components/transition/effects'
import s from '@/components/transition/SiteTransition.module.scss'
import { parsePath } from '@/i18n/config'
import { LANG_SWITCH_KEY } from './langSwitch'
import { applyPageTheme, currentPageTheme, pageThemeOf, type PageTheme } from '@/lib/pageTheme'

// ─── Context ──────────────────────────────────────────────────────────────────
type TransitionCtx = { navigate: (href: string) => void }
const Ctx = createContext<TransitionCtx>({ navigate: () => {} })
export const usePageTransition = () => useContext(Ctx)

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─── Page theme (blue Contact) ────────────────────────────────────────────────
// Chrome (nav, tab bar, footer) changes theme at cover start with a 160 ms
// colour fade ('chrome-anim'); the header keeps a solid background
// ('chrome-hold') until the page itself has changed under the cover.
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
let fadeTimer = 0
function flipChrome(t: PageTheme) {
  const cl = document.documentElement.classList
  cl.add('chrome-anim', 'chrome-hold')
  applyPageTheme(t, 'chrome')
  clearTimeout(fadeTimer)
  fadeTimer = window.setTimeout(() => cl.remove('chrome-anim'), 200)
}
const releaseChrome = () => document.documentElement.classList.remove('chrome-hold')
// Fill of the transition columns: the brand blue going in, the site theme's own bg going out.
const themeFill = (t: PageTheme) => cssVar(t ? '--c-brand-blue' : '--c-base-bg') || undefined

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
// Back/forward covers at once and runs the effect mirrored. Internal <a>/<Link> clicks are caught
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

  useEffect(() => {
    if (canvasRef.current) effect.current = EFFECTS[SITE_TRANSITION](canvasRef.current)
    // Arriving from a language switch (full load): reveal this page with the effect.
    let flagged = false
    try { flagged = !!sessionStorage.getItem(LANG_SWITCH_KEY); sessionStorage.removeItem(LANG_SWITCH_KEY) } catch {}
    const root = document.documentElement
    if (flagged && effect.current && !reduced()) {
      busy.current = true
      const fx = effect.current
      fx.cover({ back: false }).then(async () => {
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
    releaseChrome()
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
    // Another language = another root layout: cover, then a full page load.
    if (parsePath(url.pathname).locale !== parsePath(location.pathname).locale) {
      if (animate) {
        await effect.current!.cover({ back: false })
        try { sessionStorage.setItem(LANG_SWITCH_KEY, '1') } catch {}
      }
      location.assign(to)
      return
    }
    stack.current = stack.current.slice(0, at.current + 1).concat(url.pathname)
    at.current = stack.current.length - 1
    const theme = pageThemeOf(url.pathname)
    if (animate && theme !== currentPageTheme()) {
      // Into / out of the blue page: the columns fill with the destination
      // background and it stays; leaving Contact runs mirrored.
      flipChrome(theme)
      await effect.current!.cover({ back: !theme, fill: themeFill(theme) })
      applyPageTheme(theme, 'page')
    } else if (animate) {
      await effect.current!.cover({ back: false })
    }
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
      // Forward only when the next entry we know of is this one; anything else reads as back.
      const forward = stack.current[at.current + 1] === location.pathname
      if (forward) at.current += 1
      else if (stack.current[at.current - 1] === location.pathname) at.current -= 1
      const animate = !reduced() && !!effect.current
      const theme = pageThemeOf(location.pathname)
      if (animate && theme !== currentPageTheme()) {
        flipChrome(theme)
        effect.current!.coverNow({ back: !forward !== !theme, fill: themeFill(theme) })
        applyPageTheme(theme, 'page')
      } else if (animate) {
        effect.current!.coverNow({ back: !forward })
      }
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
