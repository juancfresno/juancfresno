'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { SOCIALS, SOCIAL_PREVIEWS, type PreviewId } from '@/content/socials'
import s from './SocialPreview.module.scss'

// ─── Social hover preview ─────────────────────────────────────────────────────
// One global instance (root layout) for every link with `data-social="<id>"`
// (footer wordmarks, ContactBlock text links). ONE preview, shared by all the
// links, drawn on a canvas:
// - Entry: "Despixelado" (Lab 004 · 02). Blocks of 32 css px pop in at random
//   (hash threshold), then the block size halves per step, 32 → 16 → 8 → 4 → 2
//   → 1, until the clip is sharp. Each block is the mean colour of its area
//   (mip chain of the cover-fitted frame, upscaled with smoothing off). 520 ms,
//   linear; the exit is the same timeline mirrored (338 ms = 520 × 0.65), and
//   reversing mid-way continues from the current step.
// - Travel: moving to another network, the same preview flies there on a
//   spring (slight overshoot) and skews with its own velocity, then settles.
//   The clip changes with a quick re-pixelate: the old clip pixelates 1 → 2 → 4
//   → 8, the new one depixelates 8 → 4 → 2 → 1 (240 ms, same mosaic as the entry).
// - Zone: over a link it follows the cursor horizontally (damped, biased to
//   the link's centre) and stays anchored above the link row, so it never
//   covers the links. Keyboard focus anchors it centred above the link.
// - Label: a mono chip riding under the clip, "BEHANCE ↗ @juancfresno · 03/05",
//   scrambles on every change.
// - Size: each entry may bring its own display size (the footer location is a
//   vertical 224 × 400 clip; the socials are 256 × 160). Moving between sizes
//   the frame resizes smoothly while the clip dissolves.
// Rules kept: hover-capable fine pointers only (touch gets nothing); no bytes
// until the first hover (each network's video + poster load on its first
// activation, then stay); prefers-reduced-motion = poster only, no spring,
// skew, mosaic or scramble; Esc, blur, leave or scroll hides.
// transform/opacity on the DOM, everything else on the canvas, one rAF loop.

const W = 256 // default frame (css px)
const H = 160
const MAXW = 256 // canvas backing store: the largest frame any entry uses
const MAXH = 400
const LABEL = 24 // label band under the clip (chip 18 + 6 gap)
const LIFT = 12 // space between the label band and the link
const EDGE = 16
const START = 32 // entry: first block size, css px (halves per step down to 1 device px)

const SIZE_RATE = 14 // 1/s, exponential ease of the frame towards its target size
const T = {
  in: 520, outRatio: 0.65, // exit = entry mirrored, 520 × 0.65 = 338 ms (Lab 004 · 02, linear)
  swap: 240, // network → network: re-pixelate 1 → 8 (old clip) then 8 → 1 (new clip)
  scramble: 260,
  graceOut: 110, // leaving a link: wait this long for the next one before hiding
  follow: 0.65, // 0 = locked to the link centre, 1 = locked to the cursor
}
const SPRING = { k: 380, zeta: 0.62 }
const SKEW_MAX = 9 // deg
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/'

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

const isPreviewId = (v: string | undefined): v is PreviewId => !!v && v in SOCIAL_PREVIEWS
const sizeOf = (id: PreviewId | null) => ({ w: SOCIAL_PREVIEWS[id as PreviewId]?.w ?? W, h: SOCIAL_PREVIEWS[id as PreviewId]?.h ?? H })

type Source = { video: HTMLVideoElement | null; poster: HTMLImageElement | null }

export default function SocialPreview() {
  const floatRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const poolRef = useRef<HTMLDivElement>(null)
  const hideRef = useRef<() => void>(() => {})
  const pathname = usePathname()

  // A route change (page transition) always takes the preview away.
  useEffect(() => { hideRef.current() }, [pathname])

  useEffect(() => {
    const float = floatRef.current
    const canvas = canvasRef.current
    const stage = stageRef.current
    const labelEl = labelRef.current
    const pool = poolRef.current
    const g = canvas?.getContext('2d')
    if (!float || !canvas || !stage || !labelEl || !pool || !g) return

    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)')
    const rmq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduce = rmq.matches
    const onRm = () => { reduce = rmq.matches }
    rmq.addEventListener('change', onRm)

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = MAXW * dpr
    canvas.height = MAXH * dpr

    // Per-network media, created on first activation only.
    const sources: Partial<Record<PreviewId, Source>> = {}
    const load = (id: PreviewId): Source => {
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
    let phaseAt = 0 // start time of the current timeline (shifted when reversing mid-way)
    let cur: PreviewId | null = null
    let prev: PreviewId | null = null
    const sz = { w: W, h: H } // frame being drawn (eases to the target)
    let tgt = { w: W, h: H } // size of the current entry
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

    // Timeline (Lab 004 · 02): raw 0…1 over 520 ms in / 338 ms out; visible
    // amount p = raw in, 1 − raw out. Reversing mid-way continues from here.
    const durOf = (ph: Phase) => (ph === 'out' ? T.in * T.outRatio : T.in)
    const rawOf = (now: number) => clamp((now - phaseAt) / durOf(phase), 0, 1)
    const pOf = (now: number) => {
      if (phase === 'shown') return 1
      if (phase === 'hidden') return 0
      if (reduce) return phase === 'in' ? 1 : 0
      const r = rawOf(now)
      return phase === 'in' ? r : 1 - r
    }
    const go = (to: 'in' | 'out', now: number) => {
      const from = phase === 'in' || phase === 'out' ? rawOf(now) : 1
      phase = to
      phaseAt = now - (from < 1 ? (1 - from) * durOf(to) : 0)
      if (reduce) phaseAt = now - durOf(to)
    }

    const groupOf = (a: HTMLElement) => {
      const root = a.closest('nav, ul, footer, section') ?? document.body
      return Array.from(root.querySelectorAll<HTMLElement>('[data-social]')).filter((x) => SOCIALS.some((o) => o.id === x.dataset.social))
    }
    const labelFor = (a: HTMLElement, id: PreviewId) => {
      const fixed = SOCIAL_PREVIEWS[id]?.label
      if (fixed) return fixed
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
      pos.tx = clamp(x - tgt.w / 2, EDGE, window.innerWidth - tgt.w - EDGE)
      const above = r.top - LIFT - LABEL - tgt.h
      const ty = above >= EDGE ? above : r.bottom + LIFT
      // A tall frame near the bottom of the viewport: keep it on screen.
      pos.ty = clamp(ty, EDGE, Math.max(EDGE, window.innerHeight - tgt.h - LABEL - EDGE))
    }

    const snap = () => { pos.x = pos.tx; pos.y = pos.ty; pos.vx = 0; pos.vy = 0 }

    const play = (id: PreviewId) => {
      const v = sources[id]?.video
      if (!v || reduce) return
      try { v.currentTime = 0 } catch { /* not seekable yet */ }
      v.play().catch(() => {})
    }
    const rest = (id: PreviewId | null) => {
      const v = id ? sources[id]?.video : null
      if (!v) return
      v.pause()
      try { v.currentTime = 0 } catch { /* ignore */ }
    }

    const activate = (a: HTMLElement, id: PreviewId, now: number, viaCursor: boolean) => {
      clearTimeout(hideTimer)
      link = a
      load(id)
      tgt = sizeOf(id)
      aim(viaCursor)
      const text = labelFor(a, id)
      if (phase === 'hidden' || phase === 'out') {
        // Fresh entry (or re-entering mid-exit: the mosaic continues from its step).
        if (phase === 'hidden') { snap(); sz.w = tgt.w; sz.h = tgt.h; labelFrom = '' }
        rest(prev)
        prev = null
        switchAt = -1
        const fresh = phase === 'hidden' || cur !== id
        if (cur && cur !== id) rest(cur)
        cur = id
        if (fresh) play(id)
        go('in', now)
      } else if (id !== cur) {
        // Travel: re-pixelate from the old clip to the new one.
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
      go('out', now)
      run()
    }

    // ── Drawing ──
    const surface = () => getComputedStyle(float).getPropertyValue('--sp-surface').trim() || '#1a1a18'
    const ink = () => getComputedStyle(float).getPropertyValue('--sp-ink').trim() || '#fcfcf7'
    const line = () => getComputedStyle(float).getPropertyValue('--sp-line').trim() || '#3c3c3a'
    let colors = { surface: '#1a1a18', ink: '#fcfcf7', line: '#3c3c3a' }

    // ── Mosaic (2D canvas, device px) ──
    // Cover-fit the source into a base canvas, build a mip chain by halving
    // (each step is an exact box average = the block's mean colour), draw the
    // level that matches the block size into a tiny canvas (size / block) and
    // scale it up with smoothing off. No shader, one drawImage per frame.
    const mk = () => document.createElement('canvas')
    const base = mk()
    const mips: HTMLCanvasElement[] = []
    const tiny = mk()
    const fit = (c: HTMLCanvasElement, w: number, h: number) => {
      if (c.width !== w) c.width = w
      if (c.height !== h) c.height = h
    }
    const source = (id: PreviewId | null): { el: CanvasImageSource; w: number; h: number } | null => {
      if (!id) return null
      const src = sources[id]
      const v = src?.video
      if (v && v.readyState >= 2 && v.videoWidth) return { el: v, w: v.videoWidth, h: v.videoHeight }
      const im = src?.poster
      if (im && im.complete && im.naturalWidth) return { el: im, w: im.naturalWidth, h: im.naturalHeight }
      return null
    }
    // Cover-fit the clip into a w × h canvas context.
    const coverTo = (ctx: CanvasRenderingContext2D, src: { el: CanvasImageSource; w: number; h: number }, w: number, h: number) => {
      const k = Math.max(w / src.w, h / src.h)
      const sw = w / k, sh = h / k
      ctx.drawImage(src.el, (src.w - sw) / 2, (src.h - sh) / 2, sw, sh, 0, 0, w, h)
    }
    // Draw clip `id` at block size `bs` (device px) into the main canvas, over
    // the Wd × Hd frame; `keep` (optional) limits it to the listed blocks.
    const mosaic = (id: PreviewId | null, bs: number, Wd: number, Hd: number, keep?: (cx: number, cy: number) => boolean) => {
      const src = source(id)
      g.save()
      g.beginPath()
      if (keep) {
        for (let y = 0; y * bs < Hd; y++) for (let x = 0; x * bs < Wd; x++) if (keep(x, y)) g.rect(x * bs, y * bs, bs, bs)
      } else g.rect(0, 0, Wd, Hd)
      g.clip()
      if (!src) {
        // Clip not loaded yet: the surface colour stands in (same blocks).
        g.fillStyle = colors.surface
        g.fillRect(0, 0, Wd, Hd)
      } else if (bs <= 1) {
        coverTo(g, src, Wd, Hd)
      } else {
        fit(base, Wd, Hd)
        const bg = base.getContext('2d')!
        bg.imageSmoothingEnabled = true
        coverTo(bg, src, Wd, Hd)
        const lvl = Math.floor(Math.log2(bs))
        let prev: HTMLCanvasElement = base
        for (let i = 1; i <= lvl; i++) {
          const m = (mips[i] ??= mk())
          fit(m, Math.max(1, Math.ceil(prev.width / 2)), Math.max(1, Math.ceil(prev.height / 2)))
          const mg = m.getContext('2d')!
          mg.imageSmoothingEnabled = true
          mg.drawImage(prev, 0, 0, m.width, m.height)
          prev = m
        }
        const tw = Math.ceil(Wd / bs), th = Math.ceil(Hd / bs)
        fit(tiny, tw, th)
        const tg = tiny.getContext('2d')!
        tg.imageSmoothingEnabled = true
        tg.drawImage(prev, 0, 0, tw, th)
        g.imageSmoothingEnabled = false
        g.drawImage(tiny, 0, 0, tw, th, 0, 0, tw * bs, th * bs)
        g.imageSmoothingEnabled = true
      }
      g.restore()
    }
    const hash = (x: number, y: number) => {
      const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
      return v - Math.floor(v)
    }

    // p = visible amount 0…1 (linear). Steps: pop-in at START, then halving to 1.
    const draw = (now: number, p: number) => {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, canvas.width, canvas.height)
      if (p <= 0) return
      const Wd = Math.round(sz.w * dpr), Hd = Math.round(sz.h * dpr)
      const start = Math.max(1, Math.round(START * dpr))
      const n = Math.floor(Math.log2(start)) + 1
      const seg = p * (n + 1)
      let bs = 1
      let pop = false
      if (seg < 1) { pop = true; bs = start }
      else {
        const lv = Math.min(Math.floor(seg - 1), n - 1)
        bs = Math.max(1, Math.floor(start / Math.pow(2, lv) + 0.5))
      }
      // Network swap: old clip pixelates 1→2→4→8, new one depixelates 8→4→2→1.
      let id = cur
      if (switchAt >= 0 && !reduce) {
        const ps = clamp((now - switchAt) / T.swap, 0, 1)
        if (ps < 1) {
          const steps = [2, 4, 8]
          const half = ps < 0.5
          const k = Math.min(2, Math.floor(((half ? ps : ps - 0.5) / 0.5) * 3))
          const sb = Math.round(steps[half ? k : 2 - k] * dpr)
          id = half ? prev : cur
          if (sb > bs) bs = sb
        }
      }
      mosaic(id, bs, Wd, Hd, pop ? (x, y) => hash(x, y) < seg : undefined)

      // 1 css px frame line, only over drawn pixels.
      const lw = Math.max(1, Math.round(dpr))
      g.globalCompositeOperation = 'source-atop'
      g.strokeStyle = colors.line
      g.lineWidth = lw
      g.strokeRect(lw / 2, lw / 2, Wd - lw, Hd - lw)
      g.globalCompositeOperation = 'source-over'
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
        if (i < n || !/[A-Za-z0-9]/.test(ch) || ch === '@') out += ch
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
      if (reduce) { sz.w = tgt.w; sz.h = tgt.h }
      else {
        const k = 1 - Math.exp(-SIZE_RATE * dt)
        sz.w += (tgt.w - sz.w) * k
        sz.h += (tgt.h - sz.h) * k
        if (Math.abs(tgt.w - sz.w) < 0.25) sz.w = tgt.w
        if (Math.abs(tgt.h - sz.h) < 0.25) sz.h = tgt.h
      }
      stage.style.width = `${sz.w.toFixed(2)}px`
      stage.style.height = `${sz.h.toFixed(2)}px`
      const skew = reduce ? 0 : clamp(-pos.vx / 110, -SKEW_MAX, SKEW_MAX)
      float.style.transform = `translate3d(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px, 0) skewX(${skew.toFixed(2)}deg) rotate(${(skew * 0.12).toFixed(3)}deg)`

      const p = pOf(now)
      draw(now, p)
      const shown = p
      labelEl.style.opacity = String(shown)
      labelEl.style.transform = `translate3d(0, ${((1 - shown) * -6).toFixed(2)}px, 0)`
      scramble(now)

      if (switchAt >= 0 && now - switchAt >= T.swap) {
        rest(prev)
        prev = null
        switchAt = -1
      }
      if (phase === 'in' && p >= 1) phase = 'shown'
      if (phase === 'out' && p <= 0) {
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
      if (!a || !isPreviewId(id)) return
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
      if (!a || !isPreviewId(id) || !a.matches(':focus-visible')) return
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
      <div ref={stageRef} className={s.stage}>
        <canvas ref={canvasRef} className={s.canvas} />
      </div>
      <span ref={labelRef} className={s.label} />
      <div ref={poolRef} className={s.pool} />
    </div>
  )
}
