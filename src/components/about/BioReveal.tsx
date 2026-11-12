'use client'

import { useEffect, useRef } from 'react'
import a from './about.module.scss'

// Scroll-driven reading highlight for the About bio. All words start dim and
// light up to --c-text in reading order (one sequence across the paragraphs)
// as the section crosses the viewport. Only `color` changes (through --k on
// each word), so geometry and wrapping never move. A soft leading edge of
// FEATHER words makes it travel like light instead of stepping.

const FEATHER = 4 // words between fully dim and fully lit
const START = 0.8 // progress 0 when the block top reaches 80 % of the viewport
const END = 0.35 // progress 1 when the block bottom reaches 35 %

const words = (text: string) => text.split(/(\s+)/)

// Inline pieces of the last line: struck-through words and hover previews
// (data-social, see components/ui/SocialPreview), focusable by keyboard.
export type Seg = { t: string; strike?: boolean; tip?: string; aria?: string }

export default function BioReveal({ lead, last }: { lead: string[]; last: Seg[] }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const spans = Array.from(el.querySelectorAll<HTMLElement>('[data-w]'))
    const n = spans.length
    const cur = new Array<number>(n).fill(-1)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0

    const paint = () => {
      raf = 0
      const vh = window.innerHeight
      const r = el.getBoundingClientRect()
      const from = vh * START // block top here -> 0
      const to = vh * END // block bottom here -> 1
      const span = r.height + (from - to)
      const p = reduce.matches ? 1 : Math.min(1, Math.max(0, (from - r.top) / span))
      const pos = p * (n + FEATHER)
      for (let i = 0; i < n; i++) {
        let k = Math.min(1, Math.max(0, (pos - i) / FEATHER))
        k = k * k * (3 - 2 * k) // smoothstep
        k = Math.round(k * 100) / 100
        if (k !== cur[i]) {
          cur[i] = k
          spans[i].style.setProperty('--k', String(k))
        }
      }
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint) }

    paint()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    reduce.addEventListener('change', queue)
    document.fonts?.ready.then(queue)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      reduce.removeEventListener('change', queue)
    }
  }, [])

  let i = 0
  const render = (text: string) =>
    words(text).map((t, j) =>
      /^\s+$/.test(t) || t === '' ? t : <span key={j} className={a.w} data-w={i++}>{t}</span>
    )
  const renderSegs = (segs: Seg[]) =>
    segs.map((g, k) => {
      const inner = render(g.t)
      if (g.tip) return <span key={k} className={a.tip} data-social={g.tip} tabIndex={0} role="note" aria-label={g.aria}>{inner}</span>
      if (g.strike) return <span key={k} className={a.strike}>{inner}</span>
      return <span key={k}>{inner}</span>
    })

  return (
    <section ref={root} className={a.bio} data-wf="bio">
      <noscript><style>{'[data-w]{--k:1!important}'}</style></noscript>
      <div>
        {lead.map((p, n) => <p key={n}>{render(p)}</p>)}
      </div>
      <p>{renderSegs(last)}</p>
    </section>
  )
}
