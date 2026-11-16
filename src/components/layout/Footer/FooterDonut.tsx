'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { DONUT, startLogoDonut, type LogoDonutHandle } from '@/components/about/donutGl'
import s from './Footer.module.scss'

// ─── The FRESNO© donut lands in the footer ───────────────────────────────────
// The reverse of its exit on About: as the footer is uncovered, the ring in the
// header corner (NavDonut / the About dock) goes away and the donut comes back
// from in front of the screen: huge, the letters passing by the edges, it
// shrinks into its place over the middle of the footer (Figma 7370:5290) and
// stays there turning. Scrolling back plays it backwards.
//
// One canvas over the whole viewport (portalled to <body>, never takes the
// pointer), so the big ring is not cropped by the footer's window. Once it
// settles it turns to glass: the tube bends the footer's feed lens behind it
// (a small copy of that canvas, taken on each of its frames by `grabBackdrop`),
// with the wordmark still printed on it in ink. No lens (no WebGL2 there,
// phones without it) = the plain ink ring.
//
// WebGL starts the first time the footer comes near and sleeps while the footer
// is out of view. No WebGL2 = nothing (the footer is complete without it).
const START = 0.06       // footer uncovered this far before the ring shows
const GLASS_FROM = 0.72  // … and this far before it starts turning to glass
const OPEN_END = 0.25    // extra tip towards the viewer while it is huge (as on About)
const BACK_W = 640       // width of the lens copy the glass bends, px

// Where it rests, as fractions of the footer screen (1680 × 920 in Figma).
const REST = { x: 0.59, y: 0.478, d: 0.32 }
const REST_SMALL = { x: 0.5, y: 0.25, d: 0.62 }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t) }

// The lens's last frame, shrunk. OrbBackdrop calls `grabBackdrop` right after
// each of its draws (the only moment its canvas still holds the picture).
// `onNew` tells the mounted donut there is a fresh copy: the ring may already be
// at rest (no scroll, its own loop asleep) when the lens loads or moves.
const back = { want: false, copy: null as HTMLCanvasElement | null, src: null as HTMLCanvasElement | null, v: 0, onNew: null as (() => void) | null }
export function grabBackdrop(src: HTMLCanvasElement) {
  back.src = src
  if (!back.want || !src.width || !src.height) return
  const copy = back.copy ?? (back.copy = document.createElement('canvas'))
  const w = Math.min(BACK_W, src.width), h = Math.max(1, Math.round((w * src.height) / src.width))
  if (copy.width !== w || copy.height !== h) { copy.width = w; copy.height = h }
  const ctx = copy.getContext('2d')
  if (!ctx) return
  ctx.drawImage(src, 0, 0, w, h)
  back.v++
  back.onNew?.()
}

export default function FooterDonut({ root, screen }: { root: RefObject<HTMLElement | null>; screen: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)

  useEffect(() => setHost(document.body), [])

  useEffect(() => {
    const c = ref.current, foot = root.current, scr = screen.current
    if (!host || !c || !foot || !scr) return
    const html = document.documentElement
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let h: LogoDonutHandle | null = null
    let failed = false, near = false
    let raf = 0, last = 0
    let p = 0          // footer uncovered, 0 → 1
    let e = 0, ev = 0  // where the ring is: follows p on a soft spring
    let gk = 0         // glass, 0 → 1: eased, so a lens that loads late does not pop in

    // The footer has its own theme on some pages (subtle on Work): the ink and
    // the glass veil follow the footer's colours, not the page's. Ink = the
    // brand blue ($raw-chip) on a dark footer, the brand ink ($raw-ink) on a light one.
    const tone = { bg: [0.06, 0.06, 0.06] as [number, number, number], light: false }
    const readTone = () => {
      const m = getComputedStyle(scr).backgroundColor.match(/[\d.]+/g)
      if (!m || m.length < 3) return
      tone.bg = [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255]
      tone.light = tone.bg[0] * 0.3 + tone.bg[1] * 0.59 + tone.bg[2] * 0.11 > 0.5
      h?.setInk(tone.light ? [0.063, 0.063, 0.055] : [0.776, 0.859, 0.976])
    }
    const glassTo = () => (back.copy && back.src ? smooth((e - GLASS_FROM) / (1 - GLASS_FROM)) : 0)
    const place = () => {
      const W = html.clientWidth, H = window.innerHeight
      const fr = foot.getBoundingClientRect()
      const before = p
      p = near ? clamp01((H - fr.top) / Math.max(1, Math.min(fr.height, H))) : 0
      // Each time the footer starts to show: its colours may have changed with the page.
      if (before <= 0 && p > 0) readTone()
      html.toggleAttribute('data-foot-donut', p > 0.02)
      if (!h) return true
      const small = W <= 768
      const rest = small ? REST_SMALL : REST
      const b = scr.getBoundingClientRect()
      const dF = Math.min(rest.d * b.width, b.height * 0.62)
      const xF = b.left + b.width * rest.x, yF = b.top + b.height * rest.y
      // u: 1 = in front of the screen (gone) → 0 = at rest in the footer.
      const u = 1 - clamp01((e - START) / (1 - START))
      const g = u * u * (0.55 + 0.45 * u)
      // Huge = its hole (an ellipse leaning with the ring) holds the screen corners.
      const tube = 1 / (DONUT.ratio + 1) / 2
      const ax = (DONUT.ratio - 1) * tube
      const by = Math.max(0.02, DONUT.ratio * tube * Math.sin(DONUT.tilt + OPEN_END) - tube)
      const cl = Math.cos(DONUT.lean), sl = Math.sin(DONUT.lean)
      let need = 0
      for (const sx of [-1, 1]) {
        const x = (sx * W) / 2, y = H / 2
        need = Math.max(need, Math.hypot((x * cl + y * sl) / ax, (y * cl - x * sl) / by))
      }
      const end = Math.max(dF * 1.6, need)
      const alpha = e <= START ? 0 : 1 - smooth((u - 0.88) / 0.12)
      h.setPlace(xF + (W / 2 - xF) * g, yF + (H / 2 - yF) * smooth(u * 1.6), dF + (end - dF) * g, 0, OPEN_END * g, alpha)
      // Glass once it is nearly home, if the lens is there to bend.
      back.want = p > GLASS_FROM - 0.2
      if (back.src) {
        const r = back.src.getBoundingClientRect()
        h.setBackdrop(back.copy, back.v, { x: r.left, y: r.top, w: r.width, h: r.height }, tone.bg)
      }
      h.setGlass(gk)
      ;(window as unknown as { __footDonut?: object }).__footDonut = { p, e, glass: gk, bg: tone.bg, light: tone.light } // QA probe, like window.__orb
      const on = alpha > 0.001
      c.style.visibility = on ? 'visible' : 'hidden'
      h.setPaused(!on)
      return Math.abs(e - p) < 0.001 && Math.abs(ev) < 0.005 && Math.abs(glassTo() - gk) < 0.002
    }
    const frame = (now: number) => {
      raf = 0
      const dt = Math.min(0.05, (now - (last || now)) / 1000)
      last = now
      if (reduced.matches) { e = p; ev = 0; gk = glassTo() } else {
        ev += ((p - e) * 60 - ev * 14) * dt
        e += ev * dt
        // Follows the scroll closely; only a jump (the lens arriving late) is eased.
        gk += (glassTo() - gk) * Math.min(1, dt * 12)
      }
      if (!place()) raf = requestAnimationFrame(frame)
      else { e = p; ev = 0; gk = glassTo(); last = 0; place() }
    }
    const ask = () => { if (!raf) raf = requestAnimationFrame(frame) }
    const onScroll = () => { place(); ask() }
    // A new lens frame: hand it to the ring even when nothing else is moving.
    back.onNew = () => {
      if (!h || p <= 0 || raf) return
      if (Math.abs(glassTo() - gk) < 0.002) place()
      else ask()
    }
    // Dark / light toggled with the footer on screen (its background may ease: read it again after).
    let toneT = 0
    const onTheme = new MutationObserver(() => {
      if (p <= 0) return
      readTone(); place()
      window.clearTimeout(toneT)
      toneT = window.setTimeout(() => { readTone(); place() }, 400)
    })
    onTheme.observe(html, { attributes: true, attributeFilter: ['data-theme'] })

    // Start WebGL when the footer is one screen away; forget about it while far.
    const io = new IntersectionObserver(([en]) => {
      near = en.isIntersecting
      if (near && !h && !failed) {
        h = startLogoDonut(c)
        if (!h) failed = true
        else { h.setPaused(true); place(); e = p; gk = glassTo() }
      }
      if (near) readTone()
      onScroll()
    }, { rootMargin: '100% 0px' })
    io.observe(foot)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(toneT)
      onTheme.disconnect()
      back.onNew = null
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      html.removeAttribute('data-foot-donut')
      back.want = false
      h?.stop()
    }
  }, [host, root, screen])

  if (!host) return null
  return createPortal(<canvas ref={ref} className={s.footDonut} aria-hidden="true" />, host)
}
