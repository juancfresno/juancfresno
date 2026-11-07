'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { SOCIALS, SOCIAL_PREVIEWS, type SocialId } from '@/content/site'
import s from './SocialPreview.module.scss'

// ─── Social hover preview ─────────────────────────────────────────────────────
// One global instance (root layout) for every link with `data-social="<id>"`
// (footer wordmarks, ContactBlock text links). ONE preview, shared by all the
// links, drawn on a canvas:
// - Entry: the clip drops in through 12 columns (the site grid), staggered
//   outwards from the column under the cursor; an orange scan line rides the
//   bottom edge of each column. Exit: the columns retract.
// - Travel: moving to another network, the same preview flies there on a
//   spring (slight overshoot) and skews with its own velocity, then settles.
//   The clip changes with a Bayer-ordered pixel dissolve (transition 05's
//   pattern) whose front flashes in --c-text.
// - Zone: over a link it follows the cursor horizontally (damped, biased to
//   the link's centre) and stays anchored above the link row, so it never
//   covers the links. Keyboard focus anchors it centred above the link.
// - Label: a mono chip riding under the clip, "BEHANCE ↗ @juancfresno · 03/05",
//   scrambles on every change.
// Rules kept: hover-capable fine pointers only (touch gets nothing); no bytes
// until the first hover (each network's video + poster load on its first
// activation, then stay); prefers-reduced-motion = poster only, no spring,
// skew, wipe, dissolve or scramble; Esc, blur, leave or scroll hides.
// transform/opacity on the DOM, everything else on the canvas, one rAF loop.

const W = 256
const H = 160
const COLS = 12
const LABEL = 24 // label band under the clip (chip 18 + 6 gap)
const LIFT = 12 // space between the label band and the link
const EDGE = 16
const BLOCK = 8 // dissolve cell, css px

const T = {
  wipeIn: 210, wipeInStagger: 16,
  wipeOut: 140, wipeOutStagger: 9,
  dissolve: 240, front: 0.14,
  scramble: 260,
  graceOut: 110, // leaving a link: wait this long for the next one before hiding
  follow: 0.65, // 0 = locked to the link centre, 1 = locked to the cursor
}
const SPRING = { k: 380, zeta: 0.62 }
const SKEW_MAX = 9 // deg
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/'
const ACCENT = 'rgb(255, 92, 30)' // GridOverlay orange

const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
const quadInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

const isSocialId = (v: string | undefined): v is SocialId => !!v && v in SOCIAL_PREVIEWS

type Source = { video: HTMLVideoElement | null; poster: HTMLImageElement | null }

export default function SocialPreview() {
  const floatRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const poolRef = useRef<HTMLDivElement>(null)
  const hideRef = useRef<() => void>(() => {})
  const pathname = usePathname()

  // A route change (page transition) always takes the preview away.
  useEffect(() => { hideRef.current() }, [pathname])

  useEffect(() => {
    const float = floatRef.current
    const canvas = canvasRef.current
    const labelEl = labelRef.current
    const pool = poolRef.current
    const g = canvas?.getContext('2d')
    if (!float || !canvas || !labelEl || !pool || !g) return

    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)')
    const rmq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduce = rmq.matches
    const onRm = () => { reduce = rmq.matches }
    rmq.addEventListener('change', onRm)

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr

    // Per-network media, created on first activation only.
    const sources: Partial<Record<SocialId, Source>> = {}
    const load = (id: SocialId): Source => {
      const have = sources[id]
      if (have) return have
      const m = SOCIAL_PREVIEWS[id]!
      let poster: HTMLImageElement | null = null
      if (m.poster) {
        poster = new Image()
        poster.decoding = 'async'
        poster.src = m.poster
      }
      let video: HTMLVideoElement | null = null
      if (!reduce && (m.webm || m.mp4)) {
        video = document.createElement('video')
        video.muted = true
        video.loop = true
        video.playsInline = true
        video.preload = 'auto'
        video.disablePictureInPicture = true
        video.setAttribute('aria-hidden', 'true')
        video.tabIndex = -1
        for (const [src, type] of [[m.webm, 'video/webm'], [m.mp4, 'video/mp4']] as const) {
          if (!src) continue
          const el = document.createElement('source')
          el.src = src
          el.type = type
          video.appendChild(el)
        }
        pool.appendChild(video)
      }
      const src = { video, poster }
      sources[id] = src
      return src
    }

    // ── State ──
    type Phase = 'hidden' | 'in' | 'shown' | 'out'
    let phase: Phase = 'hidden'
    let phaseAt = 0
    let origin = COLS / 2 // column the wipe starts from
    let cur: SocialId | null = null
    let prev: SocialId | null = null
    let switchAt = -1
    let link: HTMLElement | null = null
    let cursorX = 0
    const pos = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 }
    let raf = 0
    let last = 0
    let hideTimer = 0
    let labelFrom = ''
    let labelTo = ''
    let labelAt = -1

    const groupOf = (a: HTMLElement) => {
      const root = a.closest('nav, ul, footer, section') ?? document.body
      return Array.from(root.querySelectorAll<HTMLElement>('[data-social]')).filter((x) => isSocialId(x.dataset.social))
    }
    const labelFor = (a: HTMLElement, id: SocialId) => {
      const name = (SOCIALS.find((x) => x.id === id)?.label ?? id).toUpperCase()
      let handle = ''
      try {
        const seg = new URL((a as HTMLAnchorElement).href).pathname.split('/').filter(Boolean).pop()
        if (seg) handle = ` @${seg.toLowerCase()}`
      } catch { /* keep it short */ }
      const group = groupOf(a)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${name} ↗${handle} · ${pad(group.indexOf(a) + 1)}/${pad(group.length)}`
    }

    // Where the preview wants to be for the current link (+ cursor when hovering).
    const aim = (useCursor: boolean) => {
      if (!link) return
      const r = link.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const x = useCursor ? cx + (clamp(cursorX, r.left, r.right) - cx) * T.follow : cx
      pos.tx = clamp(x - W / 2, EDGE, window.innerWidth - W - EDGE)
      const above = r.top - LIFT - LABEL - H
      pos.ty = above >= EDGE ? above : r.bottom + LIFT
    }

    const snap = () => { pos.x = pos.tx; pos.y = pos.ty; pos.vx = 0; pos.vy = 0 }

    const play = (id: SocialId) => {
      const v = sources[id]?.video
      if (!v || reduce) return
      try { v.currentTime = 0 } catch { /* not seekable yet */ }
      v.play().catch(() => {})
    }
    const rest = (id: SocialId | null) => {
      const v = id ? sources[id]?.video : null
      if (!v) return
      v.pause()
      try { v.currentTime = 0 } catch { /* ignore */ }
    }

    const activate = (a: HTMLElement, id: SocialId, now: number, viaCursor: boolean) => {
      clearTimeout(hideTimer)
      link = a
      load(id)
      aim(viaCursor)
      const text = labelFor(a, id)
      if (phase === 'hidden' || phase === 'out') {
        // Fresh entry: appear in place, columns drop in from the cursor's column.
        if (phase === 'hidden') snap()
        rest(prev)
        prev = null
        switchAt = -1
        if (cur && cur !== id) rest(cur)
        cur = id
        play(id)
        origin = viaCursor ? clamp(((cursorX - pos.x) / W) * COLS, 0, COLS - 1) : (COLS - 1) / 2
        phase = 'in'
        phaseAt = now
        labelFrom = ''
      } else if (id !== cur) {
        // Travel: dissolve from the old clip to the new one.
        rest(prev)
        prev = cur
        cur = id
        switchAt = now
        play(id)
        labelFrom = labelEl.textContent ?? ''
      }
      if (text !== labelTo) {
        labelTo = text
        labelAt = now
        labelEl.setAttribute('data-text', text)
      }
      float.style.visibility = 'visible'
      run()
    }

    const hide = (now = performance.now()) => {
      clearTimeout(hideTimer)
      if (phase === 'hidden' || phase === 'out') return
      phase = 'out'
      phaseAt = now
      run()
    }

    // ── Drawing ──
    const surface = () => getComputedStyle(float).getPropertyValue('--sp-surface').trim() || '#1a1a18'
    const ink = () => getComputedStyle(float).getPropertyValue('--sp-ink').trim() || '#fcfcf7'
    const line = () => getComputedStyle(float).getPropertyValue('--sp-line').trim() || '#3c3c3a'
    let colors = { surface: '#1a1a18', ink: '#fcfcf7', line: '#3c3c3a' }

    const paint = (id: SocialId | null) => {
      if (!id) return
      const src = sources[id]
      const v = src?.video
      if (v && v.readyState >= 2) { g.drawImage(v, 0, 0, W, H); return }
      const p = src?.poster
      if (p && p.complete && p.naturalWidth) { g.drawImage(p, 0, 0, W, H); return }
      g.fillStyle = colors.surface
      g.fillRect(0, 0, W, H)
    }

    // Column heights 0…1 for the current phase.
    const colW = W / COLS
    const heights = (now: number) => {
      const t = now - phaseAt
      const h: number[] = []
      for (let i = 0; i < COLS; i++) {
        if (phase === 'shown') { h.push(1); continue }
        if (reduce) { h.push(phase === 'in' ? 1 : 0); continue }
        const d = Math.abs(i - origin)
        if (phase === 'in') h.push(expoOut(clamp((t - d * T.wipeInStagger) / T.wipeIn, 0, 1)))
        else h.push(1 - quadInOut(clamp((t - d * T.wipeOutStagger) / T.wipeOut, 0, 1)))
      }
      return h
    }

    const draw = (now: number) => {
      const h = heights(now)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, W, H)
      g.save()
      g.beginPath()
      for (let i = 0; i < COLS; i++) {
        const x0 = Math.round(i * colW), x1 = Math.round((i + 1) * colW)
        if (h[i] > 0) g.rect(x0, 0, x1 - x0, H * h[i])
      }
      g.clip()

      const ps = switchAt < 0 || reduce ? 1 : clamp((now - switchAt) / T.dissolve, 0, 1)
      if (ps >= 1) {
        paint(cur)
      } else {
        paint(prev)
        // Bayer dissolve: cells below the threshold show the new clip, the
        // front band flashes in ink.
        const cols = Math.ceil(W / BLOCK), rows = Math.ceil(H / BLOCK)
        g.save()
        g.beginPath()
        const front: [number, number][] = []
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const th = (BAYER[y % 4][x % 4] + 0.5) / 16 * (1 - T.front)
            if (ps >= th + T.front) g.rect(x * BLOCK, y * BLOCK, BLOCK, BLOCK)
            else if (ps >= th) front.push([x * BLOCK, y * BLOCK])
          }
        }
        g.clip()
        paint(cur)
        g.restore()
        g.fillStyle = colors.ink
        for (const [x, y] of front) g.fillRect(x, y, BLOCK, BLOCK)
      }

      // Frame + scan lines on the growing columns.
      g.strokeStyle = colors.line
      g.lineWidth = 1
      g.strokeRect(0.5, 0.5, W - 1, H - 1)
      g.restore()
      g.fillStyle = ACCENT
      for (let i = 0; i < COLS; i++) {
        if (h[i] <= 0 || h[i] >= 1) continue
        const x0 = Math.round(i * colW), x1 = Math.round((i + 1) * colW)
        g.fillRect(x0, Math.max(0, H * h[i] - 1), x1 - x0, 1)
      }
      return h
    }

    const scramble = (now: number) => {
      if (labelAt < 0) return
      const p = reduce ? 1 : clamp((now - labelAt) / T.scramble, 0, 1)
      const to = labelTo
      if (p >= 1) { labelEl.textContent = to; labelAt = -1; return }
      const n = Math.floor(p * to.length)
      let out = ''
      for (let i = 0; i < to.length; i++) {
        const ch = to[i]
        if (i < n || ch === ' ' || ch === '·' || ch === '↗' || ch === '/') out += ch
        else out += i < labelFrom.length && Math.random() < 0.25 ? labelFrom[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0]
      }
      labelEl.textContent = out
    }

    // ── Loop ──
    const tick = (now: number) => {
      raf = 0
      const dt = Math.min(1 / 30, last ? (now - last) / 1000 : 1 / 60)
      last = now

      if (reduce) snap()
      else {
        const c = 2 * SPRING.zeta * Math.sqrt(SPRING.k)
        pos.vx += (SPRING.k * (pos.tx - pos.x) - c * pos.vx) * dt
        pos.vy += (SPRING.k * (pos.ty - pos.y) - c * pos.vy) * dt
        pos.x += pos.vx * dt
        pos.y += pos.vy * dt
      }
      const skew = reduce ? 0 : clamp(-pos.vx / 110, -SKEW_MAX, SKEW_MAX)
      float.style.transform = `translate3d(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px, 0) skewX(${skew.toFixed(2)}deg) rotate(${(skew * 0.12).toFixed(3)}deg)`

      const h = draw(now)
      const shown = h.reduce((a, b) => a + b, 0) / COLS
      labelEl.style.opacity = String(shown)
      labelEl.style.transform = `translate3d(0, ${((1 - shown) * -6).toFixed(2)}px, 0)`
      scramble(now)

      if (switchAt >= 0 && now - switchAt >= T.dissolve) {
        rest(prev)
        prev = null
        switchAt = -1
      }
      if (phase === 'in' && h.every((v) => v >= 1)) phase = 'shown'
      if (phase === 'out' && h.every((v) => v <= 0)) {
        phase = 'hidden'
        rest(cur)
        rest(prev)
        prev = null
        switchAt = -1
        link = null
        labelTo = ''
        labelEl.textContent = ''
        float.style.visibility = 'hidden'
        last = 0
        return
      }
      raf = requestAnimationFrame(tick)
    }
    const run = () => {
      colors = { surface: surface(), ink: ink(), line: line() }
      if (!raf) raf = requestAnimationFrame(tick)
    }

    // ── Events (delegated) ──
    const linkOf = (t: EventTarget | null) =>
      t instanceof Element ? (t.closest('[data-social]') as HTMLElement | null) : null

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !canHover.matches) return
      const a = linkOf(e.target)
      const id = a?.dataset.social
      if (!a || !isSocialId(id)) return
      cursorX = e.clientX
      if (a === link && phase !== 'out' && phase !== 'hidden') { clearTimeout(hideTimer); return }
      activate(a, id, performance.now(), true)
    }
    const onOut = (e: PointerEvent) => {
      const a = linkOf(e.target)
      if (!a || (e.relatedTarget instanceof Node && a.contains(e.relatedTarget))) return
      clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => hide(), T.graceOut)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !link || phase === 'hidden' || phase === 'out') return
      cursorX = e.clientX
      if (linkOf(e.target) === link) aim(true)
    }
    const onFocusIn = (e: FocusEvent) => {
      if (!canHover.matches) return
      const a = linkOf(e.target)
      const id = a?.dataset.social
      if (!a || !isSocialId(id) || !a.matches(':focus-visible')) return
      activate(a, id, performance.now(), false)
    }
    const onFocusOut = (e: FocusEvent) => {
      if (!linkOf(e.target)) return
      clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => hide(), T.graceOut)
    }
    hideRef.current = () => hide()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    // Leaving through any other link (navigation starts on click) hides it too.
    const onDown = (e: PointerEvent) => { if (!linkOf(e.target)) hide() }
    document.addEventListener('pointerdown', onDown)
    const onScroll = () => hide()

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(hideTimer)
      rmq.removeEventListener('change', onRm)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', onScroll)
      hideRef.current = () => {}
      for (const src of Object.values(sources)) src?.video?.pause()
    }
  }, [])

  return (
    <div ref={floatRef} className={s.float} aria-hidden="true">
      <canvas ref={canvasRef} className={s.canvas} />
      <span ref={labelRef} className={s.label} />
      <div ref={poolRef} className={s.pool} />
    </div>
  )
}
