'use client'

// ─── Feed · Canvas ───────────────────────────────────────────────────────────
// Infinite draggable plane for /feed. A hand-composed tile (feed-canvas.json)
// repeats both ways; WebGL2 paints the pieces, the RGB split by velocity and
// the grain (canvas/gl.ts); without WebGL2 a DOM version paints the same
// layout (no split, no grain). One rAF loop that sleeps at rest; while idle
// only the grain ticks, at 12 fps, and only if the stage is on screen.
// Drag (mouse/touch), wheel/trackpad and arrows pan; inertia capped; hover =
// mono label + slight lift; click / Enter = FLIP zoom (canvas/zoom.ts).
import { useEffect, useRef } from 'react'
import type { FeedItem } from '@/content/feed'
import { monthYear } from '@/content/feed'
import { TILE, makeLayout, visible, gridMetrics, mod, type Layout, type Placed } from './layout'
import { createRenderer, type DrawPiece, type Renderer, type Theme } from './gl'
import { createZoom } from './zoom'
import c from './FeedCanvas.module.scss'

const MAXV = 1.8 // px/ms cap for the release inertia
const THROW = 260 // ms of travel per px/ms of release speed
const EASE_K = 0.14 // camera lerp per 60 Hz frame
const GRAIN_MS = 83 // grain steps at 12 fps

type Props = { items: FeedItem[]; active: boolean }

declare global {
  interface Window { __feedCanvas?: { mode: string; frames: number; drawMs: number; speed: number; textures: () => number } }
}

const pad3 = (n: number) => String(Math.abs(n)).padStart(3, '0')

function parseColor(v: string, fallback: [number, number, number]): [number, number, number] {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx || !v) return fallback
  ctx.fillStyle = '#000'
  ctx.fillStyle = v.trim()
  const s = ctx.fillStyle as string
  if (s.startsWith('#') && s.length === 7) return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255) as [number, number, number]
  const m = s.match(/[\d.]+/g)
  return m ? [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255] : fallback
}

function readTheme(): Theme {
  const cs = getComputedStyle(document.documentElement)
  const light = document.documentElement.dataset.theme === 'light'
  return {
    bg: parseColor(cs.getPropertyValue('--c-bg'), [0.063, 0.063, 0.055]),
    fill: parseColor(cs.getPropertyValue('--c-bg-2'), [0.1, 0.1, 0.094]),
    grain: light ? 0.7 : 1, // × the noise texture's own alpha (≤ ~24 %)
    light,
  }
}

export default function FeedCanvas({ items, active }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<HTMLCanvasElement>(null)
  const domRef = useRef<HTMLDivElement>(null)
  const capsRef = useRef<HTMLDivElement>(null)
  const xyRef = useRef<HTMLSpanElement>(null)
  const velRef = useRef<HTMLSpanElement>(null)
  const tileRef = useRef<HTMLSpanElement>(null)
  const miniRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const stage = stageRef.current!, cv = glRef.current!, dom = domRef.current!, caps = capsRef.current!, xy = xyRef.current!, vel = velRef.current!, tileCap = tileRef.current!, mini = miniRef.current!
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fx = reduce ? 0 : 1
    const offs: (() => void)[] = []
    const on = <T extends EventTarget>(t: T, ev: string, fn: (e: never) => void, opt?: AddEventListenerOptions) => {
      t.addEventListener(ev, fn as EventListener, opt)
      offs.push(() => t.removeEventListener(ev, fn as EventListener, opt))
    }

    // ── state ──
    let W = stage.clientWidth, H = stage.clientHeight
    let dpr = Math.min(2, window.devicePixelRatio || 1)
    let L: Layout = makeLayout(items, W)
    const gm = gridMetrics(W)
    let cx = -gm.margin, cy = -L.unit * 0.5, tx = cx, ty = cy
    let pcx = cx, pcy = cy, vx = 0, vy = 0 // smoothed screen velocity, px per 60 Hz frame
    let last = performance.now()
    let placed: (Placed & { sx: number; sy: number; sw: number; sh: number })[] = []
    let hoverKey: string | null = null
    let px = -1, py = -1 // pointer in stage coords
    const lift = new Map<string, number>()
    let zoomIdx: number | null = null
    let dragging = false
    let theme = readTheme()
    let seed = 0
    let onScreen = true
    const stats = { mode: 'webgl', frames: 0, drawMs: 0, speed: 0, textures: () => 0 }
    window.__feedCanvas = stats

    // ── renderer: WebGL2, else DOM ──
    let renderer: Renderer | null = null
    try { renderer = createRenderer(cv, () => wake()) } catch { renderer = null }
    if (!renderer) { stats.mode = 'dom'; cv.hidden = true; dom.hidden = false }
    else stats.textures = () => renderer!.stats().textures
    stage.dataset.mode = stats.mode

    const domPool: HTMLDivElement[] = []
    const domLive = new Map<string, HTMLDivElement>()
    function drawDom(list: DrawPiece[]) {
      const need = new Set<string>()
      for (const p of list) {
        need.add(p.key)
        let e = domLive.get(p.key)
        if (!e) {
          e = domPool.pop() || (() => { const d = document.createElement('div'); d.className = c.domTile; d.appendChild(new Image()); dom.appendChild(d); return d })()
          e.hidden = false
          domLive.set(p.key, e)
        }
        const img = e.firstChild as HTMLImageElement
        if (img.getAttribute('src') !== p.src) { img.src = p.src; img.alt = '' }
        e.style.cssText = `width:${p.w}px;height:${p.h}px;transform:translate3d(${p.x}px,${p.y}px,0);opacity:${p.alpha}`
      }
      domLive.forEach((e, k) => { if (!need.has(k)) { e.hidden = true; domPool.push(e); domLive.delete(k) } })
    }

    // ── size ──
    function resize() {
      const nw = stage.clientWidth, nh = stage.clientHeight
      if (!nw || !nh) return
      const oldU = L.unit
      W = nw; H = nh; dpr = Math.min(2, window.devicePixelRatio || 1)
      L = makeLayout(items, W)
      const k = L.unit / oldU
      cx *= k; cy *= k; tx *= k; ty *= k; pcx = cx; pcy = cy
      cv.style.width = `${W}px`; cv.style.height = `${H}px`
      renderer?.resize(W, H, dpr)
      drawMapBase()
      frame(performance.now(), true)
    }

    // ── minimap ──
    const MW = 132
    const mctx = mini.getContext('2d')!
    const mapBase = document.createElement('canvas')
    let MH = 99
    function drawMapBase() {
      MH = Math.round(MW * TILE.rows / TILE.cols)
      for (const cnv of [mini, mapBase]) { cnv.width = MW * 2; cnv.height = MH * 2 }
      mini.style.width = `${MW}px`; mini.style.height = `${MH}px`
      tileCap.textContent = `Tile ${Math.round(L.TW)} × ${Math.round(L.TH)} · se repite`
      const x = mapBase.getContext('2d')!, s = (MW * 2) / TILE.cols
      const cs = getComputedStyle(stage)
      x.clearRect(0, 0, mapBase.width, mapBase.height)
      x.fillStyle = cs.getPropertyValue('--fc-muted') || 'rgba(255,255,255,0.35)'
      for (const sl of TILE.slots) x.fillRect(sl.x * s, sl.y * s, sl.w * s - 2, sl.h * s - 2)
    }
    function drawMini() {
      mctx.clearRect(0, 0, mini.width, mini.height)
      mctx.drawImage(mapBase, 0, 0)
      const s = (MW * 2) / L.TW
      const vx0 = mod(cx, L.TW) * s, vy0 = mod(cy, L.TH) * s, vw = W * s, vh = H * s
      mctx.strokeStyle = '#ff5c1e'
      mctx.lineWidth = 2
      for (const [ox, oy] of [[0, 0], [-mini.width, 0], [0, -mini.height], [-mini.width, -mini.height]]) mctx.strokeRect(vx0 + ox, vy0 + oy, vw, vh)
    }

    // ── frame ──
    function frame(now: number, force = false) {
      const dt = Math.min(4, Math.max(0.25, (now - last) / 16.667))
      last = now
      if (!dragging) {
        if (reduce) { cx = tx; cy = ty }
        else {
          const k = 1 - Math.pow(1 - EASE_K, dt)
          cx += (tx - cx) * k; cy += (ty - cy) * k
          if (Math.abs(tx - cx) < 0.25 && Math.abs(ty - cy) < 0.25) { cx = tx; cy = ty }
        }
      }
      const rvx = -(cx - pcx) / dt, rvy = -(cy - pcy) / dt
      pcx = cx; pcy = cy
      const sk = 1 - Math.pow(1 - 0.35, dt)
      vx += (rvx - vx) * sk; vy += (rvy - vy) * sk
      if (Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02 && !dragging) { vx = 0; vy = 0 }
      const sp = Math.hypot(vx, vy)

      // Camera breathes out up to 3.5 % with speed (Phantom-style), around the centre.
      const zoom = 1 - 0.035 * Math.min(1, sp / 40) * fx
      const ccx = W / 2, ccy = H / 2
      const raw = visible(L, TILE, cx, cy, W, H, 60)
      let animating = false
      const list: DrawPiece[] = []
      const nextPlaced: typeof placed = []
      for (const p of raw) {
        const target = p.key === hoverKey && !dragging && sp < 3 ? 1 : 0
        let l = lift.get(p.key) || 0
        if (l !== target) {
          l = reduce ? target : l + (target - l) * (1 - Math.pow(1 - 0.22, dt))
          if (Math.abs(target - l) < 0.01) l = target
          animating = animating || l !== target
          if (l === 0) lift.delete(p.key); else lift.set(p.key, l)
        }
        const k = 1 + 0.03 * l
        const w = p.w * zoom * k, h = p.h * zoom * k
        const sx = ccx + (p.x + p.w / 2 - ccx) * zoom - w / 2
        const sy = ccy + (p.y + p.h / 2 - ccy) * zoom - h / 2 - 3 * l
        const it = items[p.idx]
        const big = p.w * dpr > 700
        list.push({ key: p.key, src: big ? it.src : `/feed/t/${it.id}.webp`, iw: it.w, ih: it.h, x: sx, y: sy, w, h, alpha: zoomIdx === p.idx ? 0 : 1 })
        nextPlaced.push({ ...p, sx, sy, sw: w, sh: h })
      }
      placed = nextPlaced
      const t0 = performance.now()
      seed = Math.floor(now / GRAIN_MS) % 997
      if (renderer) renderer.draw(list, W, H, dpr, [vx, vy], fx, theme, reduce ? 1 : seed)
      else drawDom(list)
      stats.drawMs = performance.now() - t0
      stats.frames++
      stats.speed = sp

      // HUD: coordinates in px from the origin, velocity in px per frame while moving.
      xy.textContent = `X ${cx < 0 ? '−' : ''}${Math.abs(Math.round(cx))} · Y ${cy < 0 ? '−' : ''}${Math.abs(Math.round(cy))}`
      const fast = sp > 0.6
      stage.classList.toggle(c.moving, dragging || fast)
      stage.classList.toggle(c.fast, fast)
      if (fast) {
        const ax = Math.round(Math.abs(vx)), ay = Math.round(Math.abs(vy))
        vel.textContent = `VEL ${vx < 0 ? '←' : '→'} ${ax} ${vy < 0 ? '↑' : '↓'} ${ay} PX/F`
      }
      drawMini()
      if (!dragging && sp < 3) hitTest(); else setHover(null)
      drawCaps()

      const moving = Math.abs(tx - cx) > 0.25 || Math.abs(ty - cy) > 0.25 || sp > 0.02 || dragging
      return force ? false : moving || animating || !!renderer?.fading()
    }

    let raf = 0
    function tick(now: number) { raf = 0; if (frame(now)) raf = requestAnimationFrame(tick) }
    function wake() { if (!raf) { last = performance.now() - 16.7; raf = requestAnimationFrame(tick) } }

    // Idle grain: redraw at 12 fps while the stage is visible and still.
    const grainTimer = reduce ? 0 : window.setInterval(() => {
      if (raf || !onScreen || document.hidden || zoom.isOpen() || !renderer) return
      frame(performance.now(), true)
    }, GRAIN_MS)

    // ── hover ──
    function pieceAt(x: number, y: number) {
      for (let i = placed.length - 1; i >= 0; i--) {
        const p = placed[i]
        if (x >= p.sx && x <= p.sx + p.sw && y >= p.sy && y <= p.sy + p.sh) return p
      }
      return null
    }
    function setHover(key: string | null) {
      if (key === hoverKey) return
      hoverKey = key
      stage.classList.toggle(c.overPiece, !!key)
      wake()
    }
    function hitTest() {
      if (px < 0) return setHover(null)
      const p = pieceAt(px, py)
      setHover(p ? p.key : null)
    }
    // Captions under every piece (Figma 6867:1129): "NNN" (the piece's number
    // in the feed), "NNN · Title" on L slots, "NNN · Title · MM/AAAA" on hover.
    // They fade to 25 % while the plane moves (.moving).
    const capPool: HTMLSpanElement[] = []
    const capLive = new Map<string, HTMLSpanElement>()
    function drawCaps() {
      const need = new Set<string>()
      for (const p of placed) {
        if (p.sy + p.sh > H || p.sy + p.sh < -20 || p.sx > W || p.sx + p.sw < 0) continue
        need.add(p.key)
        let e = capLive.get(p.key)
        if (!e) {
          e = capPool.pop() || caps.appendChild(document.createElement('span'))
          e.hidden = false
          capLive.set(p.key, e)
        }
        const it = items[p.idx], n = pad3(p.idx + 1), hov = p.key === hoverKey && zoomIdx === null
        const text = hov ? `${n} · ${it.title} · ${monthYear(it.date)}` : p.w > 450 ? `${n} · ${it.title}` : n
        if (e.textContent !== text) e.textContent = text
        e.className = hov ? `${c.cap} ${c.capOn}` : c.cap
        e.style.transform = `translate3d(${Math.round(p.sx)}px,${Math.round(p.sy + p.sh + 8)}px,0)`
        e.style.maxWidth = `${Math.round(Math.max(60, p.sw))}px`
        e.style.visibility = zoomIdx === p.idx ? 'hidden' : ''
      }
      capLive.forEach((e, k) => { if (!need.has(k)) { e.hidden = true; capPool.push(e); capLive.delete(k) } })
    }

    // ── zoom ──
    const zoom = createZoom(items, {
      rectOf: (idx) => {
        const b = stage.getBoundingClientRect()
        let best: (typeof placed)[number] | null = null, bd = Infinity
        for (const p of placed) {
          if (p.idx !== idx) continue
          const d = Math.hypot(p.sx + p.sw / 2 - W / 2, p.sy + p.sh / 2 - H / 2)
          if (d < bd && p.sx + p.sw > 0 && p.sx < W && p.sy + p.sh > 0 && p.sy < H) { bd = d; best = p }
        }
        return best ? { left: b.left + best.sx, top: b.top + best.sy, width: best.sw, height: best.sh } : null
      },
      onShow: (idx) => { zoomIdx = idx; frame(performance.now(), true) },
      returnFocus: () => stage.focus({ preventScroll: true }),
    })
    function openPiece(p: Placed) {
      setHover(null)
      zoom.open(p.idx, reduce)
    }

    // ── pointer: drag with a 6 px threshold, tap = open ──
    let pid: number | null = null, sx0 = 0, sy0 = 0, lx = 0, ly = 0, moved = false
    let hist: { x: number; y: number; t: number }[] = []
    const local = (e: PointerEvent) => { const b = stage.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] }
    on(stage, 'pointerdown', (e: PointerEvent) => {
      if (e.button > 0 || pid !== null || (e.target as Element).closest('[data-hud]')) return
      pid = e.pointerId; sx0 = lx = e.clientX; sy0 = ly = e.clientY; moved = false
      hist = [{ x: lx, y: ly, t: e.timeStamp }]
      tx = cx; ty = cy // grab stops the glide
    })
    on(stage, 'pointermove', (e: PointerEvent) => {
      const [x, y] = local(e)
      px = x; py = y
      if (e.pointerId !== pid) { if (!raf) { hitTest(); drawCaps() } return }
      let dx = e.clientX - lx, dy = e.clientY - ly
      lx = e.clientX; ly = e.clientY
      if (!moved && Math.hypot(lx - sx0, ly - sy0) > 6) {
        moved = true; dragging = true; dx = lx - sx0; dy = ly - sy0
        try { stage.setPointerCapture(pid) } catch {}
        stage.classList.add(c.dragging)
      }
      if (!moved) return
      hist.push({ x: lx, y: ly, t: e.timeStamp }); if (hist.length > 6) hist.shift()
      cx -= dx; cy -= dy; tx = cx; ty = cy
      wake()
    })
    const up = (e: PointerEvent, cancel: boolean) => {
      if (e.pointerId !== pid) return
      pid = null
      stage.classList.remove(c.dragging)
      if (!moved) {
        if (cancel) return
        const [x, y] = local(e)
        const p = pieceAt(x, y)
        if (p) openPiece(p)
        return
      }
      dragging = false
      const a = hist[0], b = hist[hist.length - 1], dt = Math.max(16, b.t - a.t)
      const still = e.timeStamp - b.t > 90
      if (!still && !reduce) {
        tx -= Math.max(-MAXV, Math.min(MAXV, (b.x - a.x) / dt)) * THROW
        ty -= Math.max(-MAXV, Math.min(MAXV, (b.y - a.y) / dt)) * THROW
      }
      wake()
    }
    on(stage, 'pointerup', (e: PointerEvent) => up(e, false))
    on(stage, 'pointercancel', (e: PointerEvent) => up(e, true))
    on(stage, 'pointerleave', () => { if (pid === null) { px = py = -1; setHover(null) } })
    on(stage, 'dragstart', (e: Event) => e.preventDefault())

    // ── wheel / trackpad ──
    on(stage, 'wheel', (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch-zoom stays the browser's
      e.preventDefault()
      const f = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1
      const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * f, dy = (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * f
      tx += Math.max(-240, Math.min(240, dx)); ty += Math.max(-240, Math.min(240, dy))
      wake()
    }, { passive: false })

    // ── keyboard ──
    on(stage, 'keydown', (e: KeyboardEvent) => {
      if (e.target !== stage) return
      const s = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[e.key]
      if (s) {
        e.preventDefault()
        const step = L.unit * (e.shiftKey ? 6 : 2)
        tx += s[0] * step; ty += s[1] * step
        wake()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        let best: Placed | null = null, bd = Infinity
        for (const p of placed) {
          const d = Math.hypot(p.sx + p.sw / 2 - W / 2, p.sy + p.sh / 2 - H / 2)
          if (d < bd) { bd = d; best = p }
        }
        if (best) openPiece(best)
      } else if (e.key === '0') {
        e.preventDefault()
        tx = -gridMetrics(W).margin; ty = -L.unit * 0.5
        wake()
      }
    })

    // ── minimap: click or drag moves the view inside the current tile ──
    let miniDown = false
    const miniMove = (e: PointerEvent) => {
      const b = mini.getBoundingClientRect()
      const wx = ((e.clientX - b.left) / b.width) * L.TW, wy = ((e.clientY - b.top) / b.height) * L.TH
      tx = Math.floor(cx / L.TW) * L.TW + wx - W / 2
      ty = Math.floor(cy / L.TH) * L.TH + wy - H / 2
      wake()
    }
    on(mini, 'pointerdown', (e: PointerEvent) => { e.stopPropagation(); miniDown = true; try { mini.setPointerCapture(e.pointerId) } catch {} miniMove(e) })
    on(mini, 'pointermove', (e: PointerEvent) => { if (miniDown) miniMove(e) })
    on(mini, 'pointerup', () => { miniDown = false })

    // ── theme, size, visibility ──
    const mo = new MutationObserver(() => { theme = readTheme(); drawMapBase(); frame(performance.now(), true) })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const ro = new ResizeObserver(resize)
    ro.observe(stage)
    const io = new IntersectionObserver(([en]) => { onScreen = en.isIntersecting })
    io.observe(stage)

    resize()
    wake()

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(grainTimer)
      offs.forEach((f) => f())
      mo.disconnect(); ro.disconnect(); io.disconnect()
      zoom.destroy()
      renderer?.destroy()
      dom.replaceChildren()
      caps.replaceChildren()
      stage.classList.remove(c.moving, c.fast, c.overPiece, c.dragging)
      delete stage.dataset.mode
      if (window.__feedCanvas === stats) delete window.__feedCanvas
    }
  }, [active, items])

  return (
    <div
      ref={stageRef}
      className={c.stage}
      tabIndex={0}
      role="region"
      aria-roledescription="canvas"
      aria-label={`Canvas infinito con ${items.length} piezas. Arrastra, usa la rueda o las flechas para moverte; Enter amplía la pieza del centro; 0 vuelve al inicio. La vista Rejilla lista todas las piezas.`}
    >
      <canvas ref={glRef} className={c.gl} aria-hidden="true" data-wf-label={`CANVAS · ${items.length}`} />
      <div ref={domRef} className={c.dom} aria-hidden="true" hidden />
      <div className={c.grainCss} aria-hidden="true" />
      <div ref={capsRef} className={c.caps} aria-hidden="true" />
      <span className={c.cross} aria-hidden="true" />
      <div className={c.hud} data-hud aria-hidden="true">
        <span className={c.chip}>Feed · {items.length} piezas<span className={c.hint}> · Arrastra ↔ ↕</span></span>
        <span ref={xyRef} className={c.chip}>X 0 · Y 0</span>
        <span ref={velRef} className={`${c.chip} ${c.vel}`}>VEL → 0 ↓ 0 PX/F</span>
      </div>
      <div className={c.map} data-hud aria-hidden="true">
        <canvas ref={miniRef} className={c.mini} />
        <span ref={tileRef} className={c.mapCap} />
      </div>
    </div>
  )
}
