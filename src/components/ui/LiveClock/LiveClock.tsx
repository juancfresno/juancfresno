'use client'

import { useEffect, useState } from 'react'

// ─── Live clock — ticks every second, renders day + HH:MM:SS ─────────────────
export default function LiveClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const day = now
        .toLocaleDateString('en-US', { weekday: 'short' })
        .toUpperCase()
      const h = String(now.getHours()).padStart(2, '0')
      const m = String(now.getMinutes()).padStart(2, '0')
      const s = String(now.getSeconds()).padStart(2, '0')
      setTime(`${day} ${h}:${m}:${s}`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Evita mismatch de hidratación — no renderizar nada hasta el primer tick
  if (!time) return null

  return <time suppressHydrationWarning>{time}</time>
}
