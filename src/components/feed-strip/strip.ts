// ─── Latest strip · curved screen (raw WebGL2, no deps) ──────────────────────
// The latest Instagram + Dribbble posts as one endless row of cards wrapped
// around a convex drum seen from the front (ref. mathiasadolfsson.dev): the
// centre card is the largest, the sides shrink, bend and recede.
//
// Model (CSS px, y down). A card point at arc length u from the camera sits
// at angle θ = u / R on a vertical cylinder of radius R whose front is Z0
// away from the eye; perspective with focal Z0 keeps the centre at scale 1:
//   sx(θ) = Z0·R·sinθ / (Z0 + R(1 − cosθ)),  scale(θ) = Z0 / (Z0 + R(1 − cosθ))
// The fragment shader inverts it in closed form for every pixel:
//   a·sinθ + b·cosθ = c  (a = Z0·R, b = sx·R, c = sx(Z0 + R))
//   θ = asin(c / √(a² + b²)) − atan(b, a)
// so there is no mesh: one full-screen quad, one atlas texture with every
// card, per-card rects in uniform arrays (≤ 24 cards).
// On top: a mild radial barrel on the picture (the home lens), side dimming,
// and the feed's RGB split while moving (R behind, B ahead along the velocity,
// min(18, (speed − 0.6) · 0.6) px, the same curve as orb.ts / feed gl.ts).
import { coverUv } from '@/components/feed/canvas/layout'

export const MAX_CARDS = 24

export type StripCard = { src: string; ratio: number }

export type StripGeo = {
  W: number; H: number // canvas, CSS px
  cy: number           // centre line of the cards, CSS px from the top
  hc: number           // card height at the centre, CSS px
  gap: number          // gap between cards (strip px)
  R: number; Z0: number
  lens: number         // barrel strength (0 = none)
}

export type StripFrame = {
  cam: number          // strip px under the screen centre
  split: number        // signed horizontal split, CSS px
  hover: number        // card index or −1
  focus: number        // dims the others like hover (keyboard)
  bg: [number, number, number]
  stage: [number, number, number]
}

const VS = `#version 300 es
layout(location=0) in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`

const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;        // device px
uniform float uDpr;
uniform vec2 uC;          // centre, CSS px
uniform vec4 uGeo;        // R, Z0, hc, lens
uniform float uCam;       // CSS px
uniform float uLen;       // strip length (one loop)
uniform int uN;
uniform vec4 uCard[${MAX_CARDS}];   // x0, w (strip px), ready (0/1), -
uniform vec4 uUV[${MAX_CARDS}];     // atlas rect, normalised
uniform float uAtlasH;    // atlas height, texels
uniform float uSplit;     // device px, signed (x)
uniform vec3 uBg;
uniform vec3 uStage;
uniform int uHover;
out vec4 o;

// Colour + coverage of the strip at screen point p (CSS px).
vec4 strip(vec2 p){
  float R = uGeo.x, Z0 = uGeo.y, hc = uGeo.z;
  vec2 q = p - uC;
  // Barrel on the picture: points away from the centre read further out,
  // so the middle swells a little (the home lens, gentler).
  float rr = length(q / vec2(uC.x, uC.x * 0.6));
  q *= 1.0 + uGeo.w * rr * rr;
  float sx = q.x;
  float a = Z0 * R, b = sx * R, c = sx * (Z0 + R);
  float m = sqrt(a * a + b * b);
  if (abs(c) >= m) return vec4(0.0);
  float th = asin(c / m) - atan(b, a);
  float sc = Z0 / (Z0 + R * (1.0 - cos(th)));
  float y = q.y / sc;
  float hy = hc * 0.5;
  if (abs(y) > hy + 1.0) return vec4(0.0);
  float s = mod(R * th + uCam, uLen);
  int idx = -1; float x0 = 0.0, w = 1.0, ready = 0.0;
  for (int i = 0; i < ${MAX_CARDS}; i++) {
    if (i >= uN) break;
    vec4 cd = uCard[i];
    if (s >= cd.x && s < cd.x + cd.y) { idx = i; x0 = cd.x; w = cd.y; ready = cd.z; }
  }
  if (idx < 0) return vec4(0.0);
  // Horizontal squeeze at this angle (d sx / d u), for edge AA and the LOD.
  float den = Z0 + R * (1.0 - cos(th));
  float dsx = Z0 * (Z0 * cos(th) + R * (cos(th) - 1.0)) / (den * den);
  float sxs = max(0.05, dsx);
  float ex = min(s - x0, x0 + w - s) * sxs * uDpr;
  float ey = (hy - abs(y)) * sc * uDpr;
  float cov = clamp(min(ex, ey) + 0.5, 0.0, 1.0);
  vec2 local = vec2((s - x0) / w, (y + hy) / hc);
  vec4 r = uUV[idx];
  vec2 uv = r.xy + clamp(local, 0.0, 1.0) * r.zw;
  // LOD from the texel footprint (no derivatives inside the loop's branch).
  float tpp = (r.w * uAtlasH) / (hc * sc * uDpr);
  float lod = log2(max(1.0, tpp * max(1.0, 1.0 / sxs * sc)));
  vec3 col = mix(uStage, textureLod(uTex, uv, lod).rgb, ready);
  // Sides fall into the dark like a drum turning away; hover dims the rest.
  float shade = mix(0.28, 1.0, pow(sc, 2.2));
  if (uHover >= 0 && idx != uHover) shade *= 0.55;
  return vec4(col * shade, cov);
}

void main(){
  vec2 pd = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = pd / uDpr;
  vec4 c = strip(p);
  vec3 col;
  if (abs(uSplit) > 0.01) {
    vec2 sv = vec2(uSplit / uDpr, 0.0);
    vec4 cR = strip(p - sv), cB = strip(p + sv);
    col = vec3(mix(uBg.r, cR.r, cR.a), mix(uBg.g, c.g, c.a), mix(uBg.b, cB.b, cB.a));
  } else {
    col = mix(uBg, c.rgb, c.a);
  }
  o = vec4(col, 1.0);
}`

function compile(gl: WebGL2RenderingContext) {
  const p = gl.createProgram()!
  for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]] as const) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader')
    gl.attachShader(p, sh)
    gl.deleteShader(sh)
  }
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link')
  const u = (n: string) => gl.getUniformLocation(p, n)
  return {
    p,
    u: {
      tex: u('uTex'), res: u('uRes'), dpr: u('uDpr'), c: u('uC'), geo: u('uGeo'), cam: u('uCam'), len: u('uLen'),
      n: u('uN'), card: u('uCard'), uv: u('uUV'), atlasH: u('uAtlasH'), split: u('uSplit'), bg: u('uBg'),
      stage: u('uStage'), hover: u('uHover'),
    },
  }
}

// ── Geometry shared with the DOM (hit test, captions, focus ring) ──
export function layoutStrip(cards: StripCard[], hc: number, gap: number) {
  const xs: number[] = [], ws: number[] = []
  let x = 0
  for (const c of cards) { xs.push(x); ws.push(hc * c.ratio); x += hc * c.ratio + gap }
  return { xs, ws, len: Math.max(1, x) }
}

/** Screen point (CSS px in the canvas) → { card, world u of its left edge, local x 0–1 } or null. */
export function hitTest(g: StripGeo, L: ReturnType<typeof layoutStrip>, cam: number, px: number, py: number) {
  let qx = px - g.W / 2, qy = py - g.cy
  const rr = Math.hypot(qx / (g.W / 2), qy / ((g.W / 2) * 0.6))
  const k = 1 + g.lens * rr * rr
  qx *= k; qy *= k
  const a = g.Z0 * g.R, b = qx * g.R, c = qx * (g.Z0 + g.R)
  const m = Math.hypot(a, b)
  if (Math.abs(c) >= m) return null
  const th = Math.asin(c / m) - Math.atan2(b, a)
  const sc = g.Z0 / (g.Z0 + g.R * (1 - Math.cos(th)))
  if (Math.abs(qy / sc) > g.hc / 2) return null
  const u = g.R * th + cam
  const s = ((u % L.len) + L.len) % L.len
  for (let i = 0; i < L.xs.length; i++) {
    if (s >= L.xs[i] && s < L.xs[i] + L.ws[i]) return { i, u0: u - (s - L.xs[i]) }
  }
  return null
}

/** Arc position (world u, relative to cam) → screen x offset from centre and scale (no barrel). */
export function project(g: StripGeo, du: number) {
  const th = Math.max(-1.55, Math.min(1.55, du / g.R))
  const den = g.Z0 + g.R * (1 - Math.cos(th))
  return { x: (g.Z0 * g.R * Math.sin(th)) / den, sc: g.Z0 / den }
}

export function createStrip(canvas: HTMLCanvasElement, cards: StripCard[], small: boolean, onChange: () => void) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' })
  if (!gl || gl.isContextLost()) return null
  let prog: ReturnType<typeof compile>
  try { prog = compile(gl) } catch { return null }
  const list = cards.slice(0, MAX_CARDS)

  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  // ── atlas: shelf-packed rows of fixed-height cells ──
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
  const AW = Math.min(maxTex, 4096)
  const CH = small ? 300 : 440 // cell height, texels (≈ centre card at dpr 1.5–2)
  const PAD = 4
  const cells: { x: number; y: number; w: number; h: number }[] = []
  let cx = 0, cy = 0
  for (const c of list) {
    const w = Math.min(AW - 2 * PAD, Math.round(CH * c.ratio))
    if (cx + w + PAD > AW) { cx = 0; cy += CH + PAD }
    cells.push({ x: cx, y: cy, w, h: CH })
    cx += w + PAD
  }
  const AH = Math.min(maxTex, cy + CH)
  const levels = Math.floor(Math.log2(Math.max(AW, AH))) + 1
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, AW, AH)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  // Half a texel inside each cell so mip levels don't bleed the neighbour in.
  const uvs = new Float32Array(MAX_CARDS * 4)
  cells.forEach((c, i) => {
    uvs.set([(c.x + 0.5) / AW, (c.y + 0.5) / AH, (c.w - 1) / AW, (c.h - 1) / AH], i * 4)
  })
  const ready = new Array(list.length).fill(0)

  // ── loader: ≤ 4 in flight, sub-uploads, throttled mipmaps (orb.ts pattern) ──
  const scratch = document.createElement('canvas')
  const sctx = scratch.getContext('2d')!
  let next = 0, inflight = 0, dead = false, mipDirty = false, lastMip = 0, done = 0
  const pump = () => {
    while (!dead && inflight < 4 && next < list.length) {
      const i = next++
      const cell = cells[i]
      inflight++
      const im = new Image()
      im.decoding = 'async'
      if (/^https?:/.test(list[i].src)) im.crossOrigin = 'anonymous'
      im.src = list[i].src
      im.decode().then(() => {
        if (dead) return
        scratch.width = cell.w; scratch.height = cell.h
        const [u0, v0, us, vs] = coverUv(im.naturalWidth, im.naturalHeight, cell.w, cell.h)
        sctx.drawImage(im, u0 * im.naturalWidth, v0 * im.naturalHeight, us * im.naturalWidth, vs * im.naturalHeight, 0, 0, cell.w, cell.h)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        try {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, cell.x, cell.y, gl.RGBA, gl.UNSIGNED_BYTE, scratch)
          ready[i] = 1
          mipDirty = true
        } catch { /* cross-origin image without CORS: the card stays a stage block */ }
        onChange()
      }, () => {}).finally(() => { inflight--; done++; pump() })
    }
  }
  pump()

  let W = 1, H = 1, dpr = 1
  const cardBuf = new Float32Array(MAX_CARDS * 4)
  return {
    resize(w: number, h: number, d: number) {
      W = w; H = h; dpr = d
      canvas.width = Math.max(1, Math.round(w * d)); canvas.height = Math.max(1, Math.round(h * d))
    },
    draw(g: StripGeo, L: ReturnType<typeof layoutStrip>, f: StripFrame) {
      const now = performance.now()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      if (mipDirty && (now - lastMip > 180 || done === list.length)) { gl.generateMipmap(gl.TEXTURE_2D); mipDirty = false; lastMip = now }
      for (let i = 0; i < list.length; i++) cardBuf.set([L.xs[i], L.ws[i], ready[i], 0], i * 4)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.useProgram(prog.p)
      gl.uniform1i(prog.u.tex, 0)
      gl.uniform2f(prog.u.res, canvas.width, canvas.height)
      gl.uniform1f(prog.u.dpr, dpr)
      gl.uniform2f(prog.u.c, W / 2, g.cy)
      gl.uniform4f(prog.u.geo, g.R, g.Z0, g.hc, g.lens)
      gl.uniform1f(prog.u.cam, f.cam)
      gl.uniform1f(prog.u.len, L.len)
      gl.uniform1i(prog.u.n, list.length)
      gl.uniform4fv(prog.u.card, cardBuf)
      gl.uniform4fv(prog.u.uv, uvs)
      gl.uniform1f(prog.u.atlasH, AH)
      gl.uniform1f(prog.u.split, f.split * dpr)
      gl.uniform3fv(prog.u.bg, f.bg)
      gl.uniform3fv(prog.u.stage, f.stage)
      gl.uniform1i(prog.u.hover, f.hover >= 0 ? f.hover : f.focus)
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      void H
    },
    pending: () => mipDirty || done < list.length,
    destroy() {
      dead = true
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(prog.p)
    },
  }
}

export type Strip = NonNullable<ReturnType<typeof createStrip>>
