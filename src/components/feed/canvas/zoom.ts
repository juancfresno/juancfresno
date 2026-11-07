// ─── Feed canvas: open piece (FLIP zoom) ─────────────────────────────────────
// Port of Lab 003 · Galerías' shared zoom (variant 06), dressed as Figma
// "Feed · Canvas · pieza abierta" (6867:1566): a 90 % ink veil under the header,
// the piece grows from its slot to ~60 % of the width (1008 px at 1680; full
// width on phones), its original slot stays outlined (dashed), and under it:
// "NNN · Title", "MM/AAAA · SOURCE · SESIÓN …", "VER POST ORIGINAL ↗",
// "NNN / 201" and the hint chip. ← → browse, Esc / click outside / drag down
// close; focus is trapped in the dialog and returns to the canvas. The full
// 900 px file loads only here (the 600 px thumbnail shows first).
import type { FeedItem } from '@/content/feed'
import { monthYear, groupFeed } from '@/content/feed'
import s from './zoom.module.scss'

const EASE = 'cubic-bezier(0.19, 1, 0.22, 1)'
type Rect = { left: number; top: number; width: number; height: number }

export type ZoomHooks = {
  rectOf: (idx: number) => Rect | null // where the piece is on screen now (null = off screen)
  onShow: (idx: number | null) => void // which piece the zoom covers (the canvas hides it)
  returnFocus: () => void
}

const pad3 = (n: number) => String(n).padStart(3, '0')
const SOURCE = { dribbble: 'Dribbble', instagram: 'Instagram' } as const

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text) e.textContent = text
  return e
}

export function createZoom(items: FeedItem[], hooks: ZoomHooks) {
  // Session of each piece, for the meta line.
  const session = new Map<string, string>()
  for (const g of groupFeed(items)) for (const it of g.items) session.set(it.id, g.session ? g.label.replace('Sesión · ', 'Sesión ') : 'Sesión sueltos')

  let z: null | {
    i: number; wrap: HTMLDivElement; back: HTMLDivElement; img: HTMLDivElement; pic: HTMLImageElement
    slot: HTMLDivElement; info: HTMLDivElement; title: HTMLParagraphElement; meta: HTMLParagraphElement
    link: HTMLAnchorElement; count: HTMLSpanElement; reduce: boolean; closing?: boolean; offs: (() => void)[]
  } = null

  const top = () => {
    const h = document.querySelector('[data-site-header]')
    return h ? Math.max(0, h.getBoundingClientRect().bottom) : 0
  }
  function target(it: FeedItem) {
    const vw = innerWidth, vh = innerHeight, small = vw <= 720
    const y0 = (small ? 16 : 48), below = small ? 132 : 150
    const aw = small ? vw - 32 : Math.min(vw - 128, vw * 0.6)
    const ah = vh - top() - y0 - below, r = it.w / it.h
    let w = aw, h = w / r
    if (h > ah) { h = ah; w = h * r }
    return { x: (vw - w) / 2, y: y0, w, h } // y relative to the wrap (under the header)
  }
  function from(r: Rect, t: ReturnType<typeof target>) {
    const T = top()
    const k = Math.max(r.width / t.w, r.height / t.h)
    const tx = r.left + r.width / 2 - t.x - (t.w * k) / 2, ty = r.top - T + r.height / 2 - t.y - (t.h * k) / 2
    const ix = Math.max(0, (t.w - r.width / k) / 2), iy = Math.max(0, (t.h - r.height / k) / 2)
    return { transform: `translate(${tx}px,${ty}px) scale(${k})`, clipPath: `inset(${iy}px ${ix}px)` }
  }
  function place(it: FeedItem) {
    const t = target(it)
    z!.wrap.style.top = `${top()}px`
    Object.assign(z!.img.style, { left: `${t.x}px`, top: `${t.y}px`, width: `${t.w}px`, height: `${t.h}px` })
    Object.assign(z!.info.style, { left: `${t.x}px`, top: `${t.y + t.h + 20}px`, width: `${t.w}px` })
    const r = hooks.rectOf(z!.i)
    z!.slot.hidden = !r
    if (r) Object.assign(z!.slot.style, { left: `${r.left - 6}px`, top: `${r.top - top() - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` })
    return t
  }
  function show(i: number) {
    const it = items[i]
    z!.i = i
    hooks.onShow(i)
    const p = z!.pic, thumb = `/feed/t/${it.id}.webp`
    if (p.getAttribute('src') !== thumb) p.src = thumb
    const big = new Image()
    big.onload = () => { if (z && z.i === i) p.src = it.src }
    big.src = it.src
    p.alt = it.title
    z!.title.textContent = `${pad3(i + 1)} · ${it.title}`
    z!.meta.textContent = `${monthYear(it.date)} · ${SOURCE[it.source]} · ${session.get(it.id) ?? ''}`
    z!.link.href = it.url
    z!.link.setAttribute('aria-label', `Ver post original en ${SOURCE[it.source]} (se abre en otra pestaña)`)
    z!.count.textContent = `${pad3(i + 1)} / ${pad3(items.length)}`
    return place(it)
  }

  function close() {
    if (!z || z.closing) return
    const cur = z
    cur.closing = true
    const it = items[cur.i], r = hooks.rectOf(cur.i)
    const done = () => {
      cur.offs.forEach((f) => f())
      cur.wrap.remove()
      document.documentElement.classList.remove(s.lock)
      hooks.onShow(null)
      hooks.returnFocus()
    }
    z = null
    if (cur.reduce) return done()
    cur.wrap.classList.remove(s.open)
    const t = target(it), start = cur.img.style.transform || 'none'
    const a = r ? from(r, t) : { transform: `${start} scale(0.9)`, clipPath: 'inset(0px 0px)' }
    const anim = cur.img.animate(
      [{ transform: start, clipPath: 'inset(0px 0px)', opacity: 1 }, { transform: a.transform, clipPath: a.clipPath, opacity: r ? 1 : 0 }],
      { duration: 420, easing: EASE, fill: 'forwards' },
    )
    anim.onfinish = done
  }

  function nav(d: number) {
    if (!z) return
    z.img.style.transform = ''
    show((z.i + d + items.length) % items.length)
    if (!z.reduce) z.img.animate([{ opacity: 0, transform: `translateX(${d * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE })
  }

  function open(i: number, reduce: boolean) {
    if (z) return
    const offs: (() => void)[] = []
    const on = <T extends EventTarget>(t: T, ev: string, fn: (e: never) => void) => {
      t.addEventListener(ev, fn as EventListener)
      offs.push(() => t.removeEventListener(ev, fn as EventListener))
    }
    const wrap = el('div', s.zoom)
    wrap.setAttribute('role', 'dialog')
    wrap.setAttribute('aria-modal', 'true')
    wrap.setAttribute('aria-label', 'Pieza ampliada')
    const back = el('div', s.back)
    const slot = el('div', s.slot)
    const img = el('div', s.img)
    const pic = el('img')
    pic.draggable = false
    img.appendChild(pic)
    const info = el('div', s.info)
    const left = el('div', s.col), right = el('div', `${s.col} ${s.right}`)
    const title = el('p', s.title), meta = el('p', s.meta)
    const link = el('a', s.link, 'Ver post original ↗')
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.setAttribute('data-no-transition', '')
    const count = el('span', s.count)
    left.append(title, meta)
    right.append(link, count)
    info.append(left, right)
    const hint = el('p', s.hint, 'Esc cerrar · ← → anterior / siguiente · click fuera cierra')
    hint.setAttribute('aria-hidden', 'true')
    // Keyboard / touch controls: visually hidden until focused, the close button visible on touch.
    const ctl = el('div', s.ctl)
    const prev = el('button', s.btn, '←'), next = el('button', s.btn, '→'), x = el('button', `${s.btn} ${s.x}`, 'Cerrar ✕')
    prev.type = next.type = x.type = 'button'
    prev.setAttribute('aria-label', 'Anterior')
    next.setAttribute('aria-label', 'Siguiente')
    x.setAttribute('aria-label', 'Cerrar (Esc)')
    ctl.append(prev, next, x)
    wrap.append(back, slot, img, info, hint, ctl)
    document.body.appendChild(wrap)
    document.documentElement.classList.add(s.lock)
    z = { i, wrap, back, img, pic, slot, info, title, meta, link, count, reduce, offs }
    const r = hooks.rectOf(i)
    const tr = show(i)
    if (!reduce) {
      const a = r ? from(r, tr) : { transform: 'scale(0.92)', clipPath: 'inset(0px 0px)' }
      img.animate([{ transform: a.transform, clipPath: a.clipPath, opacity: r ? 1 : 0 }, { transform: 'none', clipPath: 'inset(0px 0px)', opacity: 1 }], { duration: 520, easing: EASE })
    }
    requestAnimationFrame(() => wrap.classList.add(s.open))
    link.focus({ preventScroll: true })
    on(back, 'click', close)
    on(x, 'click', close)
    on(prev, 'click', () => nav(-1))
    on(next, 'click', () => nav(1))
    on(wrap, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); nav(-1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nav(1) }
      else if (e.key === 'Tab') {
        const f = [link, prev, next, x], k = f.indexOf(document.activeElement as never)
        e.preventDefault()
        f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus()
      }
    })
    on(window, 'resize', () => { if (z) place(items[z.i]) })
    // Drag the image to close: it follows the pointer, the veil fades.
    let id: number | null = null, sx = 0, sy = 0, dx = 0, dy = 0, lt = 0, vy = 0
    on(img, 'pointerdown', (e: PointerEvent) => { id = e.pointerId; sx = e.clientX; sy = e.clientY; lt = e.timeStamp; img.setPointerCapture(id) })
    on(img, 'pointermove', (e: PointerEvent) => {
      if (e.pointerId !== id) return
      const ny = e.clientY - sy
      vy = (ny - dy) / Math.max(1, e.timeStamp - lt); lt = e.timeStamp
      dx = e.clientX - sx; dy = ny
      img.style.transform = `translate(${dx}px,${dy}px) scale(${1 - Math.min(Math.abs(dy) / 1600, 0.2)})`
      back.style.opacity = String(0.9 * (1 - Math.min(Math.abs(dy) / 400, 0.7)))
    })
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return
      id = null
      if (Math.abs(dy) > 120 || Math.abs(vy) > 0.6) close()
      else {
        img.animate([{ transform: img.style.transform || 'none' }, { transform: 'none' }], { duration: 300, easing: EASE })
        img.style.transform = ''
        back.style.opacity = ''
      }
      dx = dy = vy = 0
    }
    on(img, 'pointerup', up)
    on(img, 'pointercancel', up)
  }

  return {
    open,
    close,
    isOpen: () => !!z,
    destroy: () => {
      if (!z) return
      z.offs.forEach((f) => f())
      z.wrap.remove()
      document.documentElement.classList.remove(s.lock)
      z = null
    },
  }
}
