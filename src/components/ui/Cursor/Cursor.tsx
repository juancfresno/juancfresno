'use client'

// Site cursor: Lab 005 variant 05 "Velocity". One dot that splits into red (ahead)
// and blue (behind) along its speed and stretches; clean at rest. Over a context
// it turns into a mono label with its own backdrop.
//
// Context is declared in the markup: data-cursor="link | view | drag | play | copy | text
// | none" (+ data-cursor-label to override the text). Links, buttons and form fields
// get their state on their own. Only on fine pointers that can hover; never on touch.
// One rAF loop (sleeps at rest), transform + opacity only. See CLAUDE.md > Cursor.
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useUi } from '@/i18n/client'
import s from './Cursor.module.scss'

type State = 'base' | 'link' | 'view' | 'drag' | 'play' | 'copy' | 'text'
const STATES = ['link', 'view', 'drag', 'play', 'copy', 'text']
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const approach = (cur: number, tgt: number, dt: number, rate: number, snap: boolean) =>
  snap ? tgt : cur + (tgt - cur) * (1 - Math.exp(-dt * rate))
const op = (e: HTMLElement, o: number) => {
  const v = o < 0.002 ? '0' : o > 0.998 ? '1' : o.toFixed(3)
  if (e.style.opacity !== v) e.style.opacity = v
}
const tf = (e: HTMLElement, x: number, y: number, sx = 1, sy = sx, rot = 0) => {
  e.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)${rot ? ` rotate(${rot.toFixed(2)}deg)` : ''}${sx !== 1 || sy !== 1 ? ` scale(${sx.toFixed(4)},${sy.toFixed(4)})` : ''}`
}

export default function Cursor() {
  const ui = useUi()
  const pathname = usePathname()
  const uiRef = useRef(ui.cursor)
  uiRef.current = ui.cursor
  const refresh = useRef<() => void>(() => {})
  const dots = useRef<(HTMLDivElement | null)[]>([])
  const lbls = useRef<(HTMLDivElement | null)[]>([])
  const chip = useRef<HTMLDivElement>(null)

  // Navigation changes what is under a still pointer: look again once it settles.
  useEffect(() => {
    const a = window.setTimeout(() => refresh.current(), 150)
    const b = window.setTimeout(() => refresh.current(), 900)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [pathname])

  useEffect(() => {
    const fineQ = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduceQ = window.matchMedia('(prefers-reduced-motion: reduce)')
    const D = dots.current as HTMLDivElement[]
    const L = lbls.current as HTMLDivElement[]
    const C = chip.current!
    let enabled = false
    let raf = 0, last = 0
    let reduce = reduceQ.matches
    // pointer + spring state
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0, px = 0, py = 0, svx = 0, svy = 0, sp = 0
    let seen = false, inside = false, vis = 0, press = 0, pressed = false
    let state: State = 'base', label = '', lw = 0, lh = 0, changed = true
    const m = { dot: 1, lbl: 0, cs: 1, csy: 1 }
    let override: { el: Element; label: string; until: number } | null = null
    let overEl: Element | null = null

    const labelFor = (s: State, el: Element | null): string => {
      const T = uiRef.current
      const custom = el?.getAttribute('data-cursor-label')
      if (custom) return custom
      if (s === 'link') return T.link
      if (s === 'view') return T.view
      if (s === 'drag') return T.drag
      if (s === 'play') return el?.getAttribute('aria-pressed') === 'true' ? T.pause : T.play
      if (s === 'copy') return T.copy
      return ''
    }
    const resolve = (target: Element | null) => {
      overEl = target
      let s: State = 'base'
      let el: Element | null = null
      const t = target && target.closest ? target.closest('[data-cursor]') : null
      if (t) {
        const a = t.getAttribute('data-cursor') || ''
        if (STATES.includes(a)) { s = a as State; el = t }
        else if (a === 'none') { s = 'base' }
      }
      // A link or button inside a text block keeps its own state.
      if (s === 'text' && t && target) {
        const inner = target.closest('a[href], button')
        if (inner && t.contains(inner)) { s = 'link'; el = inner }
      }
      if (!t && target && target.closest) {
        const f = target.closest('a[href], button, summary, [role="button"], input, textarea, select, [contenteditable="true"]')
        if (f) {
          const tag = f.tagName
          s = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || f.getAttribute('contenteditable') === 'true' ? 'text' : 'link'
          if (s === 'text' && tag === 'INPUT' && /^(checkbox|radio|range|button|submit|color)$/.test((f as HTMLInputElement).type)) s = 'link'
          el = f
        }
      }
      let lbl = labelFor(s, el)
      if (override && el === override.el && performance.now() < override.until) lbl = override.label
      if (s !== state || lbl !== label) {
        state = s; label = lbl; changed = true
        document.documentElement.setAttribute('data-cursor-state', s)
      }
    }
    refresh.current = () => { if (enabled && seen) resolve(document.elementFromPoint(tx, ty)); kick() }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
      tx = e.clientX; ty = e.clientY
      if (!seen || !inside) { x = tx; y = ty; px = x; py = y; vx = vy = 0 }
      seen = true; inside = true
      resolve(e.target as Element)
      kick()
    }
    const onDown = (e: PointerEvent) => { if (e.pointerType === 'touch') return; pressed = true; kick() }
    const onUp = () => { pressed = false; kick() }
    const onLeave = () => { inside = false; kick() }
    const onClick = (e: MouseEvent) => {
      const t = (e.target as Element)?.closest?.('[data-cursor="copy"]')
      if (!t) return
      override = { el: t, label: uiRef.current.copied, until: performance.now() + 1500 }
      resolve(t); kick()
      window.setTimeout(() => { if (enabled) refresh.current() }, 1550)
    }
    const onScroll = () => { if (seen && inside) resolve(document.elementFromPoint(tx, ty)) }
    const onLeaveDoc = (e: MouseEvent) => { if (!e.relatedTarget) onLeave() }

    const kick = () => { if (!raf && enabled) { last = 0; raf = requestAnimationFrame(tick) } }
    const tick = (now: number) => {
      raf = 0
      const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60
      last = now
      if (frame(dt)) raf = requestAnimationFrame(tick)
    }

    const frame = (dt: number): boolean => {
      const snap = reduce
      const st = state
      // Spring (lag 0.4 as in the Lab): stiffness 332, damping ratio 0.75.
      if (snap) { x = tx; y = ty; vx = vy = 0 }
      else {
        const kS = 332, c = 2 * 0.75 * Math.sqrt(kS)
        const n = Math.ceil(dt / (1 / 240)), h = dt / n
        for (let i = 0; i < n; i++) {
          vx += (kS * (tx - x) - c * vx) * h; vy += (kS * (ty - y) - c * vy) * h
          x += vx * h; y += vy * h
        }
      }
      const ivx = (x - px) / dt, ivy = (y - py) / dt
      px = x; py = y
      svx = snap ? 0 : approach(svx, ivx, dt, 22, false); svy = snap ? 0 : approach(svy, ivy, dt, 22, false)
      sp = Math.hypot(svx, svy)
      const show = inside && seen
      vis = approach(vis, show ? 1 : 0, dt, show ? 30 : 16, snap)
      press = approach(press, pressed && show ? 1 : 0, dt, 28, snap)

      if (changed) {
        const t = st === 'text' || st === 'base' ? '' : label
        for (let i = 0; i < 3; i++) {
          L[i].textContent = t
          L[i].style.fontSize = st === 'link' && t.length <= 2 ? '1.5rem' : ''
        }
        lw = L[1].offsetWidth; lh = L[1].offsetHeight
        C.style.width = `${lw + 24}px`; C.style.height = `${lh + 16}px`
        changed = false
      }
      const T = {
        dot: st === 'base' || st === 'text' ? 1 : 0,
        lbl: st === 'base' || st === 'text' ? 0 : 1,
        cs: st === 'text' ? 2 / 12 : 1,
        csy: st === 'text' ? 24 / 12 : 1,
      }
      let busy = false
      ;(Object.keys(T) as (keyof typeof T)[]).forEach((k) => {
        m[k] = approach(m[k], T[k], dt, 20, snap)
        if (Math.abs(m[k] - T[k]) > 0.002) busy = true
      })
      const ux = sp > 0.01 ? svx / sp : 0, uy = sp > 0.01 ? svy / sp : 0
      const split = snap ? 0 : clamp((sp - 40) / 60, 0, 14)
      const stretch = snap ? 1 : 1 + clamp(sp / 1100, 0, 2.2)
      const deg = (Math.atan2(svy, svx) * 180) / Math.PI
      const off = [split, 0, -split]
      const pr = 1 - 0.25 * press
      for (let j = 0; j < 3; j++) {
        const ox = ux * off[j], oy = uy * off[j]
        if (st === 'text') tf(D[j], x + ox, y + oy, m.cs, m.csy)
        else tf(D[j], x + ox, y + oy, stretch * pr * m.cs, (1 / Math.sqrt(stretch)) * pr * m.csy, sp > 5 ? deg : 0)
        op(D[j], vis * m.dot)
        tf(L[j], x - lw / 2 + ox * 1.4, y - lh / 2 + oy * 1.4); op(L[j], vis * m.lbl)
      }
      tf(C, x - lw / 2 - 12, y - lh / 2 - 8); op(C, vis * m.lbl * 0.94)
      const moving = Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1 || sp > 1
      const fading = show ? vis < 0.999 : vis > 0.001
      return show || fading || moving || busy || split > 0.05
    }

    const html = document.documentElement
    const attach = () => {
      if (enabled) return
      enabled = true
      html.setAttribute('data-cursor-on', '')
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', onDown, { passive: true })
      window.addEventListener('pointerup', onUp, { passive: true })
      window.addEventListener('pointercancel', onUp, { passive: true })
      window.addEventListener('click', onClick, true)
      window.addEventListener('scroll', onScroll, { passive: true })
      document.addEventListener('mouseout', onLeaveDoc)
      window.addEventListener('blur', onLeave)
    }
    const detach = () => {
      if (!enabled) return
      enabled = false
      html.removeAttribute('data-cursor-on'); html.removeAttribute('data-cursor-state')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('click', onClick, true)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mouseout', onLeaveDoc)
      window.removeEventListener('blur', onLeave)
      if (raf) cancelAnimationFrame(raf)
      raf = 0; seen = false; inside = false; vis = 0
      ;[...D, ...L, C].forEach((e) => { e.style.opacity = '0' })
    }
    const sync = () => (fineQ.matches ? attach() : detach())
    const onReduce = () => { reduce = reduceQ.matches; changed = true; kick() }
    sync()
    fineQ.addEventListener('change', sync)
    reduceQ.addEventListener('change', onReduce)
    // Label strings follow the locale.
    changed = true
    return () => {
      detach()
      fineQ.removeEventListener('change', sync)
      reduceQ.removeEventListener('change', onReduce)
    }
  }, [])

  // Siblings of <body>'s content, not wrapped: mix-blend-mode needs the page as backdrop.
  return (
    <>
      {['r', 'g', 'b'].map((c, i) => (
        <div key={`d${c}`} ref={(e) => { dots.current[i] = e }} className={`${s.dot} ${s[c]}`} aria-hidden="true" />
      ))}
      <div ref={chip} className={s.chip} aria-hidden="true" />
      {['r', 'g', 'b'].map((c, i) => (
        <div key={`l${c}`} ref={(e) => { lbls.current[i] = e }} className={`${s.lbl} ${s[c]}`} aria-hidden="true" />
      ))}
    </>
  )
}
