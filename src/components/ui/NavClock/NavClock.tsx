'use client'

import { useEffect, useState } from 'react'

// ─── Local time in Valencia — "VLC 18:42 CET" (CEST in summer) ───────────────
// Europe/Madrid, ticks on the minute. Decorative: aria-hidden, the footer
// already carries the live clock and location for assistive tech.
function format(now: Date, zone = true) {
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
  return `VLC ${get('hour')}:${get('minute')}${zone ? ` ${tz}` : ''}`
}

export default function NavClock({ className, zone = true }: { className?: string; zone?: boolean }) {
  const [text, setText] = useState('VLC --:--')

  useEffect(() => {
    let id: number
    const tick = () => {
      const now = new Date()
      setText(format(now, zone))
      id = window.setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50)
    }
    tick()
    return () => window.clearTimeout(id)
  }, [zone])

  return (
    <span className={className} aria-hidden="true" suppressHydrationWarning>
      {text}
    </span>
  )
}
