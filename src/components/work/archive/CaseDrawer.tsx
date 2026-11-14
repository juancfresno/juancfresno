'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUi } from '@/i18n/client'
import { useOverlay, prefersReduced } from './useOverlay'
import type { WorkItem } from './types'
import s from './drawer.module.scss'

// ─── The case drawer (/work) ──────────────────────────────────────────────────
// A light card on the right: 40 % of the window (62 % ≤ 1024, the whole width
// ≤ 768), 8 px away from the window's edges, rounded. While it is up the whole
// site sits behind FROSTED GLASS (backdrop blur + a veil of the page colour).
// Controls live on the glass, just outside the card's left edge: Close on top,
// NN / 28 and ← → at the bottom (a pill inside the card on phones), so nothing
// sits on the work.
//
// Motion (no pixels):
//   open     the glass fogs up, the card glides in from the right on a long
//            ease-out, then the case-top rises line by line.
//   close    the card leaves the way it came, the glass clears.
//   change   (← / →, and the end of a case) the case lifts away and the next
//            one rises into its place.
//   scroll   native scroll; its speed pulls the pictures apart like an
//            accordion (each one lags by its distance to the middle of the
//            card) and they close up again when it stops.
//   images   each picture wipes in left → right when it enters the card,
//            settling from a slightly bigger size. Once.
//   the end  a pinned scene: a window onto the next case's first image opens
//            as you keep scrolling (000 → 100 %); at 100 % it is the next case.
// Esc / click on the glass / Close = close, focus trapped and returned.
// Reduced motion: fades only, no accordion, no wipes, no pinned runway.
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
const OUT_MS = 480
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

type Phase = 'closed' | 'entering' | 'open' | 'leaving'

export default function CaseDrawer({ items, index, onClose, onNav }: {
  items: WorkItem[]
  index: number | null
  onClose: () => void
  onNav: (dir: 1 | -1) => void
}) {
  const t = useUi().work
  const [idx, setIdx] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('closed')
  const [fresh, setFresh] = useState(true) // first case since opening: the case-top rises in
  const [dir, setDir] = useState<1 | -1>(1)
  const idxRef = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const readRef = useRef<HTMLSpanElement>(null)
  const nextRef = useRef<HTMLElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const seq = useRef(0) // token: a newer transition cancels the older one's tail
  const busy = useRef(false)
  const pendingDir = useRef<1 | -1>(1)
  const raf = useRef(0)
  const vel = useRef({ last: 0, v: 0, still: 0 })
  const figs = useRef(new Set<HTMLElement>())

  // ── index → what to do ──
  useEffect(() => {
    const from = idxRef.current
    if (index !== null && from === null) {
      ++seq.current
      idxRef.current = index
      setIdx(index)
      setFresh(true)
      setPhase('entering')
      return
    }
    if (index !== null && from !== null && index !== from) {
      const my = ++seq.current
      busy.current = true
      idxRef.current = index
      const d = pendingDir.current
      ;(async () => {
        const body = bodyRef.current
        if (body && !prefersReduced()) {
          body.animate(
            [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate3d(0, ${-36 * d}px, 0)` }],
            { duration: 240, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' },
          )
          await wait(240)
          if (my !== seq.current) return
        }
        setFresh(false)
        setDir(d)
        setIdx(index)
        await wait(60)
        if (my !== seq.current) return
        busy.current = false
      })()
      return
    }
    if (index === null && from !== null) {
      const my = ++seq.current
      idxRef.current = null
      busy.current = true
      setPhase('leaving')
      window.setTimeout(() => {
        if (my !== seq.current) return
        setIdx(null)
        setPhase('closed')
        busy.current = false
      }, prefersReduced() ? 180 : OUT_MS)
    }
  }, [index])

  // entering → open on the next frames (so the CSS transitions run).
  useEffect(() => {
    if (phase !== 'entering') return
    let live = true
    const go = () => { if (live) { live = false; setPhase('open'); busy.current = false } }
    requestAnimationFrame(() => requestAnimationFrame(go))
    const tm = window.setTimeout(go, 120) // the page isn't painting (background tab)
    return () => { live = false; window.clearTimeout(tm) }
  }, [phase])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const go = useCallback((d: 1 | -1) => {
    if (busy.current || idxRef.current === null) return
    pendingDir.current = d
    onNav(d)
  }, [onNav])

  // ── scroll: reading line, the accordion, the next scene's progress ──
  const frame = useCallback(() => {
    const sc = scrollRef.current, nx = nextRef.current
    raf.current = 0
    if (!sc || !nx) return
    const top = sc.scrollTop
    const h = sc.clientHeight
    const st = vel.current
    const d = top - st.last
    st.last = top
    st.v += (clamp(d, -70, 70) - st.v) * 0.14
    st.still = Math.abs(d) < 0.5 ? st.still + 1 : 0

    const nextTop = nx.offsetTop
    const runway = nx.offsetHeight - h
    readRef.current?.style.setProperty('--read', clamp(top / Math.max(1, nextTop - h), 0, 1).toFixed(4))
    const p = runway > 8 ? clamp((top - nextTop) / runway, 0, 1) : 0
    nx.style.setProperty('--p', p.toFixed(4))
    nx.style.setProperty('--e', (1 - Math.pow(1 - p, 2.2)).toFixed(4))
    if (pctRef.current) pctRef.current.textContent = `${String(Math.round(p * 100)).padStart(3, '0')} %`

    // The accordion: each picture lags by its distance to the middle.
    const v = Math.abs(st.v) < 0.05 ? 0 : st.v
    if (!prefersReduced()) {
      figs.current.forEach((el) => {
        const k = clamp((el.offsetTop + el.offsetHeight / 2 - top - h / 2) / h, -1.2, 1.2)
        el.style.setProperty('--o', `${(v * k * 0.85).toFixed(2)}px`)
      })
    }

    if (p >= 0.995 && runway > 8) { go(1); return }
    if (st.still > 6 && v === 0) return
    raf.current = requestAnimationFrame(frame)
  }, [go])

  const onScroll = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(frame)
  }, [frame])

  // ── a new case: top of the card, closed window, pictures watched ──
  useEffect(() => {
    const sc = scrollRef.current
    if (idx === null || !sc) return
    sc.scrollTo({ top: 0, behavior: 'instant' })
    vel.current = { last: 0, v: 0, still: 0 }
    readRef.current?.style.setProperty('--read', '0')
    nextRef.current?.style.setProperty('--p', '0')
    nextRef.current?.style.setProperty('--e', '0')
    if (pctRef.current) pctRef.current.textContent = '000 %'

    const set = figs.current
    set.clear()
    const reveal = (el: HTMLElement) => {
      const img = el.querySelector('img')
      const on = () => el.setAttribute('data-in', '')
      if (!img || (img.complete && img.naturalWidth)) on()
      else { img.addEventListener('load', on, { once: true }); img.addEventListener('error', on, { once: true }) }
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const el = e.target as HTMLElement
        if (e.isIntersecting) { set.add(el); if (!el.hasAttribute('data-seen')) { el.setAttribute('data-seen', ''); reveal(el) } }
        else { set.delete(el); el.style.removeProperty('--o') }
      })
    }, { root: sc, rootMargin: '0px 0px -8% 0px', threshold: 0.01 })
    sc.querySelectorAll<HTMLElement>('[data-fig]').forEach((el) => io.observe(el))
    return () => { io.disconnect(); set.clear() }
  }, [idx])

  useOverlay(index !== null, panelRef, onClose, (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
  })

  if (idx === null || typeof document === 'undefined') return null
  const it = items[idx]
  const next = items[(idx + 1) % items.length]
  const total = String(items.length).padStart(2, '0')
  const ficha: [string, string][] = [[t.client, it.client]]
  if (it.studio) ficha.push([t.via, it.studio])
  ficha.push([t.role, it.role], [t.year, it.year])
  const nextImg = next.images[0] ?? next.cover
  const rise = (i: number) => ({ 'data-rise': '', style: { ['--i' as string]: i } })

  return createPortal(
    <div className={s.root} data-phase={phase} data-fresh={fresh ? '' : undefined} data-dir={dir}>
      <div className={s.glass} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t.dialog(it.title)}
        tabIndex={-1}
      >
        <div className={s.card}>
          <span ref={readRef} className={s.read} aria-hidden="true" />
          <div ref={scrollRef} className={s.scroll} onScroll={onScroll}>
            <div ref={bodyRef} className={s.body} key={it.slug}>
              <article className={s.sheet}>
                <header className={s.top}>
                  <p className={s.meta} {...rise(0)}>
                    <span>{it.n} / {total}</span>
                    <span>{it.category}</span>
                  </p>
                  <h2 className={s.title} {...rise(1)}>{it.title}</h2>
                  <p className={s.lead} data-cursor="text" {...rise(2)}>{it.lead}</p>
                  {it.question && (
                    <div className={s.question} {...rise(3)}>
                      <span>{t.question}</span>
                      <p data-cursor="text">{it.question}</p>
                    </div>
                  )}
                  <dl className={s.ficha} {...rise(4)}>
                    {ficha.map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </header>

                <div className={s.block}>
                  {it.images.map((img, i) => (
                    <figure key={img.src} className={s.fig} data-fig style={{ aspectRatio: `${img.w} / ${img.h}` }}>
                      <span className={s.clip}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.src}
                          width={img.w}
                          height={img.h}
                          alt={t.image(it.title, i + 1, it.images.length)}
                          loading={i < 2 ? 'eager' : 'lazy'}
                          decoding="async"
                        />
                      </span>
                    </figure>
                  ))}
                </div>
              </article>

              <section ref={nextRef} className={s.next} aria-label={t.nextProject}>
                <div className={s.pin}>
                  <p className={s.nLabel} aria-hidden="true">
                    <span>{t.nextSlash}</span>
                    <span>{next.n} / {total}</span>
                  </p>
                  <button type="button" className={s.window} onClick={() => go(1)} aria-label={t.nextOpen(next.title)} data-cursor="view">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={nextImg.src} alt="" decoding="async" loading="lazy" />
                  </button>
                  <p className={s.nName} aria-hidden="true">{next.title}</p>
                  <p className={s.nKeep} aria-hidden="true">
                    <span>{t.keep}</span>
                    <span ref={pctRef}>000 %</span>
                    <i />
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* On the glass, outside the card. */}
        <div className={s.ctls}>
          <button type="button" className={`${s.ctl} ${s.close}`} onClick={onClose} aria-label={`${t.close} (${t.esc})`} data-autofocus>
            <svg viewBox="0 0 14 14" width="14" height="14" fill="none" aria-hidden="true">
              <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          <p className={s.count} aria-hidden="true"><b>{it.n}</b> / {total}</p>
          <button type="button" className={s.ctl} onClick={() => go(-1)} aria-label={t.prev}>←</button>
          <button type="button" className={s.ctl} onClick={() => go(1)} aria-label={t.next}>→</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
