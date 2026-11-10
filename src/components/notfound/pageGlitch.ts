// ─── 404 · page-wide glitch bursts ────────────────────────────────────────────
// Every now and then the WHOLE screen breaks: header (face, FRESNO wordmark,
// line), card, footer, socials and the snow, not just the card.
//
// Rhythm: quiet 1.5–5 s → a burst of 150–600 ms with 2–5 sub-hits (each 2–6
// frames, tiny gaps between them); ~1 burst in 5 is a "big" one (longer,
// stronger). Each sub-hit mixes:
//   SLICES · 3–7 horizontal bands of the viewport slide ±20–80 px (±140 big).
//            Faked with clones: one fixed layer over everything holds a few
//            strips, each a clone of the page (canvas → a snapshot of the
//            snow) clipped to its band (clip-path) and moved (transform).
//            The clones are built once per burst and dropped after it.
//   RGB    · red/blue drop-shadow copies of header, card and footer, offset
//            8–28 px (html[data-ns-rgb] + --ns-split; CSS in the module).
//   JUMP   · the picture rolls: translate/skew on <html> (moves fixed chrome).
//   FLASH  · one frame of invert / hue flash (filter on <html>).
//   SNOW   · a heavy tear in the canvas (noSignal.kick).
// Only transform / filter / clip-path change per frame. Reduced motion: none
// of it. Hidden tab: no bursts. stop() removes the layer and every attribute
// and inline style it put on <html>.

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1))
const sign = () => (Math.random() < 0.5 ? -1 : 1)

const QUIET: [number, number] = [1500, 5000]
const BURST: [number, number] = [150, 600]
const BIG_BURST: [number, number] = [450, 900]
const FRAME = 1000 / 60
// What the aimed slices hit: the plate, the header's logos, the footer rows.
const AIMS = '[data-ns-card], [data-site-header] a, [data-site-header] svg, footer > div > *'

type Hit = {
  at: number // ms from burst start
  dur: number
  slices: { top: number; bottom: number; dx: number }[] // viewport %, px
  split: number // px, 0 = none
  jump: string // transform for <html>, '' = none
  flash: string // filter for <html> (first frame only), '' = none
  power: number // snow tear strength
}

export function startPageGlitch(opts: {
  snow: HTMLCanvasElement | null
  kick?: (frames: number, power: number) => void
}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}

  const root = document.documentElement
  const source = document.querySelector<HTMLElement>('[data-site-header]')?.parentElement
  if (!source) return () => {}

  let layer: HTMLDivElement | null = null
  let timer = 0
  let raf = 0
  let hits: Hit[] = []
  let burstStart = 0
  let burstEnd = 0
  let shown = -1 // index of the hit on screen

  // ─── Plan ─────────────────────────────────────────────────────────────────
  const planBurst = () => {
    const big = Math.random() < 0.2
    const total = rand(...(big ? BIG_BURST : BURST))
    const n = big ? randInt(4, 6) : randInt(2, 5)
    const list: Hit[] = []
    let at = 0
    for (let i = 0; i < n && at < total; i++) {
      const dur = randInt(2, 6) * FRAME
      const k = big ? 1.75 : 1
      const slices: Hit['slices'] = []
      if (Math.random() < 0.8) {
        const count = randInt(3, big ? 8 : 6)
        // Snow shifted over snow is invisible: most hits aim one or two bands
        // at what reads (the plate, the header, the footer).
        const vh = innerHeight
        const aims = [...document.querySelectorAll<HTMLElement>(AIMS)]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.height > 0 && r.bottom > 0 && r.top < vh)
        for (let j = 0; j < Math.min(count, randInt(1, 2)) && aims.length; j++) {
          const r = aims[randInt(0, aims.length - 1)]
          const a = r.top + rand(0, 0.6) * r.height
          const b = Math.min(r.bottom, a + rand(0.25, 0.7) * r.height + 4)
          slices.push({
            top: (Math.max(0, a) / vh) * 100,
            bottom: Math.max(0, 100 - (b / vh) * 100),
            dx: Math.round(rand(20, 80) * k) * sign(),
          })
        }
        for (let j = slices.length; j < count; j++) {
          const top = rand(0, 96)
          const hgt = Math.random() < 0.3 ? rand(0.4, 1.5) : rand(2, big ? 18 : 11)
          slices.push({ top, bottom: Math.max(0, 100 - top - hgt), dx: Math.round(rand(20, 80) * k) * sign() })
        }
      }
      const roll = Math.random()
      list.push({
        at,
        dur,
        slices,
        split: Math.random() < 0.85 ? Math.round(rand(8, 28) * k) : 0,
        jump:
          roll < 0.22 ? `translate3d(0, ${-Math.round(rand(24, 140) * k)}px, 0)` // up only: above the top sits the skip link
          : roll < 0.34 ? `translate3d(${Math.round(rand(10, 40) * k) * sign()}px, 0, 0) skewX(${(rand(2, 7) * sign()).toFixed(1)}deg)`
          : '',
        flash:
          Math.random() < (big ? 0.45 : 0.14)
            ? ['invert(1)', 'invert(1) hue-rotate(180deg)', 'hue-rotate(90deg) saturate(4)', 'contrast(2.2) saturate(0)'][randInt(0, 3)]
            : '',
        power: rand(2.2, 3.2) * (big ? 1.4 : 1),
      })
      at += dur + randInt(0, 3) * FRAME
    }
    return { hits: list, total: Math.max(total, at) }
  }

  // ─── Clones ───────────────────────────────────────────────────────────────
  const buildLayer = (strips: number) => {
    const l = document.createElement('div')
    l.setAttribute('aria-hidden', 'true')
    l.inert = true
    l.dataset.nsGlitch = ''
    Object.assign(l.style, {
      position: 'fixed', inset: '0', zIndex: '2147483000', pointerEvents: 'none',
      overflow: 'hidden', contain: 'strict', visibility: 'hidden',
    })
    const page = source.cloneNode(true) as HTMLElement
    page.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'))
    page.querySelectorAll('[data-in]').forEach((e) => e.removeAttribute('data-in'))
    page.removeAttribute('data-in')
    // The snow canvas cannot be cloned: draw a snapshot of its buffer instead.
    const snow = opts.snow
    page.querySelectorAll('canvas').forEach((c) => {
      const copy = document.createElement('canvas')
      copy.className = c.className
      if (snow && c.dataset.nsSnow !== undefined) {
        copy.width = snow.width
        copy.height = snow.height
        copy.getContext('2d')?.drawImage(snow, 0, 0)
      }
      c.replaceWith(copy)
    })
    const y = scrollY
    for (let i = 0; i < strips; i++) {
      const strip = document.createElement('div')
      Object.assign(strip.style, {
        position: 'absolute', inset: '0', background: '#10100e', willChange: 'transform, clip-path',
        clipPath: 'inset(0 0 100% 0)',
      })
      const p = i ? (page.cloneNode(true) as HTMLElement) : page
      // A copied canvas loses its pixels on cloneNode: redraw it.
      if (i && snow) p.querySelectorAll<HTMLCanvasElement>('canvas').forEach((c) => {
        if (c.width) c.getContext('2d')?.drawImage(snow, 0, 0)
      })
      if (y) p.style.transform = `translate3d(0, ${-y}px, 0)`
      strip.appendChild(p)
      l.appendChild(strip)
    }
    document.body.appendChild(l)
    return l
  }

  const dropLayer = () => { layer?.remove(); layer = null }

  // ─── Apply one hit (or none) ──────────────────────────────────────────────
  const clear = () => {
    delete root.dataset.nsRgb
    root.style.removeProperty('--ns-split')
    root.style.removeProperty('transform')
    root.style.removeProperty('filter')
    if (!root.getAttribute('style')) root.removeAttribute('style')
    if (layer) layer.style.visibility = 'hidden'
  }

  const apply = (h: Hit) => {
    if (h.split) { root.dataset.nsRgb = ''; root.style.setProperty('--ns-split', `${h.split}px`) }
    else { delete root.dataset.nsRgb; root.style.removeProperty('--ns-split') }
    if (h.jump) root.style.transform = h.jump
    else root.style.removeProperty('transform')
    if (h.flash) root.style.filter = h.flash
    else root.style.removeProperty('filter')
    if (layer) {
      const strips = layer.children
      for (let i = 0; i < strips.length; i++) {
        const st = (strips[i] as HTMLElement).style
        const s = h.slices[i]
        if (s) {
          st.clipPath = `inset(${s.top.toFixed(2)}% 0 ${s.bottom.toFixed(2)}% 0)`
          st.transform = `translate3d(${s.dx}px, 0, 0)`
        } else st.clipPath = 'inset(0 0 100% 0)'
      }
      layer.style.visibility = h.slices.length ? 'visible' : 'hidden'
    }
    opts.kick?.(Math.max(1, Math.round(h.dur / (1000 / 30))), h.power)
  }

  // ─── Loop (only while a burst runs) ───────────────────────────────────────
  const frame = (t: number) => {
    if (!burstStart) burstStart = t
    const e = t - burstStart
    if (e >= burstEnd) { endBurst(); return }
    let idx = -1
    for (let i = 0; i < hits.length; i++) if (e >= hits[i].at && e < hits[i].at + hits[i].dur) { idx = i; break }
    if (idx !== shown) {
      shown = idx
      if (idx < 0) clear()
      else apply(hits[idx])
    } else if (idx >= 0 && hits[idx].flash && e - hits[idx].at > FRAME * 1.5) {
      root.style.removeProperty('filter') // the flash is a single frame
    }
    raf = requestAnimationFrame(frame)
  }

  const startBurst = () => {
    if (document.hidden) { schedule(); return }
    const plan = planBurst()
    hits = plan.hits
    burstEnd = plan.total
    burstStart = 0
    shown = -1
    const strips = hits.reduce((m, h) => Math.max(m, h.slices.length), 0)
    if (strips) layer = buildLayer(strips)
    raf = requestAnimationFrame(frame)
  }

  const endBurst = () => {
    raf = 0
    clear()
    dropLayer()
    schedule()
  }

  const schedule = () => { timer = window.setTimeout(startBurst, rand(...QUIET)) }

  schedule()

  return () => {
    clearTimeout(timer)
    cancelAnimationFrame(raf)
    clear()
    dropLayer()
  }
}
