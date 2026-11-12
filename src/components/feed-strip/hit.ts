// ─── Shared "hit" motion for both feed galleries ─────────────────────────────
// Gallery 1 (LatestStrip) and gallery 2 (FeedRail) move in HITS: one card at
// a time, a strong ease-in-out (it accelerates, then brakes), then a pause.
// The same curve snaps a drag release; on a release the tween starts at the
// throw's speed (Hermite term below) so the hand-off from the finger is
// continuous.

export const HIT_MS = 860      // one hit
export const HIT_PAUSE = 2400  // rest between two hits (end → start)
export const RESUME_MS = 3000  // auto-advance comes back this long after the last interaction
export const MAXV = 1.8        // px/ms release cap (the feed's)
export const THROW_MS = 260    // a release lands where its speed would carry it in this long

// cubic-bezier(x1, y1, x2, y2) as a function of t (Newton + bisection on x).
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t
  const sy = (t: number) => ((ay * t + by) * t + cy) * t
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 6; i++) {
      const e = sx(t) - x, d = dx(t)
      if (Math.abs(e) < 1e-5) return sy(t)
      if (Math.abs(d) < 1e-6) break
      t -= e / d
    }
    let lo = 0, hi = 1
    t = x
    for (let i = 0; i < 20; i++) {
      const v = sx(t)
      if (Math.abs(v - x) < 1e-5) break
      if (v < x) lo = t; else hi = t
      t = (lo + hi) / 2
    }
    return sy(t)
  }
}

// The hit: fast middle, hard brake (expo-like in-out).
export const hitEase = cubicBezier(0.76, 0, 0.24, 1)

export type Tween = { from: number; to: number; t0: number; dur: number; v0: number }

/** Position of a tween at `now`. v0 (px/ms) adds the Hermite h10 basis
 *  t(1 − t)², so the curve leaves at the release speed and still lands
 *  exactly on `to` with zero speed. Returns [value, done]. */
export function tweenAt(tw: Tween, now: number): [number, boolean] {
  const t = Math.min(1, Math.max(0, (now - tw.t0) / tw.dur))
  if (t >= 1) return [tw.to, true]
  const h = t * (1 - t) * (1 - t)
  return [tw.from + (tw.to - tw.from) * hitEase(t) + tw.v0 * tw.dur * h, false]
}
