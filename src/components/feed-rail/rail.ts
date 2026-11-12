// ─── Gallery 2 · scroll rail (raw WebGL2, no deps) ───────────────────────────
// A flat horizontal row of square-cornered cards driven by the page scroll
// (FeedRail.tsx owns the physics). At rest it is a clean, flat row; with
// speed the picture goes through our fisheye language:
//   1. a global barrel on the screen (centre swells, edges bend),
//   2. a rubber "drag": every row of pixels shifts against the motion by
//      bend · ny², so the vertical card edges bow (the middle leads, top and
//      bottom trail) and flip back on the spring's overshoot,
//   3. a vertical squash and, inside each card, a bulge (fisheye on the
//      card's own centre) + horizontal stretch of the picture,
//   4. the feed's RGB split along x (R behind, B ahead).
// The fragment shader maps every screen pixel to a source point (all maps are
// "where do I sample", so no inversion is needed) and looks the card up in
// one atlas (feed-strip/strip.ts createAtlas). One full-screen quad.
import { buildProgram, createAtlas, createQuad, MAX_CARDS, type StripCard } from '@/components/feed-strip/strip'

export type RailGeo = {
  W: number; H: number // canvas, CSS px
  cy: number           // card centre line, CSS px from the top
  hc: number           // card height, CSS px
}

export type RailFx = {
  off: number      // strip px at the canvas's left edge
  amt: number      // 0–1 deformation amount (from |velocity|)
  bend: number     // signed rubber bend, CSS px at the card's top/bottom
  split: number    // signed RGB split, CSS px
}

export type RailLayout = { xs: number[]; ws: number[]; len: number }

// Strength of each effect at amt = 1.
export const FX = { barrel: 0.2, bulge: 0.42, stretch: 0.28, squash: 0.1 }

const VS = `#version 300 es
layout(location=0) in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`

const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;      // device px
uniform float uDpr;
uniform vec4 uGeo;      // W, cy, hc, off
uniform vec4 uFx;       // barrel, bulge, stretch, squash (already × amt)
uniform float uBend;    // CSS px
uniform int uN;
uniform vec4 uCard[${MAX_CARDS}];   // x0, w (strip px), ready, -
uniform vec4 uUV[${MAX_CARDS}];
uniform float uAtlasH;
uniform float uSplit;   // device px
uniform vec3 uBg;
uniform vec3 uStage;
out vec4 o;

vec4 rail(vec2 p){
  float W = uGeo.x, cy = uGeo.y, hc = uGeo.z, hy = hc * 0.5;
  vec2 q = p - vec2(W * 0.5, cy);
  // 1. global barrel: sample nearer the centre there (it swells), farther out
  //    at the edges (they bend away). r² normalised to the half width.
  vec2 n = q / (W * 0.5);
  float r2 = dot(n, n);
  q *= 1.0 - uFx.x * (1.0 - min(r2, 2.0));
  // 3a. vertical squash (taller sampling window = shorter picture).
  q.y *= 1.0 + uFx.w;
  // 2. rubber drag: rows away from the centre line trail the motion.
  float ny = clamp(q.y / hy, -1.4, 1.4);
  q.x -= uBend * ny * ny;
  if (abs(q.y) > hy + 1.0) return vec4(0.0);
  float s = q.x + W * 0.5 + uGeo.w;
  int idx = -1; float x0 = 0.0, w = 1.0, ready = 0.0;
  for (int i = 0; i < ${MAX_CARDS}; i++) {
    if (i >= uN) break;
    vec4 cd = uCard[i];
    if (s >= cd.x && s < cd.x + cd.y) { idx = i; x0 = cd.x; w = cd.y; ready = cd.z; }
  }
  if (idx < 0) return vec4(0.0);
  // Square corners: coverage from the straight card edges in source space.
  float scale = (1.0 + uFx.w);
  float ex = min(s - x0, x0 + w - s) * uDpr;
  float ey = (hy - abs(q.y)) / scale * uDpr;
  float cov = clamp(min(ex, ey) + 0.5, 0.0, 1.0);
  // 3b. inside the card: fisheye bulge on its own centre + horizontal stretch.
  vec2 lc = vec2((s - x0) / w * 2.0 - 1.0, q.y / hy);
  lc *= 1.0 - uFx.y * (1.0 - min(1.0, dot(lc, lc) * 0.5));
  lc.x /= 1.0 + uFx.z;
  vec2 local = clamp(lc * 0.5 + 0.5, 0.0, 1.0);
  vec4 r = uUV[idx];
  vec2 uv = r.xy + local * r.zw;
  float tpp = (r.w * uAtlasH) / (hc * uDpr);
  float lod = log2(max(1.0, tpp));
  vec3 col = mix(uStage, textureLod(uTex, uv, lod).rgb, ready);
  return vec4(col, cov);
}

void main(){
  vec2 pd = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = pd / uDpr;
  vec4 c = rail(p);
  vec3 col;
  if (abs(uSplit) > 0.01) {
    vec2 sv = vec2(uSplit / uDpr, 0.0);
    vec4 cR = rail(p - sv), cB = rail(p + sv);
    col = vec3(mix(uBg.r, cR.r, cR.a), mix(uBg.g, c.g, c.a), mix(uBg.b, cB.b, cB.a));
  } else {
    col = mix(uBg, c.rgb, c.a);
  }
  o = vec4(col, 1.0);
}`

export function layoutRail(cards: StripCard[], hc: number, gap: number): RailLayout {
  const xs: number[] = [], ws: number[] = []
  let x = 0
  for (const c of cards) { xs.push(x); ws.push(hc * c.ratio); x += hc * c.ratio + gap }
  return { xs, ws, len: Math.max(1, x - gap) }
}

/** Same sampling map as the shader → card index under a screen point, or −1. */
export function hitRail(g: RailGeo, L: RailLayout, f: RailFx, px: number, py: number) {
  let qx = px - g.W / 2, qy = py - g.cy
  const nx = qx / (g.W / 2), nyy = qy / (g.W / 2)
  const k = 1 - FX.barrel * f.amt * (1 - Math.min(nx * nx + nyy * nyy, 2))
  qx *= k; qy *= k
  qy *= 1 + FX.squash * f.amt
  const ny = Math.max(-1.4, Math.min(1.4, qy / (g.hc / 2)))
  qx -= f.bend * ny * ny
  if (Math.abs(qy) > g.hc / 2) return -1
  const s = qx + g.W / 2 + f.off
  for (let i = 0; i < L.xs.length; i++) if (s >= L.xs[i] && s < L.xs[i] + L.ws[i]) return i
  return -1
}

export function createRail(canvas: HTMLCanvasElement, cards: StripCard[], small: boolean, onChange: () => void) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' })
  if (!gl || gl.isContextLost()) return null
  let p: WebGLProgram
  try { p = buildProgram(gl, VS, FS) } catch { return null }
  const u = (n: string) => gl.getUniformLocation(p, n)
  const U = {
    tex: u('uTex'), res: u('uRes'), dpr: u('uDpr'), geo: u('uGeo'), fx: u('uFx'), bend: u('uBend'), n: u('uN'),
    card: u('uCard'), uv: u('uUV'), atlasH: u('uAtlasH'), split: u('uSplit'), bg: u('uBg'), stage: u('uStage'),
  }
  const list = cards.slice(0, MAX_CARDS)
  const quad = createQuad(gl)
  // Cells a bit taller than the card at dpr 1–1.5 (the bulge magnifies ≤ 1.7×).
  const atlas = createAtlas(gl, list, small ? 320 : 560, onChange)
  let dpr = 1
  const cardBuf = new Float32Array(MAX_CARDS * 4)
  return {
    resize(w: number, h: number, d: number) {
      dpr = d
      canvas.width = Math.max(1, Math.round(w * d)); canvas.height = Math.max(1, Math.round(h * d))
    },
    draw(g: RailGeo, L: RailLayout, f: RailFx, bg: [number, number, number], stage: [number, number, number]) {
      atlas.bind(performance.now())
      for (let i = 0; i < list.length; i++) cardBuf.set([L.xs[i], L.ws[i], atlas.ready[i], 0], i * 4)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.useProgram(p)
      gl.uniform1i(U.tex, 0)
      gl.uniform2f(U.res, canvas.width, canvas.height)
      gl.uniform1f(U.dpr, dpr)
      gl.uniform4f(U.geo, g.W, g.cy, g.hc, f.off)
      const a = f.amt
      gl.uniform4f(U.fx, FX.barrel * a, FX.bulge * a, FX.stretch * a, FX.squash * a)
      gl.uniform1f(U.bend, f.bend)
      gl.uniform1i(U.n, list.length)
      gl.uniform4fv(U.card, cardBuf)
      gl.uniform4fv(U.uv, atlas.uvs)
      gl.uniform1f(U.atlasH, atlas.AH)
      gl.uniform1f(U.split, f.split * dpr)
      gl.uniform3fv(U.bg, bg)
      gl.uniform3fv(U.stage, stage)
      gl.bindVertexArray(quad.vao)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    pending: () => atlas.pending(),
    destroy() { atlas.destroy(); quad.destroy(); gl.deleteProgram(p) },
  }
}

export type Rail = NonNullable<ReturnType<typeof createRail>>
