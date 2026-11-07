// ─── Feed canvas: WebGL2 renderer ────────────────────────────────────────────
// One canvas, three tiny programs, no dependencies:
//   1. pieces: one unit quad per visible piece (drawArrays with per-piece
//      uniforms; ~10–40 draws a frame). The fragment shader cover-crops the
//      texture and, while the plane moves, splits R and B along the velocity
//      vector (offset in px, snapped to the device pixel grid) and adds a light
//      4×4 Bayer posterize: Fresno's dither language, only in motion. At rest
//      the offset is 0 and the image is sampled once per channel at the same uv
//      = clean. The quad grows by the split so the fringes spill past its edge.
//   2. grain: a full-screen pass of hashed noise over everything (background
//      and pieces), stepped at 12 fps; amount and blend per theme.
// Textures: 600px thumbnails (the full 900px file only for slots wider than
// 700 device px), loaded on demand, max 6 in flight, LRU-evicted past MAX_TEX.

const VS_PIECE = `#version 300 es
in vec2 aPos;
uniform vec2 uRes;     // canvas size, css px
uniform vec4 uRect;    // x, y, w, h (css px, already zoomed)
uniform vec2 uPad;     // quad grows by this (css px) on each side for the RGB fringes
out vec2 vLocal;       // 0..1 inside the piece, beyond in the pad
void main() {
  vec2 p = uRect.xy - uPad + aPos * (uRect.zw + 2.0 * uPad);
  vLocal = (p - uRect.xy) / uRect.zw;
  vec2 c = p / uRes * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`

const FS_PIECE = `#version 300 es
precision highp float;
in vec2 vLocal;
uniform sampler2D uTex;
uniform vec4 uCrop;    // uv offset (xy) + scale (zw): cover fit
uniform vec2 uSplit;   // RGB split, in piece-local units (fraction of w, h)
uniform float uDither; // 0..1, posterize amount
uniform float uLoaded; // 0..1 texture fade-in
uniform vec3 uBg;      // page background
uniform vec3 uFill;    // placeholder fill while loading
uniform float uAlpha;  // hidden while zoomed
out vec4 o;

float inside(vec2 p) {
  vec2 s = step(vec2(0.0), p) * step(p, vec2(1.0));
  return s.x * s.y;
}
vec3 tex(vec2 l) { return texture(uTex, uCrop.xy + clamp(l, 0.0, 1.0) * uCrop.zw).rgb; }
float bayer(vec2 f) {
  ivec2 p = ivec2(mod(f, 4.0));
  int i = p.x + p.y * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + 0.5) / 16.0;
}
void main() {
  // R image moves along the velocity, B against it (Figma 6867:1297: R −11,−4 / B +11,+4 at VEL ← 18 ↑ 8).
  vec2 lr = vLocal - uSplit, lg = vLocal, lb = vLocal + uSplit;
  vec3 cov = vec3(inside(lr), inside(lg), inside(lb));
  if (cov.r + cov.g + cov.b < 0.5) discard;
  vec3 img = vec3(tex(lr).r, tex(lg).g, tex(lb).b);
  if (uDither > 0.001) {
    float t = bayer(gl_FragCoord.xy / 2.0) - 0.5;
    vec3 q = floor(img * 5.0 + 0.5 + t) / 5.0;
    img = mix(img, q, uDither);
  }
  vec3 c = mix(uFill, img, uLoaded);
  c = mix(uBg, c, cov * uAlpha);
  o = vec4(c, 1.0);
}`

const VS_FULL = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0); }`

const FS_GRAIN = `#version 300 es
precision highp float;
uniform float uSeed;
uniform float uAmount;
uniform float uScale;    // device px per grain cell (hash fallback)
uniform sampler2D uNoise; // Diseño's 512 px gaussian B/W noise, alpha ≤ ~24 %
uniform float uHasNoise;
uniform float uTexel;     // device px per noise texel (tiled at 0.5 scale = 0.5 css px)
out vec4 o;
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  if (uHasNoise > 0.5) {
    // jump the tile to a new random offset every step (12 fps), like a film gate
    vec2 off = vec2(hash(vec2(uSeed, 1.7)), hash(vec2(3.1, uSeed)));
    vec4 n = texture(uNoise, gl_FragCoord.xy / (512.0 * uTexel) + off);
    o = vec4(n.rgb, n.a * uAmount);
    return;
  }
  vec2 cell = floor(gl_FragCoord.xy / uScale);
  float n = hash(cell + uSeed * 37.0) - 0.5;
  // symmetric grain: lighten or darken around the base colour
  o = vec4(vec3(step(0.0, n)), abs(n) * 0.5 * uAmount);
}`

type Tex = { tex: WebGLTexture; w: number; h: number; used: number; born: number }

export type DrawPiece = {
  key: string
  src: string
  iw: number
  ih: number
  x: number
  y: number
  w: number
  h: number
  alpha: number
}

export type Theme = { bg: [number, number, number]; fill: [number, number, number]; grain: number; light: boolean }

const MAX_TEX = 72
const MAX_INFLIGHT = 6

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader')
    gl.attachShader(p, s)
  }
  gl.bindAttribLocation(p, 0, 'aPos')
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link')
  const u: Record<string, WebGLUniformLocation | null> = {}
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i)!
    u[info.name] = gl.getUniformLocation(p, info.name)
  }
  return { p, u }
}

export function createRenderer(canvas: HTMLCanvasElement, onTexture: () => void) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' })
  if (!gl || gl.isContextLost()) return null
  let piece: ReturnType<typeof compile>, grain: ReturnType<typeof compile>
  try {
    piece = compile(gl, VS_PIECE, FS_PIECE)
    grain = compile(gl, VS_FULL, FS_GRAIN)
  } catch (e) {
    console.warn('[feed] WebGL shaders failed, falling back', e)
    return null
  }
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const blank = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, blank)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))

  // Grain texture (repeat; nearest, so every texel stays a crisp grain)
  let noise: WebGLTexture | null = null
  const nimg = new Image()
  nimg.src = '/feed/grain.webp'
  nimg.decode().then(() => {
    if (lost) return
    noise = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, noise)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nimg)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    onTexture()
  }, () => {})

  const cache = new Map<string, Tex>()
  const loading = new Set<string>()
  const queue: string[] = []
  let frame = 0
  let lost = false
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true })

  function upload(src: string, img: HTMLImageElement) {
    if (lost) return
    const tex = gl!.createTexture()!
    gl!.bindTexture(gl!.TEXTURE_2D, tex)
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false)
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, img)
    gl!.generateMipmap(gl!.TEXTURE_2D)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)
    cache.set(src, { tex, w: img.naturalWidth, h: img.naturalHeight, used: frame, born: performance.now() })
    evict()
  }
  function evict() {
    if (cache.size <= MAX_TEX) return
    const old = [...cache.entries()].filter(([, t]) => t.used < frame - 1).sort((a, b) => a[1].used - b[1].used)
    for (const [k, t] of old) {
      if (cache.size <= MAX_TEX) break
      gl!.deleteTexture(t.tex)
      cache.delete(k)
    }
  }
  function pump() {
    while (loading.size < MAX_INFLIGHT && queue.length) {
      const src = queue.shift()!
      if (cache.has(src) || loading.has(src)) continue
      loading.add(src)
      const img = new Image()
      img.decoding = 'async'
      img.src = src
      img.decode().then(() => { upload(src, img); onTexture() }, () => {}).finally(() => { loading.delete(src); pump() })
    }
  }
  function want(src: string) {
    if (cache.has(src) || loading.has(src) || queue.includes(src)) return
    queue.push(src)
  }

  function resize(w: number, h: number, dpr: number) {
    canvas.width = Math.max(1, Math.round(w * dpr))
    canvas.height = Math.max(1, Math.round(h * dpr))
  }

  // vel: smoothed plane velocity in css px per 16.7 ms; amount 0..1 (0 = reduced motion)
  function draw(list: DrawPiece[], W: number, H: number, dpr: number, vel: [number, number], fx: number, theme: Theme, seed: number) {
    if (lost) return
    frame++
    gl!.viewport(0, 0, canvas.width, canvas.height)
    gl!.clearColor(theme.bg[0], theme.bg[1], theme.bg[2], 1)
    gl!.clear(gl!.COLOR_BUFFER_BIT)
    gl!.disable(gl!.BLEND)

    // Split: px offset grows past a small dead zone, capped at 14 px, snapped
    // to whole device pixels (crisp fringes, no shimmer).
    const sp = Math.hypot(vel[0], vel[1])
    const mag = Math.min(18, Math.max(0, sp - 0.6) * 0.6) * fx
    const dir: [number, number] = sp > 0.001 ? [vel[0] / sp, vel[1] / sp] : [0, 0]
    const ox = Math.round(dir[0] * mag * dpr) / dpr, oy = Math.round(dir[1] * mag * dpr) / dpr
    const dither = Math.min(1, Math.max(0, (sp - 6) / 40)) * 0.55 * fx

    gl!.useProgram(piece.p)
    const u = piece.u
    gl!.uniform2f(u.uRes, W, H)
    gl!.uniform3fv(u.uBg, theme.bg)
    gl!.uniform3fv(u.uFill, theme.fill)
    gl!.uniform1f(u.uDither, dither)
    gl!.uniform2f(u.uPad, Math.abs(ox) + 1, Math.abs(oy) + 1)
    gl!.uniform1i(u.uTex, 0)
    gl!.activeTexture(gl!.TEXTURE0)
    const now = performance.now()
    for (const p of list) {
      const t = cache.get(p.src)
      if (t) t.used = frame
      else want(p.src)
      gl!.bindTexture(gl!.TEXTURE_2D, t ? t.tex : blank)
      const loaded = t ? Math.min(1, (now - t.born) / 280) : 0
      gl!.uniform1f(u.uLoaded, loaded)
      gl!.uniform1f(u.uAlpha, p.alpha)
      const ar = p.iw / p.ih, br = p.w / p.h
      if (ar > br) { const s = br / ar; gl!.uniform4f(u.uCrop, (1 - s) / 2, 0, s, 1) }
      else { const s = ar / br; gl!.uniform4f(u.uCrop, 0, (1 - s) / 2, 1, s) }
      gl!.uniform4f(u.uRect, p.x, p.y, p.w, p.h)
      gl!.uniform2f(u.uSplit, ox / p.w, oy / p.h)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
    }
    pump()

    if (theme.grain > 0) {
      gl!.enable(gl!.BLEND)
      gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA)
      gl!.useProgram(grain.p)
      gl!.uniform1f(grain.u.uSeed, seed)
      gl!.uniform1f(grain.u.uAmount, theme.grain)
      gl!.uniform1f(grain.u.uScale, Math.max(1, Math.round(dpr)))
      gl!.uniform1i(grain.u.uNoise, 0)
      gl!.bindTexture(gl!.TEXTURE_2D, noise ?? blank)
      gl!.uniform1f(grain.u.uHasNoise, noise ? 1 : 0)
      gl!.uniform1f(grain.u.uTexel, dpr * 0.5)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
    }
  }

  // Still fading in? (the loop keeps running until every visible texture is in)
  function fading() {
    const now = performance.now()
    for (const t of cache.values()) if (t.used === frame && now - t.born < 300) return true
    return false
  }

  function destroy() {
    for (const t of cache.values()) gl!.deleteTexture(t.tex)
    cache.clear()
    queue.length = 0
    // The <canvas> outlives a Canvas → Rejilla → Canvas switch and getContext()
    // hands back the same context, so free GL objects instead of losing it.
    gl!.deleteTexture(blank)
    if (noise) gl!.deleteTexture(noise)
    gl!.deleteBuffer(buf)
    gl!.deleteProgram(piece.p)
    gl!.deleteProgram(grain.p)
    lost = true
  }

  return { draw, resize, fading, destroy, stats: () => ({ textures: cache.size, loading: loading.size }) }
}

export type Renderer = NonNullable<ReturnType<typeof createRenderer>>
