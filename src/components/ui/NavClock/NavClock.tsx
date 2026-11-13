'use client'

import { useEffect, useState, type CSSProperties } from 'react'

// ─── Local time in Valencia — "VLC 18:42 CET" (CEST in summer) ───────────────
// Europe/Madrid, ticks on the minute. Decorative: aria-hidden, the footer
// already carries the live clock and location for assistive tech.
function format(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  // en-GB gives "CET"/"CEST" for Europe/Madrid; some engines give "GMT+1/+2".
  let tz = get('timeZoneName')
  if (tz === 'GMT+1') tz = 'CET'
  if (tz === 'GMT+2') tz = 'CEST'
  return `VLC ${get('hour')}:${get('minute')} ${tz}`
}

export default function NavClock({ className }: { className?: string }) {
  const [text, setText] = useState('VLC --:--')

  useEffect(() => {
    let id: number
    const tick = () => {
      const now = new Date()
      setText(format(now))
      id = window.setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50)
    }
    tick()
    return () => window.clearTimeout(id)
  }, [])

  return (
    <span className={className} aria-hidden="true" suppressHydrationWarning data-in="fade" data-wire="CLOCK" style={{ '--in-d': '120ms' } as CSSProperties}>
      {text}
    </span>
  )
}
