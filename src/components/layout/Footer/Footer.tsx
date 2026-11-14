'use client'

import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

import s from './Footer.module.scss'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import LiveClock from '@/components/ui/LiveClock/LiveClock'
import { BehanceLogo, InstagramLogo, DribbbleLogo, LinkedInLogo, XLogo } from '@/components/ui/SocialLogos/SocialLogos'
import GlitchSocialIcon from '@/components/ui/GlitchSocialIcon/GlitchSocialIcon'
import { useHref, useLocale, useUi } from '@/i18n/client'
import { INTL } from '@/i18n/config'
import LocaleSwitch from '@/components/ui/LocaleSwitch/LocaleSwitch'
import CopyEmail from '@/components/close/CopyEmail'
import { createWall, type Wall } from './wall'

// ─── Social links data ─────────────────────────────────────────────────────────
// Order as in Figma web/footer: Behance · Dribbble · LinkedIn · Instagram · X.
const SOCIALS = [
  { id: 'behance',   label: 'Behance',   href: 'https://www.behance.net/juancfresno',    Icon: BehanceLogo  },
  { id: 'dribbble',  label: 'Dribbble',  href: 'https://dribbble.com/JuanCFresno',       Icon: DribbbleLogo  },
  { id: 'linkedin',  label: 'LinkedIn',  href: 'https://www.linkedin.com/in/juancfresno', Icon: LinkedInLogo },
  { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/juanc.fresno',     Icon: InstagramLogo },
  { id: 'x',         label: 'X',         href: 'https://x.com/JuanCFresno',              Icon: XLogo        },
]

// ─── Session readout ──────────────────────────────────────────────────────────
// Time on the site, pages seen and pixels scrolled in this tab (sessionStorage,
// nothing leaves the browser). Shown as one mono line in the close.
type Session = { t0: number; px: number; pages: string[] }
const SESSION_KEY = 'fresno:session'
const IDLE = 3500 // ms without the pointer → the face goes back to sleep

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useSession(pathname: string): MutableRefObject<Session> {
  const ref = useRef<Session>({ t0: 0, px: 0, pages: [] })
  useEffect(() => {
    const sess = ref.current
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as Session | null
      if (saved && typeof saved.t0 === 'number') Object.assign(sess, { t0: saved.t0, px: saved.px || 0, pages: [...new Set([...(saved.pages || []), ...sess.pages])] })
    } catch {}
    if (!sess.t0) sess.t0 = Date.now()
    const save = () => { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess)) } catch {} }
    let lastY = window.scrollY
    const onScroll = () => {
      const d = Math.abs(window.scrollY - lastY)
      lastY = window.scrollY
      if (d < 1600) sess.px += d // a jump (route change, back to top) is not scrolling
    }
    const onHide = () => { if (document.hidden) save() }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      save()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])
  useEffect(() => {
    const page = pathname.replace(/^\/es(?=\/|$)/, '') || '/'
    if (!ref.current.pages.includes(page)) ref.current.pages.push(page)
  }, [pathname])
  return ref
}

// ─── The close: LED wall + the question ───────────────────────────────────────
// Full-screen piece above the classic rows. The wall (wall.ts) fills the whole
// footer; the stand-in of Contact asks, two answers: Yes → /contact (site
// transition), Not yet → back to the top.
function Close({ root, session }: { root: MutableRefObject<HTMLElement | null>; session: MutableRefObject<Session> }) {
  const ui = useUi()
  const f = ui.footer
  const href = useHref()
  const locale = useLocale()
  const canvas = useRef<HTMLCanvasElement>(null)
  const slot = useRef<HTMLDivElement>(null)
  const typed = useRef<HTMLSpanElement>(null)
  const wall = useRef<Wall | null>(null)
  const upTimer = useRef(0)
  const [on, setOn] = useState(false)
  const [said, setSaid] = useState({ text: f.say.hello, n: 0 })
  const [readout, setReadout] = useState('')

  const say = (text: string) => setSaid((v) => (v.text === text ? v : { text, n: v.n + 1 }))

  // ── the wall: loop, reveal progress, pointer ───────────────────────────────
  useEffect(() => {
    const cv = canvas.current, box = slot.current, host = root.current
    if (!cv || !box || !host) return
    const reduced = reducedMotion()
    const w = createWall(cv, box, reduced)
    wall.current = w
    let raf = 0, last = 0, visible = false, idle = 0, lit = false

    // 0…1 of one screen of footer uncovered (the footer can be taller on phones).
    const progress = () => {
      const r = host.getBoundingClientRect()
      return Math.max(0, Math.min(1, (window.innerHeight - r.top) / Math.max(1, Math.min(r.height, window.innerHeight))))
    }
    const loop = (now: number) => {
      raf = 0
      if (!visible || document.hidden) return
      raf = requestAnimationFrame(loop)
      if (now - last < 32) return // ~30 fps
      last = now
      const p = progress()
      // The face dissolves in over the second half of the reveal.
      w.power((p - 0.3) / 0.5)
      if (!lit && p > 0.6) { lit = true; setOn(true) }
      if (lit && p < 0.04) { lit = false; setOn(false) }
      w.frame(now)
    }
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop) }

    const onMove = (e: PointerEvent) => {
      if (!visible) return
      const r = cv.getBoundingClientRect()
      const hr = host.getBoundingClientRect()
      // Only the part of the wall that is on screen reacts.
      const inside = e.clientY >= Math.max(r.top, hr.top) && e.clientY <= r.bottom
      w.pointer(inside && e.pointerType !== 'touch' ? { x: e.clientX - r.left, y: e.clientY - r.top } : null)
      if (!inside) return
      const b = box.getBoundingClientRect()
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2
      w.look(((e.clientX - cx) / Math.max(window.innerWidth, 900)) * 3.2, ((e.clientY - cy) / window.innerHeight) * 3.2)
      w.wake(true)
      window.clearTimeout(idle)
      idle = window.setTimeout(() => { w.wake(false); w.look(0, 0) }, IDLE)
    }
    const onLeave = () => w.pointer(null)

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) start()
      else { w.pointer(null); if (reduced) return; lit = false; setOn(false) }
    })
    io.observe(host)
    if (reduced) { setOn(true); w.wake(true) }
    const onVis = () => start()
    const ro = new ResizeObserver(() => w.resize())
    ro.observe(cv); ro.observe(box)
    document.fonts?.ready.then(() => w.resize())
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf); window.clearTimeout(idle); window.clearTimeout(upTimer.current)
      io.disconnect(); ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVis)
      wall.current = null
    }
  }, [root])

  // ── the stand-in talks: the line types itself and the mouth moves ──────────
  useEffect(() => {
    const node = typed.current
    if (!node) return
    if (reducedMotion()) { node.textContent = said.text; return }
    if (!on) { node.textContent = ''; return }
    let i = 0, id = 0
    const text = said.text
    node.textContent = ''
    wall.current?.talk(true)
    const tick = () => {
      i++
      node.textContent = text.slice(0, i)
      if (i < text.length) id = window.setTimeout(tick, '.,?'.includes(text[i - 1]) ? 190 : 22)
      else wall.current?.talk(false)
    }
    id = window.setTimeout(tick, said.n ? 60 : 520)
    return () => { window.clearTimeout(id); wall.current?.talk(false) }
  }, [said, on])

  // ── session readout, once a second while the close is lit ──────────────────
  useEffect(() => {
    if (!on) return
    const nf = new Intl.NumberFormat(INTL[locale])
    const tick = () => {
      const { t0, px, pages } = session.current
      const sec = Math.max(0, Math.floor((Date.now() - (t0 || Date.now())) / 1000))
      const time = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
      // 1 css px = 1/96 in = 0.2646 mm
      setReadout(f.session(time, Math.max(1, pages.length), nf.format(Math.round(px)), nf.format(Math.round(px * 0.02646) / 100)))
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [on, locale, f, session])

  const hoverYes = (hot: boolean) => () => { wall.current?.mode(hot ? 'go' : 'idle'); if (hot) say(f.say.yes) }
  const hoverNo = (hot: boolean) => () => { wall.current?.shade(hot); if (hot) say(f.say.no) }
  const toTop = () => {
    say(f.say.up)
    wall.current?.shade(false)
    wall.current?.mode('up')
    window.clearTimeout(upTimer.current)
    upTimer.current = window.setTimeout(() => wall.current?.mode('idle'), 1400)
    window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  const lines = f.title.split('\n')

  return (
    <div className={s.close} data-on={on || undefined}>
      <canvas ref={canvas} className={s.wall} aria-hidden="true" />

      <div className={s.hud}>
        <p className={s.label}>{f.end}</p>
        <p className={s.session} aria-hidden="true">{readout}</p>
      </div>

      <div className={s.stage}>
        <div className={s.ask}>
          <p className={s.say}>
            <span className={s.speaker} aria-hidden="true">{f.speaker} ›</span>{' '}
            <span ref={typed} aria-hidden="true" /><span className={s.caret} aria-hidden="true" />
            <span className={s.srOnly} role="status" aria-live="polite">{on ? said.text : ''}</span>
          </p>
          <h2 className={s.title} aria-label={lines.join(' ')}>
            {lines.map((line, i) => (
              <span key={line} className={s.mask} aria-hidden="true"><span style={{ transitionDelay: `${120 + i * 90}ms` }}>{line}</span></span>
            ))}
          </h2>
          <div className={s.answers}>
            <a className={s.yes} href={href('/contact')} data-cursor="link"
              onPointerEnter={hoverYes(true)} onPointerLeave={hoverYes(false)} onFocus={hoverYes(true)} onBlur={hoverYes(false)}>
              <span>{f.yes}</span><span className={s.arrow} aria-hidden="true">→</span>
            </a>
            <button type="button" className={s.no} onClick={toTop} data-cursor="link"
              onPointerEnter={hoverNo(true)} onPointerLeave={hoverNo(false)} onFocus={hoverNo(true)} onBlur={hoverNo(false)}>
              <span>{f.no}</span><span className={s.noHint}>{f.noHint} <span aria-hidden="true">↑</span></span>
            </button>
          </div>
          <div className={s.mail}>
            <p className={s.k}>{f.or}</p>
            <CopyEmail size="md" className={s.email} onCopied={() => say(f.say.copied)} />
          </div>
        </div>
        {/* The face is drawn by the wall inside this box. */}
        <div className={s.face} ref={slot} aria-hidden="true" />
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
// Every page ends in the full-screen close (the LED wall) + the classic rows.
// On desktop the footer is a curtain: its content is fixed to the viewport and
// the page above slides away to uncover it (clip-path on the footer box). On
// Contact (the page the close points to) only the classic rows show.
export default function Footer() {
  const ui = useUi()
  const href = useHref()
  const pathname = usePathname() || '/'
  const full = !/\/contact\/?$/.test(pathname)
  const root = useRef<HTMLElement | null>(null)
  const session = useSession(pathname)

  // The content is fixed and clipped: bring it on screen when focus lands in it.
  const onFocus = () => {
    const el = root.current
    if (!el || !full) return
    if (el.getBoundingClientRect().bottom > window.innerHeight + 4) el.scrollIntoView({ block: 'end' })
  }

  return (
    <footer ref={root} data-site-footer className={clsx(s.footer, full && s.full)} onFocusCapture={onFocus}>
      <div className={s.screen} data-foot-screen={full ? 'full' : undefined}>
        {full && <Close root={root} session={session} />}

        <div className={s.inner}>
          {/* Social wordmarks */}
          <nav className={s.social} aria-label={ui.footer.socials}>
            {SOCIALS.map(({ id, label, href: url, Icon }) => (
              <GlitchSocialIcon
                key={id}
                href={url}
                label={label}
                icon={<Icon />}
                className={s.socialLink}
                social={id}
              />
            ))}
          </nav>

          {/* Divider */}
          <ElasticLine className={s.line} />

          {/* Meta row */}
          <div className={s.meta}>
            {/* © + language + the shortcuts legend ("?"), one mono line. */}
            <div className={s.metaLeft}>
              <span className={s.copyright}>© 2012 — 2026 · <a href={href('/legal')} style={{ color: 'inherit' }}>{ui.footer.legal}</a></span>
              <LocaleSwitch className={s.lang} />
              <button
                type="button"
                className={s.help}
                aria-label={ui.nav.shortcuts}
                aria-keyshortcuts="?"
                onClick={() => window.dispatchEvent(new Event('fresno:shortcuts'))}
              >
                ?
              </button>
            </div>
            <div className={s.metaRight}>
              <LiveClock />
              {/* Hover / focus shows the Valencia clip (components/ui/SocialPreview). */}
              <span
                className={s.location}
                data-social="valencia"
                tabIndex={0}
                role="group"
                aria-label={ui.footer.placeLabel}
              >
                ⌖ {ui.footer.place}&nbsp;&nbsp;39.6649° N , 0.2126° W
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
