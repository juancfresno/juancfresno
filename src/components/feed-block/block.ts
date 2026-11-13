// ─── Gallery 3 · one-surface block (raw WebGL2, no deps) ─────────────────────
// Same cards as gallery 2 (feed-rail) but the effect bends the WHOLE BLOCK,
// not each photo (refs: jesperlandberg.com plane, mathiasadolfsson.dev drag +
// RGB + fisheye). Two passes per frame, only while it moves:
//   1. COMPOSE: the flat endless row (cards + gutters + background) is drawn
//      into one offscreen framebuffer at device resolution, a margin E wider
//      than the canvas on each side so the lens can pull pixels in from
//      off-screen. No distortion here: it is just the picture of the block.
//   2. LENS: one full-screen pass samples that framebuffer through a single
//      map applied to the block as one surface, driven by the drag velocity:
//        · fisheye / barrel on the whole canvas (centre swells, sides recede,
//          the top and bottom edges of the row curve),
//        · rubber bend: rows away from the centre line trail the motion, so
//          every gutter bows the same way, continuously across the block,
//        · horizontal velocity stretch,
//        · RGB split weighted by the lens radius (stronger at the sides),
//        · a short directional smear along the motion (7 taps, tent),
//        · depth: the whole block scales about the lens centre (fx.zoom,
//          FeedBlock's spring: > 1 = closer while it moves, < 1 = it recedes
//          a touch past rest when released, then settles at 1).
//      Distortion is therefore continuous across photo boundaries and gutters.
// At rest every effect is 0 and pass 2 is an exact 1:1 copy (texel-aligned).
import { buildProgram, createAtlas, createQuad, MAX_CARDS, type StripCard } from '@/components/feed-strip/strip'

export type BlockGeo = {
  W: number; H: number // canvas, CSS px
  cy: number           // card centre line, CSS px from the top
  hc: number           // card height, CSS px
}

export type BlockFx = {
  off: number    // strip px at the canvas's left edge (wrapped by len)
  amt: number    // 0–1 effect amount (from |velocity|)
  dir: number    // −1 / 1, direction of the motion on screen
  bend: number   // signed rubber bend, CSS px at the block's top/bottom
  split: number  // signed RGB split, CSS px
  zoom: number   // depth scale about the lens centre (1 = rest)
}

export type BlockLayout = { xs: number[]; ws: number[]; len: number }

// Strength of each effect at amt = 1.
export const FX = { lens: 0.2, stretch: 0.14, smear: 10 }
// Off-screen margin of the composed block, as a fraction of the width.
const EXT = 0.22

const VS = `#version 300 es
layout(location=0) in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`

// Pass 1 · flat block → framebuffer. One pixel = one CSS px · dpr of the row.
const FS_COMPOSE = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;      // framebuffer, device px
uniform float uDpr;
uniform float uE;       // margin, CSS px (left of the canvas)
uniform vec4 uGeo;      // cy, hc, off, len
uniform int uN;
uniform vec4 uCard[${MAX_CARDS}];   // x0, w (strip px), ready, -
uniform vec4 uUV[${MAX_CARDS}];
uniform float uAtlasH;
uniform vec3 uBg;
uniform vec3 uStage;
out vec4 o;
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  float cy = uGeo.x, hc = uGeo.y, hy = hc * 0.5;
  float dy = p.y - cy;
  vec3 col = uBg;
  if (abs(dy) <= hy + 1.0) {
    float s = mod(p.x - uE + uGeo.z, uGeo.w);
    for (int i = 0; i < ${MAX_CARDS}; i++) {
      if (i >= uN) break;
      vec4 cd = uCard[i];
      if (s >= cd.x && s < cd.x + cd.y) {
        float cov = clamp(min(min(s - cd.x, cd.x + cd.y - s), hy - abs(dy)) * uDpr + 0.5, 0.0, 1.0);
        vec2 local = clamp(vec2((s - cd.x) / cd.y, (dy + hy) / hc), 0.0, 1.0);
        vec4 r = uUV[i];
        float tpp = (r.w * uAtlasH) / (hc * uDpr);
        vec3 c = mix(uStage, textureLod(uTex, r.xy + local * r.zw, log2(max(1.0, tpp))).rgb, cd.z);
        col = mix(uBg, c, cov);
        break;
      }
    }
  }
  o = vec4(col, 1.0);
}`

// Pass 2 · the lens over the whole composed block.
const FS_LENS = `#version 300 es
precision highp float;
uniform sampler2D uFbo;
uniform vec2 uRes;      // canvas, device px
uniform vec2 uFboRes;   // framebuffer, device px
uniform float uDpr;
uniform float uE;       // margin, device px (integer)
uniform vec2 uC;        // lens centre, CSS px (W/2, cy)
uniform vec4 uFx;       // lens, stretch, bend (CSS px), smear (CSS px)  (× amt, signed)
uniform float uSplit;   // CSS px, signed
uniform float uZoom;    // depth scale (1 = rest)
uniform vec3 uBg;
out vec4 o;

// Where the block is sampled for screen point p (CSS px).
vec2 lensMap(vec2 p){
  vec2 q = (p - uC) / uZoom;
  float hw = uC.x;
  // Fisheye on the block: r² against the half width (y counts a bit more,
  // so the row's top/bottom edges bow). Centre samples nearer (swells),
  // edges sample farther out (recede, pulled in from the off-screen margin).
  vec2 n = vec2(q.x / hw, q.y / (hw * 0.62));
  float r2 = min(dot(n, n), 2.2);
  q *= 1.0 - uFx.x * (1.0 - r2);
  // Velocity stretch along x.
  q.x /= 1.0 + uFx.y;
  // Rubber bend: the farther from the centre line, the more it trails.
  float ny = clamp(q.y / (hw * 0.3), -1.6, 1.6);
  q.x -= uFx.z * ny * ny;
  return q + uC;
}

vec3 fetch(vec2 p){
  vec2 d = p * uDpr + vec2(uE, 0.0);
  if (d.x < 0.0 || d.y < 0.0 || d.x > uFboRes.x || d.y > uFboRes.y) return uBg;
  return texture(uFbo, vec2(d.x, uFboRes.y - d.y) / uFboRes).rgb;
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 m = lensMap(p);
  // RGB split: stronger toward the sides of the lens (chromatic aberration).
  float w = 0.45 + 0.55 * min(1.0, abs(p.x - uC.x) / uC.x);
  vec2 sv = vec2(uSplit * w, 0.0);
  vec3 col;
  if (abs(uFx.w) > 0.05) {
    // Smear: 7 taps along the motion (tent weights), each channel with its
    // own split offset.
    vec3 acc = vec3(0.0); float ws = 0.0;
    for (int i = 0; i < 7; i++) {
      float f = float(i) / 6.0 - 0.5;
      float k = 1.0 - abs(f);
      vec2 t = vec2(f * uFx.w, 0.0);
      acc += k * vec3(fetch(m - sv + t).r, fetch(m + t).g, fetch(m + sv + t).b);
      ws += k;
    }
    col = acc / ws;
  } else if (abs(uSplit) > 0.01) {
    col = vec3(fetch(m - sv).r, fetch(m).g, fetch(m + sv).b);
  } else {
    col = fetch(m);
  }
  o = vec4(col, 1.0);
}`

export function layoutBlock(cards: StripCard[], hc: number, gap: number): BlockLayout {
  const xs: number[] = [], ws: number[] = []
  let x = 0
  for (const c of cards) { xs.push(x); ws.push(hc * c.ratio); x += hc * c.ratio + gap }
  return { xs, ws, len: Math.max(1, x) } // includes the gap after the last card (loop)
}

const wrap = (v: number, n: number) => ((v % n) + n) % n

/** Same map as the lens shader → card index under a screen point, or −1. */
export function hitBlock(g: BlockGeo, L: BlockLayout, f: BlockFx, px: number, py: number) {
  const hw = g.W / 2
  let qx = (px - hw) / f.zoom, qy = (py - g.cy) / f.zoom
  const nx = qx / hw, nyy = qy / (hw * 0.62)
  const k = 1 - FX.lens * f.amt * (1 - Math.min(nx * nx + nyy * nyy, 2.2))
  qx *= k; qy *= k
  qx /= 1 + FX.stretch * f.amt
  const ny = Math.max(-1.6, Math.min(1.6, qy / (hw * 0.3)))
  qx -= f.bend * ny * ny
  if (Math.abs(qy) > g.hc / 2) return -1
  const s = wrap(qx + hw + f.off, L.len)
  for (let i = 0; i < L.xs.length; i++) if (s >= L.xs[i] && s < L.xs[i] + L.ws[i]) return i
  return -1
}

export function createBlock(canvas: HTMLCanvasElement, cards: StripCard[], small: boolean, onChange: () => void) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' })
  if (!gl || gl.isContextLost()) return null
  let pc: WebGLProgram, pl: WebGLProgram
  try { pc = buildProgram(gl, VS, FS_COMPOSE); pl = buildProgram(gl, VS, FS_LENS) } catch { return null }
  const uc = (n: string) => gl.getUniformLocation(pc, n)
  const ul = (n: string) => gl.getUniformLocation(pl, n)
  const UC = {
    tex: uc('uTex'), res: uc('uRes'), dpr: uc('uDpr'), e: uc('uE'), geo: uc('uGeo'), n: uc('uN'),
    card: uc('uCard'), uv: uc('uUV'), atlasH: uc('uAtlasH'), bg: uc('uBg'), stage: uc('uStage'),
  }
  const UL = {
    fbo: ul('uFbo'), res: ul('uRes'), fboRes: ul('uFboRes'), dpr: ul('uDpr'), e: ul('uE'), c: ul('uC'),
    fx: ul('uFx'), split: ul('uSplit'), zoom: ul('uZoom'), bg: ul('uBg'),
  }
  const list = cards.slice(0, MAX_CARDS)
  const quad = createQuad(gl)
  const atlas = createAtlas(gl, list, small ? 320 : 560, onChange)
  const cardBuf = new Float32Array(MAX_CARDS * 4)

  // Offscreen target for the composed block.
  const fbo = gl.createFramebuffer()
  const ftex = gl.createTexture()
  let FW = 1, FH = 1, Ed = 0, dpr = 1
  const allocFbo = () => {
    gl.bindTexture(gl.TEXTURE_2D, ftex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, FW, FH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ftex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  return {
    resize(w: number, h: number, d: number) {
      dpr = d
      canvas.width = Math.max(1, Math.round(w * d)); canvas.height = Math.max(1, Math.round(h * d))
      Ed = Math.round(w * EXT * d)
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
      FW = Math.min(max, canvas.width + 2 * Ed); FH = canvas.height
      allocFbo()
    },
    draw(g: BlockGeo, L: BlockLayout, f: BlockFx, bg: [number, number, number], stage: [number, number, number]) {
      // ── pass 1: compose the flat block ──
      atlas.bind(performance.now())
      for (let i = 0; i < list.length; i++) cardBuf.set([L.xs[i], L.ws[i], atlas.ready[i], 0], i * 4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.viewport(0, 0, FW, FH)
      gl.useProgram(pc)
      gl.activeTexture(gl.TEXTURE0)
      gl.uniform1i(UC.tex, 0)
      gl.uniform2f(UC.res, FW, FH)
      gl.uniform1f(UC.dpr, dpr)
      gl.uniform1f(UC.e, Ed / dpr)
      gl.uniform4f(UC.geo, g.cy, g.hc, wrap(f.off, L.len), L.len)
      gl.uniform1i(UC.n, list.length)
      gl.uniform4fv(UC.card, cardBuf)
      gl.uniform4fv(UC.uv, atlas.uvs)
      gl.uniform1f(UC.atlasH, atlas.AH)
      gl.uniform3fv(UC.bg, bg)
      gl.uniform3fv(UC.stage, stage)
      gl.bindVertexArray(quad.vao)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      // ── pass 2: lens over the whole block ──
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.useProgram(pl)
      gl.bindTexture(gl.TEXTURE_2D, ftex)
      gl.uniform1i(UL.fbo, 0)
      gl.uniform2f(UL.res, canvas.width, canvas.height)
      gl.uniform2f(UL.fboRes, FW, FH)
      gl.uniform1f(UL.dpr, dpr)
      gl.uniform1f(UL.e, Ed)
      gl.uniform2f(UL.c, g.W / 2, g.cy)
      const a = f.amt
      gl.uniform4f(UL.fx, FX.lens * a, FX.stretch * a, f.bend, FX.smear * a * a * f.dir)
      gl.uniform1f(UL.split, f.split)
      gl.uniform1f(UL.zoom, f.zoom)
      gl.uniform3fv(UL.bg, bg)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    pending: () => atlas.pending(),
    destroy() {
      atlas.destroy(); quad.destroy()
      gl.deleteFramebuffer(fbo); gl.deleteTexture(ftex)
      gl.deleteProgram(pc); gl.deleteProgram(pl)
    },
  }
}

export type Block = NonNullable<ReturnType<typeof createBlock>>
