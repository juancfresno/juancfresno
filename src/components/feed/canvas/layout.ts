// ─── Feed canvas: world layout ───────────────────────────────────────────────
// One hand-composed tile (src/content/feed-canvas.json, grid units) repeats in
// both directions. Every tile instance (i, j) shows a different "variant" of
// the piece list, so walking the plane goes through all 201 pieces and two
// neighbouring tiles never show the same piece in the same slot.
import tileData from '@/content/feed-canvas.json'
import type { FeedItem } from '@/content/feed'

export type Slot = { x: number; y: number; w: number; h: number }
export type Tile = { cols: number; rows: number; slots: Slot[] }

export const TILE = tileData as unknown as Tile & { source: string }

// Site grid, liquid, same as the --m / --gutter tokens: margin max(20, 2.381vw),
// gutter max(12, 0.952vw) (40/16 at 1680), 12 at ≤ 768; 4 columns at ≤ 768.
// One unit = column + gutter.
export function gridMetrics(W: number) {
  const margin = Math.max(20, W * 0.02381)
  const gutter = W <= 768 ? 12 : Math.max(12, W * 0.00952)
  const cols = W <= 768 ? 4 : 12
  const unit = (W - 2 * margin + gutter) / cols
  return { margin, gutter, cols, unit }
}

// The feed has three ratios: 4:3 (167 pieces), 4:5 (31) and 9:16 (3).
type Orientation = 'land' | 'port' | 'tall'
const orientationOf = (w: number, h: number): Orientation => (h / w > 1.5 ? 'tall' : h / w > 1.05 ? 'port' : 'land')
const FOLD: Record<Orientation, Orientation[]> = { tall: ['port', 'land'], port: ['land', 'tall'], land: ['port', 'tall'] }
const ORIENTATIONS: Orientation[] = ['land', 'port', 'tall']

export type Layout = {
  unit: number
  gutter: number
  TW: number // tile size in px
  TH: number
  variants: number
  // piece index for slot s in tile variant v
  piece: (v: number, s: number) => number
  variantOf: (i: number, j: number) => number
}

// Off: one piece per slot and every tile repeat is identical (the curated
// selection, like Juan Mora's lab). On: each tile copy shows another slice of
// the list ("variants"), for walking a long feed without repeats.
export const ROTATE_VARIANTS = false

export function makeLayout(items: FeedItem[], W: number, tile: Tile = TILE): Layout {
  const { unit, gutter } = gridMetrics(W)
  const base = { unit, gutter, TW: tile.cols * unit, TH: tile.rows * unit }
  if (!ROTATE_VARIANTS) {
    // Slot by slot: the next unused piece with the slot's ratio, else the next
    // unused piece; once all are used, start again from the top of the list.
    const used = new Set<number>()
    const fixed = tile.slots.map((sl) => {
      const o = orientationOf(sl.w, sl.h)
      let k = items.findIndex((it, i) => !used.has(i) && orientationOf(it.w, it.h) === o)
      if (k < 0) k = items.findIndex((_, i) => !used.has(i))
      if (k < 0) { used.clear(); k = items.findIndex((it) => orientationOf(it.w, it.h) === o); if (k < 0) k = 0 }
      used.add(k)
      return k
    })
    return { ...base, variants: 1, piece: (_v, s) => fixed[s], variantOf: () => 0 }
  }
  // Buckets by orientation; slot k of orientation o takes the next piece of o.
  const buckets: Record<Orientation, number[]> = { land: [], port: [], tall: [] }
  items.forEach((it, i) => buckets[orientationOf(it.w, it.h)].push(i))
  const slotO = tile.slots.map((s) => orientationOf(s.w, s.h))
  const rank: number[] = []
  const count: Record<Orientation, number> = { land: 0, port: 0, tall: 0 }
  slotO.forEach((o, s) => { rank[s] = count[o]++ })
  // An orientation with pieces but no slot in the tile lends them to the closest one.
  for (const o of ORIENTATIONS) {
    if (count[o] || !buckets[o].length) continue
    const to = FOLD[o].find((k) => count[k])
    if (to) { buckets[to].push(...buckets[o]); buckets[o] = [] }
  }
  const need = (o: Orientation) => (count[o] && buckets[o].length ? Math.ceil(buckets[o].length / count[o]) : 1)
  const variants = Math.max(5, ...ORIENTATIONS.map(need))
  const piece = (v: number, s: number) => {
    const o = slotO[s], b = buckets[o]
    return b[(v * count[o] + rank[s]) % b.length]
  }
  // Right neighbour +1, lower neighbour +3: all 8 neighbours differ when variants ≥ 5.
  const variantOf = (i: number, j: number) => mod(i + 3 * j, variants)
  return { ...base, variants, piece, variantOf }
}

export const mod = (n: number, m: number) => ((n % m) + m) % m

export type Placed = {
  key: string // i:j:s, stable while the instance is on screen
  idx: number // index into items
  x: number // screen px (before the camera zoom)
  y: number
  w: number
  h: number
}

// Pieces of the plane that intersect the viewport (+ margin), in screen px.
export function visible(L: Layout, tile: Tile, cx: number, cy: number, W: number, H: number, pad = 80): Placed[] {
  const out: Placed[] = []
  const { unit: u, gutter: g, TW, TH } = L
  const i0 = Math.floor((cx - pad) / TW) - 1, i1 = Math.floor((cx + W + pad) / TW)
  const j0 = Math.floor((cy - pad) / TH) - 1, j1 = Math.floor((cy + H + pad) / TH)
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const v = L.variantOf(i, j)
      for (let s = 0; s < tile.slots.length; s++) {
        const sl = tile.slots[s]
        const x = i * TW + sl.x * u - cx, y = j * TH + sl.y * u - cy
        const w = sl.w * u - g, h = sl.h * u - g
        if (x + w < -pad || y + h < -pad || x > W + pad || y > H + pad) continue
        out.push({ key: `${i}:${j}:${s}`, idx: L.piece(v, s), x, y, w, h })
      }
    }
  }
  return out
}

// Cover-fit crop of an image (iw × ih) into a box (w × h): uv offset + scale.
export function coverUv(iw: number, ih: number, w: number, h: number) {
  const ar = iw / ih, br = w / h
  if (ar > br) { const s = br / ar; return [(1 - s) / 2, 0, s, 1] as const }
  const s = ar / br
  return [0, (1 - s) / 2, 1, s] as const
}
