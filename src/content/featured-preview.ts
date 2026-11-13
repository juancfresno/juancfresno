// Home · featured projects module — Figma "04 · Archivo" (7173:7118, 1680 × 2729).
// PREVIEW: six pieces exported from the frame (public/home/featured/), not
// linked to any case yet. When a piece gets its case, add `slug` here and the
// module can link it. Coordinates are the frame's, in px at 1680; the module
// turns them into percentages so the layout is liquid.
//   speed  scroll parallax factor (1 = moves with the page, > 1 faster, < 1 slower)
//   video  optional loop played over the image: `src` (muted mp4), `box` = the
//          screen inside the exported frame, in the piece's own px (same units
//          as w/h). The image stays underneath as the poster and the fallback.

export type FeaturedPiece = {
  key: string
  src: string
  w: number // frame px
  h: number
  x: number
  y: number
  speed: number
  slug?: string
  video?: { src: string; box: { x: number; y: number; w: number; h: number } }
}

export const FEATURED_FRAME = { w: 1680, h: 2729 }

// The label block ("/ Selected projects" + rule): x 1387, y 58, w 253.
export const FEATURED_LABEL = { x: 1387, y: 58, w: 253 }

export const FEATURED_PREVIEW: FeaturedPiece[] = [
  { key: 'prolicht', src: '/home/featured/01-prolicht.webp', x: 107, y: 130, w: 792, h: 493, speed: 0.92,
    // prolicht.at/es walkthrough (hero slides, Productos menu, panels, projects carousel, Soluciones → hero),
    // 1440 × 918, 1024 px h264, 46 s loop: `node scripts/record-site-demo.mjs prolicht`
    video: { src: '/home/featured/01-prolicht.mp4', box: { x: 138, y: 85.5, w: 508, h: 324 } } },
  { key: 'portrait', src: '/home/featured/02-portrait.webp', x: 1185, y: 332, w: 388, h: 582, speed: 1.16 },
  { key: 'subway', src: '/home/featured/03-subway.webp', x: 175, y: 800, w: 659, h: 332, speed: 1.05 },
  { key: 'found', src: '/home/featured/04-found.webp', x: 848, y: 1283, w: 792, h: 447, speed: 0.9,
    // biakone.com walkthrough (Home → Work → Stickers → Posters → Lab → Manifesto → Home),
    // recorded headless at 1440 × 790, 1024 px h264, 46 s loop: `node scripts/record-site-demo.mjs biakone`
    video: { src: '/home/featured/04-found.mp4', box: { x: 138, y: 85, w: 508, h: 279 } } },
  { key: 'wheel', src: '/home/featured/05-wheel.webp', x: 107, y: 1368, w: 388, h: 583, speed: 1.18 },
  { key: 'correos', src: '/home/featured/06-correos.webp', x: 1185, y: 1867, w: 388, h: 388, speed: 1.06 },
  { key: 'zorrogris', src: '/home/featured/07-zorrogris.webp', x: 377, y: 2061, w: 657, h: 435, speed: 0.96,
    // elzorrogris.es: home hero → section homes via the nav (Finanzas, Salud, Cultura, Ocio) → home,
    // 1440 × 792, 1024 px h264, 46 s loop: `node scripts/record-site-demo.mjs zorrogris`
    video: { src: '/home/featured/07-zorrogris.mp4', box: { x: 114.588, y: 102.537, w: 421.188, h: 231.565 } } },
]
