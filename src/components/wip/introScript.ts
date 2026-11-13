// Home entrance (wip/Intro.tsx): decided before the first paint, in <head>, so
// nothing flashes. Only on the landing (/ and /es). First visit in the
// session = "full" (~1.5 s), later loads = "fast" (~0.7 s), reduced motion =
// "reduced" (a plain fade). sessionStorage 'wip:intro'.
//
// The grid does not wait for the JS bundle: introGrid() below is inlined in
// <head> and starts on the first frame the page can paint (lines fall, gutters
// open, columns fill; same timings, eases and colour as Intro.tsx had). When
// React arrives, Intro.tsx adds the boxes on its own canvas and calls
// window.__introGrid.out() for the exit (the lines fall on out of the bottom).
// On a slow connection the lit grid IS the wait. Safety: if the bundle is not
// there 2.4 s after the grid started, the page is released anyway (text rises
// through its masks, the grid leaves) and Intro.tsx finds nothing left to do.

export type IntroGrid = {
  /** performance.now() of the first drawn frame. */
  t0: number
  /** 1 = full, 0.5 = fast. */
  k: number
  /** Lines fall out of the bottom, the fill fades; the canvas removes itself. */
  out: () => void
  /** Remove at once (skip). */
  kill: () => void
}

// Runs as an inline script: plain ES5-ish JS, no imports, no closures over
// module scope (it is serialised with toString()).
function introGrid() {
  try {
    if (!/^\/(es\/?)?$/.test(location.pathname)) return
    var r = document.documentElement
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    var seen = null
    try { seen = sessionStorage.getItem('wip:intro'); sessionStorage.setItem('wip:intro', '1') } catch (e) {}
    var mode = reduced ? 'reduced' : seen ? 'fast' : 'full'
    r.dataset.intro = mode
    var w = window as unknown as { __introGrid?: IntroGrid }
    var release = function () {
      if (!('introGo' in r.dataset)) { r.dataset.introGo = ''; window.dispatchEvent(new Event('wip:intro-go')) }
      if (w.__introGrid) w.__introGrid.out()
    }
    if (reduced) { setTimeout(release, 2400); return }

    var k = mode === 'fast' ? 0.5 : 1
    var T = { drop: 520, stagger: 28, splitAt: 300, split: 520, fillAt: 420, fill: 620, head: 72, out: 420, outSpread: 160, fillOut: 300 }
    var bez = function (x1: number, y1: number, x2: number, y2: number) {
      var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
      var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
      return function (x: number) {
        if (x <= 0) return 0
        if (x >= 1) return 1
        var lo = 0, hi = 1, t = x
        for (var i = 0; i < 18; i++) {
          var v = ((ax * t + bx) * t + cx) * t
          if (Math.abs(v - x) < 1e-4) break
          if (v < x) lo = t; else hi = t
          t = (lo + hi) / 2
        }
        return ((ay * t + by) * t + cy) * t
      }
    }
    var SOFT = bez(0.65, 0, 0.35, 1), DROP = bez(0.33, 1, 0.68, 1), OUT = bez(0, 0, 0.58, 1)
    var prog = function (t: number, at: number, d: number) { return Math.max(0, Math.min(1, (t - at) / d)) }

    var cv: HTMLCanvasElement | null = null
    var g: CanvasRenderingContext2D | null = null
    var cols: { x: number; w: number }[] = []
    var W = 0, H = 0, dpr = 1, gap = 16
    var raf = 0, t0 = 0, tOut = -1, dead = false
    var api: IntroGrid = {
      t0: 0, k: k,
      out: function () { if (dead || tOut >= 0) return; tOut = performance.now(); if (!raf) raf = requestAnimationFrame(frame) },
      kill: function () { dead = true; cancelAnimationFrame(raf); if (cv) cv.remove() },
    }

    var frame = function (now: number) {
      raf = 0
      if (dead || !g || !cv) return
      if (!t0) { t0 = now; api.t0 = now }
      var t = (now - t0) / k
      var te = tOut >= 0 ? (now - tOut) / k : -1
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, W, H)
      var n = cols.length
      var step = n > 1 ? 11 / (n - 1) : 0 // same total stagger for 24 (or 4 phone) columns
      var fillA = te < 0 ? 1 : 1 - SOFT(prog(te, 0, T.fillOut))
      var live = false
      for (var i = 0; i < n; i++) {
        var c = cols[i], o = i * step
        var pf = SOFT(prog(t, T.fillAt, T.fill))
        if (pf > 0 && fillA > 0) {
          g.globalAlpha = fillA * Math.min(1, pf * 2)
          g.fillStyle = 'rgba(0, 61, 255, 0.04)'
          g.fillRect(c.x, 0, c.w, H * pf)
        }
        var rd = prog(t, o * T.stagger, T.drop)
        if (rd <= 0) { live = true; continue }
        var pd = DROP(rd)
        var ps = SOFT(prog(t, T.splitAt + o * T.stagger, T.split))
        if (rd < 1 || ps < 1 || pf < 1) live = true
        // Exit: the top end follows the line down and out of the bottom.
        var pu = te < 0 ? 0 : SOFT(prog(te, (n > 1 ? i / (n - 1) : 0) * T.outSpread, T.out))
        if (pu >= 1) continue
        if (te >= 0) live = true
        var y0 = H * pu, y1 = H * pd
        if (y1 <= y0) continue
        var head = te >= 0 ? 0 : 1 - OUT(prog(t, o * T.stagger + T.drop * 0.85, 260)) // dims as it lands
        if (head > 0) live = true
        var xs = [c.x + (i > 0 ? -gap / 2 : 0) * (1 - ps), c.x + c.w - 1 + (i < n - 1 ? gap / 2 : 0) * (1 - ps)]
        for (var j = 0; j < 2; j++) {
          var x = Math.round(xs[j] * dpr) / dpr
          g.globalAlpha = Math.min(1, rd * 6)
          g.fillStyle = 'rgba(0, 61, 255, 0.55)'
          g.fillRect(x, y0, 1, y1 - y0)
          if (head > 0 && y1 > 2) {
            var h0 = Math.max(y0, y1 - T.head)
            var grd = g.createLinearGradient(0, h0, 0, y1)
            grd.addColorStop(0, 'rgba(0, 61, 255, 0)')
            grd.addColorStop(1, 'rgba(0, 61, 255, 1)')
            g.globalAlpha = head
            g.fillStyle = grd
            g.fillRect(x, h0, 1, y1 - h0)
          }
        }
      }
      g.globalAlpha = 1
      if (te >= 0 && !live) { api.kill(); return }
      // Grid complete and nobody asked for the exit yet: hold the last frame.
      if (live) raf = requestAnimationFrame(frame)
    }

    var start = function () {
      if (!document.body) { requestAnimationFrame(start); return }
      // The site grid, measured: the same CSS as the G overlay (GridOverlay.module.scss).
      var phone = window.innerWidth <= 768
      var probe = document.createElement('div')
      probe.setAttribute('aria-hidden', 'true')
      probe.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:0;visibility:hidden;pointer-events:none;box-sizing:border-box;display:grid;'
        + 'padding-inline:max(var(--m),env(safe-area-inset-left,0px)) max(var(--m),env(safe-area-inset-right,0px));'
        + 'column-gap:var(--gutter);grid-template-columns:repeat(' + (phone ? 4 : 24) + ',1fr)'
      for (var i = 0; i < (phone ? 4 : 24); i++) probe.appendChild(document.createElement('span'))
      document.body.appendChild(probe)
      for (var q = 0; q < probe.children.length; q++) {
        var b = probe.children[q].getBoundingClientRect()
        if (b.width > 0) cols.push({ x: b.left, w: b.width })
      }
      probe.remove()
      if (!cols.length) return
      gap = cols.length > 1 ? cols[1].x - (cols[0].x + cols[0].w) : 16
      W = document.documentElement.clientWidth
      H = window.innerHeight
      dpr = Math.min(2, window.devicePixelRatio || 1)
      cv = document.createElement('canvas')
      cv.setAttribute('aria-hidden', 'true')
      cv.setAttribute('data-intro-grid', '')
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      // Over header, copy and footer; under the box canvas (140) and the grain (150).
      cv.style.cssText = 'position:fixed;left:0;top:0;width:' + W + 'px;height:' + H + 'px;z-index:139;pointer-events:none'
      g = cv.getContext('2d')
      if (!g) return
      document.body.appendChild(cv)
      w.__introGrid = api
      raf = requestAnimationFrame(frame)
      setTimeout(release, 2400)
    }
    requestAnimationFrame(start)
  } catch (e) {}
}

export const WIP_INTRO_SCRIPT = `(${introGrid.toString()})()`
