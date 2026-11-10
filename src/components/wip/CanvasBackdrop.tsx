'use client'

// ─── WIP background · "plane" (default) ───────────────────────────────────────
// The /feed infinite plane as the landing's background: same tile
// (feed-canvas.json), same curated selection, same WebGL2 renderer
// (feed/canvas/gl.ts: lazy textures, ≤ 6 loads in flight, LRU) with the RGB
// split by velocity; DOM fallback without WebGL2. No HUD, minimap, captions
// or zoom. Fixed behind header, copy and footer (portalled to <body> under
// them), with a theme-aware veil for the copy (wip.module.scss).
// Motion: a slow constant drift (below the split threshold, so it stays
// clean), drag from anywhere that isn't a link or button (inertia capped),
// wheel/trackpad pans (the page doesn't scroll), a slight parallax towards
// the pointer. The loop runs at ≤ 30 fps while only drifting, full rate while
// dragging/gliding, and stops when the tab is hidden. The grain is the
// page's DOM grain (the renderer's own is off, so it isn't doubled).
// Reduced motion: a still mosaic (drag moves it without inertia or split).
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FeedItem } from '@/content/feed'
import { TILE, makeLayout, visible, gridMetrics, type Layout } from '@/components/feed/canvas/layout'
import { createRenderer, type DrawPiece, type Renderer, type Theme } from '@/components/feed/canvas/gl'
import { pageBg, pageFill, INTERACTIVE } from './bg/theme'
import s from './wip.module.scss'

const MAXV = 1.8 // px/ms cap for the release inertia
const THROW = 260 // ms of travel per px/ms of release speed
const EASE_K = 0.14 // camera lerp per 60 Hz frame
const DRIFT: [number, number] = [0.28, 0.12] // px per 60 Hz frame (≈ 17 / 7 px/s)
const PARALLAX = 22 // px of camera offset at the screen edge
const IDLE_MS = 33 // ≤ 30 fps while only drifting

function readTheme(): Theme {
  return {
    bg: pageBg(),
    fill: pageFill(),
    grain: 0,
    light: document.documentElement.dataset.theme === 'light',
  }
}

export default function CanvasBackdrop({ items }: { items: FeedItem[] }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<HTMLCanvasElement>(null)
  const domRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHost(document.body)
    const html = document.documentElement
    html.dataset.bg = 'plane'
    return () => { delete html.dataset.bg }
  }, [])

  useEffect(() => {
    if (!host || !items.length) return
    const stage = stageRef.current!, cv = glRef.current!, dom = domRef.current!
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fx = reduce ? 0 : 1
    const offs: (() => void)[] = []
    const on = <T extends EventTarget>(t: T, ev: string, fn: (e: never) => void, opt?: AddEventListenerOptions) => {
      t.addEventListener(ev, fn as EventListener, opt)
      offs.push(() => t.removeEventListener(ev, fn as EventListener, opt))
    }

    let W = window.innerWidth, H = window.innerHeight
    let dpr = Math.min(2, window.devicePixelRatio || 1)
    let L: Layout = makeLayout(items, W)
    let cx = -gridMetrics(W).margin, cy = -L.unit * 0.5, tx = cx, ty = cy
    let ox = 0, oy = 0, pox = 0, poy = 0 // parallax: current, target
    let pcx = cx, pcy = cy, vx = 0, vy = 0
    let last = performance.now(), lastDraw = 0
    let dragging = false
    let theme = readTheme()

    let renderer: Renderer | null = null
    try { renderer = createRenderer(cv, () => wake()) } catch { renderer = null }
    if (!renderer) { cv.hidden = true; dom.hidden = false }

    const domPool: HTMLDivElement[] = []
    const domLive = new Map<string, HTMLDivElement>()
    function drawDom(list: DrawPiece[]) {
      const need = new Set<string>()
      for (const p of list) {
        need.add(p.key)
        let e = domLive.get(p.key)
        if (!e) {
          e = domPool.pop() || (() => { const d = document.createElement('div'); d.className = s.canvasTile; const im = new Image(); im.alt = ''; im.decoding = 'async'; d.appendChild(im); dom.appendChild(d); return d })()
          e.hidden = false
          domLive.set(p.key, e)
        }
        const img = e.firstChild as HTMLImageElement
        if (img.getAttribute('src') !== p.src) img.src = p.src
        e.style.cssText = `width:${p.w}px;height:${p.h}px;transform:translate3d(${p.x}px,${p.y}px,0)`
      }
      domLive.forEach((e, k) => { if (!need.has(k)) { e.hidden = true; domPool.push(e); domLive.delete(k) } })
    }

    function resize() {
      const oldU = L.unit
      W = window.innerWidth; H = window.innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1)
      L = makeLayout(items, W)
      const k = L.unit / oldU
      cx *= k; cy *= k; tx *= k; ty *= k; pcx = cx; pcy = cy
      cv.style.width = `${W}px`; cv.style.height = `${H}px`
      renderer?.resize(W, H, dpr)
      frame(performance.now(), true)
    }

    // Returns true while there is fast motion (glide, drag, parallax settling).
    function frame(now: number, force = false) {
      const dt = Math.min(4, Math.max(0.25, (now - last) / 16.667))
      last = now
      if (!reduce) { tx += DRIFT[0] * dt; ty += DRIFT[1] * dt }
      if (!dragging) {
        if (reduce) { cx = tx; cy = ty }
        else {
          const k = 1 - Math.pow(1 - EASE_K, dt)
          cx += (tx - cx) * k; cy += (ty - cy) * k
        }
      }
      if (!reduce) {
        const k = 1 - Math.pow(1 - 0.06, dt)
        ox += (pox - ox) * k; oy += (poy - oy) * k
      }
      const camX = cx + ox, camY = cy + oy
      const rvx = -(camX - pcx) / dt, rvy = -(camY - pcy) / dt
      pcx = camX; pcy = camY
      const sk = 1 - Math.pow(1 - 0.35, dt)
      vx += (rvx - vx) * sk; vy += (rvy - vy) * sk
      const sp = Math.hypot(vx, vy)

      const zoom = 1 - 0.035 * Math.min(1, sp / 40) * fx
      const ccx = W / 2, ccy = H / 2
      const list: DrawPiece[] = []
      for (const p of visible(L, TILE, camX, camY, W, H, 60)) {
        const w = p.w * zoom, h = p.h * zoom
        const it = items[p.idx]
        list.push({
          key: p.key,
          src: p.w * dpr > 700 ? it.src : `/feed/t/${it.id}.webp`,
          iw: it.w, ih: it.h,
          x: ccx + (p.x + p.w / 2 - ccx) * zoom - w / 2,
          y: ccy + (p.y + p.h / 2 - ccy) * zoom - h / 2,
          w, h, alpha: 1,
        })
      }
      if (renderer) renderer.draw(list, W, H, dpr, [vx, vy], fx, theme, 1)
      else drawDom(list)
      lastDraw = now
      if (force) return false
      const glide = Math.abs(tx - cx) > 2 || Math.abs(ty - cy) > 2
      return dragging || glide || sp > 1 || Math.hypot(pox - ox, poy - oy) > 0.5 || !!renderer?.fading()
    }

    // One loop: full rate while something moves fast, ≤ 30 fps while only
    // drifting; none at all with reduced motion once still.
    let raf = 0
    function tick(now: number) {
      raf = 0
      if (document.hidden) return
      const busy = dragging || Math.abs(tx - cx) > 2 || Math.abs(ty - cy) > 2
      if (busy || now - lastDraw >= IDLE_MS) {
        const fast = frame(now)
        if (reduce && !fast) return
      }
      raf = requestAnimationFrame(tick)
    }
    function wake() { if (!raf && !document.hidden) { last = performance.now() - 16.7; raf = requestAnimationFrame(tick) } }

    // ── drag from anywhere that isn't interactive ──
    let pid: number | null = null, sx0 = 0, sy0 = 0, lx = 0, ly = 0, moved = false
    let hist: { x: number; y: number; t: number }[] = []
    on(window, 'pointerdown', (e: PointerEvent) => {
      if (e.button > 0 || pid !== null) return
      if ((e.target as Element | null)?.closest?.(INTERACTIVE)) return
      pid = e.pointerId; sx0 = lx = e.clientX; sy0 = ly = e.clientY; moved = false
      hist = [{ x: lx, y: ly, t: e.timeStamp }]
      tx = cx; ty = cy
    })
    on(window, 'pointermove', (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && !reduce) {
        pox = -(e.clientX / W - 0.5) * 2 * PARALLAX
        poy = -(e.clientY / H - 0.5) * 2 * PARALLAX
        wake()
      }
      if (e.pointerId !== pid) return
      let dx = e.clientX - lx, dy = e.clientY - ly
      lx = e.clientX; ly = e.clientY
      if (!moved && Math.hypot(lx - sx0, ly - sy0) > 6) {
        moved = true; dragging = true; dx = lx - sx0; dy = ly - sy0
        document.documentElement.classList.add(s.canvasDragging)
        window.getSelection()?.removeAllRanges()
      }
      if (!moved) return
      hist.push({ x: lx, y: ly, t: e.timeStamp }); if (hist.length > 6) hist.shift()
      cx -= dx; cy -= dy; tx = cx; ty = cy
      wake()
    })
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      pid = null
      document.documentElement.classList.remove(s.canvasDragging)
      if (!moved) return
      dragging = false
      const a = hist[0], b = hist[hist.length - 1], dt = Math.max(16, b.t - a.t)
      if (e.timeStamp - b.t <= 90 && !reduce) {
        tx -= Math.max(-MAXV, Math.min(MAXV, (b.x - a.x) / dt)) * THROW
        ty -= Math.max(-MAXV, Math.min(MAXV, (b.y - a.y) / dt)) * THROW
      }
      wake()
    }
    on(window, 'pointerup', up)
    on(window, 'pointercancel', up)
    on(window, 'dragstart', (e: Event) => { if (pid !== null) e.preventDefault() })

    // ── wheel / trackpad: the page doesn't scroll, so the plane takes it ──
    on(window, 'wheel', (e: WheelEvent) => {
      if (e.ctrlKey) return
      e.preventDefault()
      const f = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1
      const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * f, dy = (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * f
      tx += Math.max(-240, Math.min(240, dx)); ty += Math.max(-240, Math.min(240, dy))
      wake()
    }, { passive: false })

    const mo = new MutationObserver(() => { theme = readTheme(); frame(performance.now(), true) })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    on(window, 'resize', resize)
    on(document, 'visibilitychange', () => { if (!document.hidden) wake() })

    resize()
    wake()

    return () => {
      cancelAnimationFrame(raf)
      offs.forEach((f) => f())
      mo.disconnect()
      renderer?.destroy()
      dom.replaceChildren()
      document.documentElement.classList.remove(s.canvasDragging)
    }
  }, [host, items])

  if (!host) return null
  return createPortal(
    <div ref={stageRef} className={s.canvasStage} aria-hidden="true">
      <canvas ref={glRef} className={s.canvasGl} />
      <div ref={domRef} className={s.canvasDom} hidden />
      <div className={s.canvasVeil} />
    </div>,
    host,
  )
}
