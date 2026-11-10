// Page colours for the WebGL backgrounds, read from the CSS tokens.
export function parseColor(v: string, fallback: [number, number, number]): [number, number, number] {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx || !v) return fallback
  ctx.fillStyle = '#000'
  ctx.fillStyle = v.trim()
  const c = ctx.fillStyle as string
  if (c.startsWith('#') && c.length === 7) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) as [number, number, number]
  const m = c.match(/[\d.]+/g)
  return m ? [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255] : fallback
}

export const pageBg = () => parseColor(getComputedStyle(document.documentElement).getPropertyValue('--c-bg'), [0.063, 0.063, 0.055])
export const pageFill = () => parseColor(getComputedStyle(document.documentElement).getPropertyValue('--c-bg-2'), [0.1, 0.1, 0.094])

// Same split curve as the feed canvas (feed/canvas/gl.ts).
export const splitMag = (speed: number) => Math.min(18, Math.max(0, speed - 0.6) * 0.6)

// Elements a background drag must leave alone.
export const INTERACTIVE = 'a, button, input, textarea, select, label, [role="group"], [tabindex]:not([tabindex="-1"])'
