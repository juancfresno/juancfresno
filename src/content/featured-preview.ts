// Home · featured projects module — Figma "04 · Archivo" (7173:7118, 1680 × 2575).
// PREVIEW: six pieces exported from the frame (public/home/featured/), not
// linked to any case yet. When a piece gets its case, add `slug` here and the
// module can link it. Coordinates are the frame's, in px at 1680; the module
// turns them into percentages so the layout is liquid.
//   speed  scroll parallax factor (1 = moves with the page, > 1 faster, < 1 slower)

export type FeaturedPiece = {
  key: string
  src: string
  w: number // frame px
  h: number
  x: number
  y: number
  speed: number
  slug?: string
}

export const FEATURED_FRAME = { w: 1680, h: 2575 }

// The label block ("/ Selected projects" + rule): x 1387, y 58, w 253.
export const FEATURED_LABEL = { x: 1387, y: 58, w: 253 }

export const FEATURED_PREVIEW: FeaturedPiece[] = [
  { key: 'prolicht', src: '/home/featured/01-prolicht.webp', x: 107, y: 130, w: 792, h: 493, speed: 0.92 },
  { key: 'portrait', src: '/home/featured/02-portrait.webp', x: 1185, y: 332, w: 388, h: 582, speed: 1.16 },
  { key: 'subway', src: '/home/featured/03-subway.webp', x: 175, y: 800, w: 659, h: 332, speed: 1.05 },
  { key: 'found', src: '/home/featured/04-found.webp', x: 848, y: 1283, w: 792, h: 447, speed: 0.9 },
  { key: 'wheel', src: '/home/featured/05-wheel.webp', x: 175, y: 1416, w: 388, h: 583, speed: 1.18 },
  { key: 'correos', src: '/home/featured/06-correos.webp', x: 1002, y: 2045, w: 388, h: 388, speed: 1.06 },
]
