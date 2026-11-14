'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import clsx from 'clsx'
import type { SiteDict } from '@/content/i18n/site.en'
import { useUi } from '@/i18n/client'
import { scrambleTo } from '@/lib/scramble'
import NavClock from '@/components/ui/NavClock/NavClock'
import CopyEmail from '@/components/close/CopyEmail'
import Pending from '@/components/blocks/Pending'
import { createLed, type Led } from './led'
import c from './contact.module.scss'

type Brief = SiteDict['CONTACT']['brief']
type Key = 'who' | 'what' | 'when' | 'budget'
const KEYS: Key[] = ['who', 'what', 'when', 'budget']
const STEP = 13 // degrees between dial labels
const IDLE = 3500 // ms without the pointer → the face goes back to sleep

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Text that decodes into its next value (the nav scramble). React renders the
// first value only; later ones are written by the decode.
function Decode({ text }: { text: string }) {
  const first = useRef(text).current
  const shown = useRef(text)
  const el = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const node = el.current
    if (!node || shown.current === text) return
    const from = shown.current
    shown.current = text
    if (reducedMotion()) { node.textContent = text; return }
    return scrambleTo(node, from, text, 420)
  }, [text])
  return <span ref={el}>{first}</span>
}

// Contact stage: the LED stand-in (Juan's nav face on a dot-matrix panel that
// turns towards the pointer and talks), a dial to say who you are, and a
// one-sentence brief made of options that leaves as an email draft (mailto).
// No form, nothing sent from the page.
export default function ContactStage({ brief, email, linkedin, repliesPending, promise }: {
  brief: Brief
  email: string
  linkedin: string
  repliesPending: boolean
  promise: string
}) {
  const ui = useUi()
  const [sel, setSel] = useState<Record<Key, number>>({ who: 0, what: 0, when: 0, budget: 0 })
  const [said, setSaid] = useState(brief.hello)
  const root = useRef<HTMLElement>(null)
  const rig = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const shadow = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const typed = useRef<HTMLSpanElement>(null)
  const led = useRef<Led | null>(null)
  const kick = useRef(0)

  const who = brief.who.options[sel.who]

  // ── the device: LED loop + turn towards the pointer ────────────────────────
  useEffect(() => {
    const cv = canvas.current, el = body.current, host = rig.current
    if (!cv || !el || !host) return
    const reduced = reducedMotion()
    const panel = createLed(cv, reduced)
    led.current = panel
    let raf = 0, last = 0, visible = true, idle = 0
    let tx = -0.35, ty = 0.05, rx = 0, ry = 0, rz = 0, vz = 0
    const t0 = performance.now()

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      const cx = r.left + r.width * 0.6, cy = r.top + r.height * 0.5
      const reach = Math.max(window.innerWidth, 900) * 0.5
      tx = Math.max(-1, Math.min(1, (e.clientX - cx) / reach))
      ty = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.6)))
      // The eyes saturate sooner than the head.
      panel.look(tx * 2.2, ty * 2.2)
      panel.wake(true)
      window.clearTimeout(idle)
      idle = window.setTimeout(() => { panel.wake(false); panel.look(0, 0) }, IDLE)
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible) return
      if (!reduced) {
        const t = (now - t0) / 1000
        ry += (-9 + tx * 24 - ry) * 0.07
        rx += (3 - ty * 15 - rx) * 0.07
        // A kick (click on the panel, a new answer) rings out on a spring.
        vz += (-rz * 0.09 - vz * 0.12) + kick.current; kick.current = 0
        rz += vz
        const bob = Math.sin(t * 1.15) * 7
        el.style.transform = `translate3d(0, ${bob.toFixed(2)}px, 0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${(rz + Math.sin(t * 0.7) * 1.1).toFixed(2)}deg)`
        if (shadow.current) shadow.current.style.transform = `translateX(${(-ry * 0.6).toFixed(1)}px) scale(${(1 - bob / 90).toFixed(3)})`
      }
      if (now - last > 32) { last = now; panel.frame(now) } // LEDs at ~30 fps
    }
    panel.frame(performance.now()) // first frame at once (and the only one with reduced motion)
    raf = requestAnimationFrame(loop)

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden })
    io.observe(host)
    const onVis = () => { visible = !document.hidden }
    const ro = new ResizeObserver(() => panel.resize())
    ro.observe(cv)
    document.fonts?.ready.then(() => panel.resize())
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf); window.clearTimeout(idle)
      io.disconnect(); ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      document.removeEventListener('visibilitychange', onVis)
      led.current = null
    }
  }, [])

  // ── the stand-in talks: the line types itself and the mouth moves ──────────
  useEffect(() => {
    const node = typed.current
    if (!node) return
    if (reducedMotion()) { node.textContent = said; return }
    let i = 0, id = 0
    node.textContent = ''
    led.current?.talk(true)
    const tick = () => {
      i++
      node.textContent = said.slice(0, i)
      if (i < said.length) id = window.setTimeout(tick, said[i - 1] === '.' || said[i - 1] === ',' || said[i - 1] === '?' ? 190 : 22)
      else led.current?.talk(false)
    }
    id = window.setTimeout(tick, 380)
    return () => { window.clearTimeout(id); led.current?.talk(false) }
  }, [said])

  const pick = useCallback((key: Key, index: number) => {
    const list = brief[key].options
    const n = ((index % list.length) + list.length) % list.length
    setSel((s) => (s[key] === n ? s : { ...s, [key]: n }))
    led.current?.say(list[n].led)
    kick.current += 0.9
    if (key === 'who') setSaid(brief.who.options[n].say)
  }, [brief])

  const onToken = (key: Key) => (e: MouseEvent) => pick(key, sel[key] + (e.shiftKey ? -1 : 1))
  const onTokenKey = (key: Key) => (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); pick(key, sel[key] + 1) }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); pick(key, sel[key] - 1) }
  }

  const onDialKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = Math.max(0, Math.min(brief.who.options.length - 1, sel.who + d))
    pick('who', n)
    ;(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="radio"]')[n]?.focus()
  }

  // The sentence as plain text → the email draft.
  const mailto = useMemo(() => {
    const t = (k: Key) => brief[k].options[sel[k]].text
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    const line = `${cap(t('who'))} ${brief.what.before} ${t('what')}. ${brief.when.before} ${t('when')}. ${brief.budget.before} ${t('budget')}.`
    const bodyText = `${brief.greeting}\n\n${line}\n\n${brief.bodyMore}\n\n`
    const subject = `${brief.subject} · ${t('what')}`
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`
  }, [brief, sel, email])

  const token = (key: Key) => {
    const o = brief[key].options[sel[key]]
    const act = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(key, sel[key] + (e.shiftKey ? -1 : 1)) } else onTokenKey(key)(e) }
    // A span, not a <button>: the option wraps across lines like the text around it.
    return (
      <span role="button" tabIndex={0} className={c.token} data-cursor="link" onClick={onToken(key)} onKeyDown={act} aria-label={ui.contact.change(brief[key].label, o.text)}>
        <span className={c.tokenText} aria-hidden="true"><Decode text={o.text} /></span>
        <sup className={c.tokenN} aria-hidden="true">{String(KEYS.indexOf(key) + 1).padStart(2, '0')}</sup>
        <span className={c.tokenTag} aria-hidden="true">{brief[key].label} ↕</span>
      </span>
    )
  }

  const hold = (on: boolean) => () => led.current?.hold(on ? 'mail' : null)

  return (
    <section className={c.stage} ref={root} aria-label={ui.contact.stage}>
      <div className={c.copy}>
        <div className={c.top}>
          <p className={c.meta}><i aria-hidden="true" /><NavClock /><span> · {ui.contact.place}</span></p>
          <p className={c.say}>
            <span className={c.speaker} aria-hidden="true">{brief.speaker} ›</span>{' '}
            <span ref={typed} aria-hidden="true">{said}</span><span className={c.caret} aria-hidden="true" />
            <span className={c.srOnly} role="status" aria-live="polite">{said}</span>
          </p>
        </div>

        <p className={c.sentence} role="group" aria-label={ui.contact.brief}>
          <span className={c.dim}>{brief.greeting}</span>{' '}
          {token('who')} <span className={c.dim}>{brief.what.before}</span> {token('what')}<span className={c.dim}>.</span>{' '}
          <span className={c.dim}>{brief.when.before}</span> {token('when')}<span className={c.dim}>.</span>{' '}
          <span className={c.dim}>{brief.budget.before}</span> {token('budget')}<span className={c.dim}>.</span>
        </p>

        <div className={c.bottom}>
          <div className={c.actions}>
            <a className={c.cta} href={mailto} data-no-transition data-cursor="link"
              onPointerEnter={hold(true)} onPointerLeave={hold(false)} onFocus={hold(true)} onBlur={hold(false)}>
              <span>{brief.cta}</span><span className={c.arrow} aria-hidden="true">↗</span>
            </a>
            <p className={c.note}>
              {brief.ctaNote} {promise}
              {repliesPending && <Pending>{ui.pending.h24}</Pending>}
            </p>
          </div>
          <div className={c.alt}>
            <div className={c.altItem}>
              <p className={c.k}>{brief.or}</p>
              <CopyEmail size="md" className={c.email} onCopied={() => { led.current?.flash('ok'); kick.current += 1.4 }} />
            </div>
            <div className={c.altItem}>
              <p className={c.k}>{brief.linkedin}</p>
              <a className={c.link} href={linkedin} target="_blank" rel="noopener noreferrer" data-social="linkedin" data-cursor="link">
                LinkedIn <span aria-hidden="true">↗</span><span className={c.srOnly}> {ui.newTab}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className={c.rig} ref={rig} style={{ '--sel': sel.who, '--step': `${STEP}deg` } as CSSProperties}>
        {/* Dial: who you are. Same choice as the first option of the sentence. */}
        <div className={c.dial} role="radiogroup" aria-label={ui.contact.dial} onKeyDown={onDialKey}>
          <svg className={c.ticks} viewBox="-100 -100 200 200" aria-hidden="true">
            <circle r="82" pathLength="360" strokeDasharray="0.22 2.78" strokeWidth="4" />
            <circle r="83.5" pathLength="360" strokeDasharray="0.22 14.78" strokeWidth="7" />
          </svg>
          <span className={c.needle} aria-hidden="true" />
          {brief.who.options.map((o, i) => (
            <span key={o.id} className={c.dialSlot} style={{ '--i': i } as CSSProperties}>
              <button type="button" role="radio" aria-checked={i === sel.who} tabIndex={i === sel.who ? 0 : -1}
                className={clsx(c.dialItem, i === sel.who && c.dialOn)} data-far={Math.min(3, Math.abs(i - sel.who))}
                onClick={() => pick('who', i)}>
                <span className={c.dialN} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{o.dial}
              </button>
            </span>
          ))}
        </div>

        <div className={c.device}>
          <div className={c.body} ref={body} onClick={() => { led.current?.say(who.led); kick.current += 2.2 }}>
            <span className={c.back} />
            <span className={clsx(c.side, c.left)} />
            <span className={clsx(c.side, c.right)}>
              <i className={c.handle} /><i className={c.knob}>+</i><i className={c.knob}>−</i><i className={c.port} /><i className={c.lamp} />
            </span>
            <span className={clsx(c.cap, c.capTop)} />
            <span className={clsx(c.cap, c.capBottom)} />
            <svg className={c.cable} viewBox="0 0 40 120" aria-hidden="true">
              <path d="M20 0v10c0 6-12 4-12 9s24 3 24 8-24 3-24 8 24 3 24 8-24 3-24 8 24 3 24 8-24 3-24 8 24 3 24 8-12 3-12 9v28" />
            </svg>
            <span className={c.front}>
              <span className={c.screen}>
                <canvas ref={canvas} className={c.led} role="img" aria-label={ui.contact.device} />
              </span>
              <span className={c.plate} aria-hidden="true">FRESNO© · {brief.speaker}</span>
            </span>
          </div>
        </div>
        <i className={c.shadow} ref={shadow} aria-hidden="true" />
      </div>
    </section>
  )
}
