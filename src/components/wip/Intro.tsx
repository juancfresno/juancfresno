'use client'

import { useEffect } from 'react'

// Entrance of the WIP landing. The choreography is CSS (wip.module.scss,
// html[data-intro] + [data-in] elements with --in-d delays) so it starts with
// the first paint, before hydration; the headline decode is HeadlineCycle's.
// Timeline (full, ms): background in from black 0–1300 (fade + 1.08 → 1),
// face 60 · header line 120–1120 · language/theme 180 · wordmark 260,
// headline decode 260–880, role 420, disciplines 540, intro lines 620 / 700,
// contact 800, footer 1000–1800. "fast" (repeat loads in the session) runs
// the same at 0.45×; "reduced" is a plain 400 ms fade.
// Any input (pointer down, key, wheel, touch) skips to the end. This component
// only handles the skip and clears the attributes when it is over.
const TOTAL = { full: 1850, fast: 900, reduced: 450 } as const

export default function Intro() {
  useEffect(() => {
    const r = document.documentElement
    const m = r.dataset.intro as keyof typeof TOTAL | undefined
    if (!m || !(m in TOTAL)) return
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    let t = 0
    const off = () => evs.forEach((e) => window.removeEventListener(e, skip, true))
    const end = () => { off(); delete r.dataset.intro; delete r.dataset.introSkip }
    function skip() {
      off()
      r.dataset.introSkip = ''
      window.dispatchEvent(new Event('wip:intro-skip'))
      window.clearTimeout(t)
      t = window.setTimeout(end, 60)
    }
    evs.forEach((e) => window.addEventListener(e, skip, { capture: true, passive: true }))
    t = window.setTimeout(end, TOTAL[m])
    return () => { window.clearTimeout(t); off() }
  }, [])
  return null
}
