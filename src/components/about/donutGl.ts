// ─── About: the FRESNO© wordmark wrapped on a torus ("donut") ────────────────
// One WebGL2 canvas, no dependencies. The wordmark (fresnoPaths.ts) is drawn
// once into a 2D canvas and used as a repeating alpha texture on a torus: u
// runs around the ring, v around the tube. No lighting and no depth test: the
// ink is one flat colour and the tube is see-through, so the far side of the
// text shows through the gaps (as on a printed transparent ring).
//
// Extras: the ink carries its own film grain (stepped at 12 fps, like the page
// grain); a click sends a liquid ripple through the surface (vertices move
// along their normals); `setGlass(true)` turns the ring into a solid glass tube
// that refracts the flat wordmark laid behind it, with chromatic dispersion.
//
// Everything worth tuning is in DONUT below.

import { FRESNO_H, FRESNO_PATHS, FRESNO_W } from './fresnoPaths'

export const DONUT = {
  // Shape
  ratio: 6,          // ring radius / tube radius: lower = fatter donut
  size: 0.8,         // outer diameter as a fraction of the canvas width
  // Text
  repeat: 2,         // wordmarks around the ring (2 = one whole FRESNO© on the front half)
  rows: 1,           // lines of text around the tube
  fill: 0.4,         // letter height as a fraction of its row
  gap: 0.07,         // space between © and the next F, as a fraction of its lap
  face: 0.03,        // where the line sits around the tube (0 = outer edge, 0.25 = top, 0.5 = in the hole)
  // Motion (radians per second)
  spin: 0.22,        // the ring turns on its own axis: text travels around
  roll: 0.03,        // how far the text sways around the tube (fraction of a turn)
  rollSpeed: 0.6,
  tilt: 0.3,         // resting tilt towards the viewer (0 = edge-on, π/2 = flat)
  lean: -0.3,        // the whole ring leans on screen (negative = left side up, right side down)
  wobble: 0.05,      // how far it rocks around the resting tilt
  wobbleSpeed: 0.45,
  float: 0.012,      // vertical bob, fraction of the donut
  floatSpeed: 0.8,
  pointer: 0.06,     // extra tilt following the cursor
  // Grain inside the ink (0 = none)
  grain: 0.24,
  grainSize: 1.5,    // css px per grain
  // Click = liquid
  liquid: 0.05,      // how far the whole surface sloshes after a click (radius units)
  ripple: 0.07,      // height of the ring wave that leaves the click point
  rippleSpeed: 1.5,  // how fast that wave travels (canvas heights per second)
  calm: 1.3,         // how fast it settles (higher = sooner)
  // Glass mode
  refract: 0.15,     // how far the glass bends what is behind it
  dispersion: 0.04,  // colour split at the edges (0 = none)
  shine: 1.5,        // strength of the reflections
  flatLogo: 0.952,   // width of the flat wordmark behind the glass (fraction of the canvas)
  fov: 9,            // degrees; lower = flatter, more graphic (less difference between front and back)
}

const SEG_RING = 160
const SEG_TUBE = 56

const RIPPLES = 4

const VS = `#version 300 es
in vec3 aPos;
in vec3 aNor;
in vec2 aUv;
uniform highp int uMode;       // 0 ink, 1 glass, 2 flat wordmark (full-screen triangle)
uniform mat4 uModel;
uniform mat4 uVp;
uniform float uTime;
uniform float uAspect;
uniform float uEnergy;   // 1 right after a click, decays to 0
uniform vec3 uLiquid;    // slosh, ripple height, ripple speed
uniform vec3 uRip[${RIPPLES}]; // click point (ndc xy) + age in seconds (< 0 = off)
out vec2 vUv;
out vec3 vNor;
out vec3 vPos;
void main() {
  vUv = aUv;
  if (uMode == 2) { vNor = vec3(0.0); vPos = vec3(0.0); gl_Position = vec4(aPos.xy, 0.0, 1.0); return; }
  vec3 n = mat3(uModel) * aNor;
  vec4 w = uModel * vec4(aPos, 1.0);
  vec4 c = uVp * w;
  vec2 s = c.xy / c.w;
  float d = uEnergy * uLiquid.x * (
    sin(aPos.x * 7.0 + uTime * 6.0) * sin(aPos.z * 6.0 - uTime * 5.0)
    + 0.6 * sin(aUv.y * 12.566 + aUv.x * 31.416 + uTime * 8.0));
  for (int i = 0; i < ${RIPPLES}; i++) {
    float age = uRip[i].z;
    if (age < 0.0) continue;
    float dist = length((s - uRip[i].xy) * vec2(uAspect, 1.0));
    float front = age * uLiquid.z * 2.0;
    float wave = sin((dist - front) * 13.0) * smoothstep(front + 0.05, front - 0.25, dist);
    d += uLiquid.y * wave * exp(-age * 1.5) / (1.0 + dist * 1.5);
  }
  w.xyz += n * d;
  vNor = n;
  vPos = w.xyz;
  gl_Position = uVp * w;
}`

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vNor;
in vec3 vPos;
uniform highp int uMode;
uniform sampler2D uTex;
uniform vec3 uColor;
uniform vec3 uBg;
uniform vec2 uRep;
uniform vec2 uOff;
uniform float uAlpha;
uniform vec3 uGrain;     // amount, device px per grain, seed
uniform vec2 uRes;       // canvas size, device px
uniform vec3 uCam;
uniform vec4 uLogo;      // flat wordmark rect in screen uv: x, y, w, h
uniform vec2 uCell;      // texture cell: gap, fill
uniform vec3 uGlass;     // refract, dispersion, shine
out vec4 o;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float crisp(float a) {
  float w = clamp(fwidth(a), 0.02, 0.5);
  return smoothstep(0.5 - w, 0.5 + w, a);
}
// Coverage of the flat wordmark at a screen position (0..1, y up).
float logoAt(vec2 uv) {
  vec2 l = (uv - uLogo.xy) / uLogo.zw;
  vec2 t = vec2(uCell.x * 0.5 + l.x * (1.0 - uCell.x), (1.0 - uCell.y) * 0.5 + (1.0 - l.y) * uCell.y);
  float a = texture(uTex, t).a;
  vec2 m = step(vec2(0.0), l) * step(l, vec2(1.0));
  return smoothstep(0.35, 0.65, a) * m.x * m.y;
}
void main() {
  float g = 1.0 - uGrain.x * hash(floor(gl_FragCoord.xy / uGrain.y) + uGrain.z);
  vec2 suv = gl_FragCoord.xy / uRes;
  if (uMode == 0) {
    float a = crisp(texture(uTex, vUv * uRep + uOff).a) * uAlpha;
    o = vec4(uColor * g * a, a);
    return;
  }
  if (uMode == 2) {
    float a = logoAt(suv) * uAlpha;
    o = vec4(uColor * g * a, a);
    return;
  }
  // Glass: what is behind, bent through the tube (one sample per channel),
  // plus a striped studio reflection that grows towards the rim.
  vec3 N = normalize(vNor);
  vec3 V = normalize(uCam - vPos);
  if (dot(N, V) < 0.0) N = -N;
  float F = pow(1.0 - dot(N, V), 3.0);
  vec2 k = vec2(uRes.y / uRes.x, 1.0) * uGlass.x;
  vec3 a = vec3(
    logoAt(suv + refract(-V, N, 1.0 / (1.18 - uGlass.y)).xy * k),
    logoAt(suv + refract(-V, N, 1.0 / 1.18).xy * k),
    logoAt(suv + refract(-V, N, 1.0 / (1.18 + uGlass.y)).xy * k));
  vec3 col = mix(uBg, uColor, a);
  vec3 R = reflect(-V, N);
  float env = smoothstep(0.5, 0.85, R.y) + 0.7 * smoothstep(0.8, 0.97, abs(R.x)) + 0.4 * smoothstep(-0.7, -0.95, R.y);
  vec3 irid = 0.5 + 0.5 * cos(6.2832 * (F * 1.4 + R.x * 0.6 + vec3(0.0, 0.33, 0.67)));
  col += uGlass.z * (env * mix(vec3(1.0), irid, 0.3) * (0.22 + F * 0.9) + F * irid * 0.25 + pow(1.0 - dot(N, V), 6.0) * 0.8);
  o = vec4(col * g * uAlpha, uAlpha);
}`

type M4 = Float32Array

function mul(a: M4, b: M4): M4 {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
  }
  return o
}
const ident = (): M4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
function rotX(t: number): M4 { const m = ident(), c = Math.cos(t), s = Math.sin(t); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m }
function rotY(t: number): M4 { const m = ident(), c = Math.cos(t), s = Math.sin(t); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m }
function rotZ(t: number): M4 { const m = ident(), c = Math.cos(t), s = Math.sin(t); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m }
function translate(x: number, y: number, z: number): M4 { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m }
function perspective(fovY: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan(fovY / 2), m = new Float32Array(16)
  m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = (2 * far * near) / (near - far)
  return m
}

// Torus with outer radius 1: ring in the XZ plane, axis = Y.
function torus(ratio: number) {
  const r = 1 / (ratio + 1), R = ratio * r
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = []
  for (let i = 0; i <= SEG_RING; i++) {
    const u = i / SEG_RING, th = u * Math.PI * 2
    for (let j = 0; j <= SEG_TUBE; j++) {
      const v = j / SEG_TUBE, ph = v * Math.PI * 2
      const d = R + r * Math.cos(ph)
      pos.push(d * Math.cos(th), r * Math.sin(ph), d * Math.sin(th))
      nor.push(Math.cos(ph) * Math.cos(th), Math.sin(ph), Math.cos(ph) * Math.sin(th))
      uv.push(u, v)
    }
  }
  const row = SEG_TUBE + 1
  for (let i = 0; i < SEG_RING; i++) for (let j = 0; j < SEG_TUBE; j++) {
    const a = i * row + j, b = a + row
    idx.push(a, b, a + 1, a + 1, b, b + 1)
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv), idx: new Uint16Array(idx) }
}

// One texture cell = one wordmark + its gap (x), one row of text (y).
function wordmarkTexture(maxSize: number) {
  const w = Math.min(4096, maxSize), h = 512
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const lw = w * (1 - DONUT.gap), lh = h * DONUT.fill
  ctx.setTransform(lw / FRESNO_W, 0, 0, lh / FRESNO_H, (w - lw) / 2, (h - lh) / 2)
  ctx.fillStyle = '#fff'
  for (const d of FRESNO_PATHS) ctx.fill(new Path2D(d))
  return c
}


function parseColor(css: string): [number, number, number] {
  const m = css.match(/[\d.]+/g)
  if (!m || m.length < 3) return [0, 0, 0]
  return [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255]
}

export type LogoDonutHandle = { stop: () => void; setGlass: (on: boolean) => void }

// Returns the handle, or null when WebGL2 is not available (the caller then
// shows the flat SVG logo).
export function startLogoDonut(canvas: HTMLCanvasElement): LogoDonutHandle | null {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, depth: true })
  if (!gl) return null

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('[donut]', gl.getShaderInfoLog(s))
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[donut]', gl.getProgramInfoLog(prog))
    return null
  }
  gl.useProgram(prog)

  const attr = (name: string, data: Float32Array, n: number) => {
    const loc = gl.getAttribLocation(prog, name)
    if (loc < 0) return
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0)
  }
  const mesh = torus(DONUT.ratio)
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  attr('aPos', mesh.pos, 3)
  attr('aNor', mesh.nor, 3)
  attr('aUv', mesh.uv, 2)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW)
  // Full-screen triangle for the flat wordmark behind the glass.
  const flat = gl.createVertexArray()
  gl.bindVertexArray(flat)
  attr('aPos', new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wordmarkTexture(gl.getParameter(gl.MAX_TEXTURE_SIZE)))
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic')
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))

  const U = (name: string) => gl.getUniformLocation(prog, name)
  const u = {
    mode: U('uMode'), model: U('uModel'), vp: U('uVp'), time: U('uTime'), aspect: U('uAspect'),
    energy: U('uEnergy'), liquid: U('uLiquid'), rip: U('uRip'), color: U('uColor'), bg: U('uBg'),
    rep: U('uRep'), off: U('uOff'), alpha: U('uAlpha'), grain: U('uGrain'), res: U('uRes'),
    cam: U('uCam'), logo: U('uLogo'), cell: U('uCell'), glass: U('uGlass'),
  }

  gl.disable(gl.CULL_FACE)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const readColors = () => {
    color = parseColor(getComputedStyle(canvas).color)
    bg = parseColor(getComputedStyle(document.body).backgroundColor)
  }
  let color: [number, number, number] = [0, 0, 0], bg: [number, number, number] = [0, 0, 0]
  readColors()
  let cssW = 1, cssH = 1
  let px = 0, py = 0, tx = 0, ty = 0 // pointer tilt: current, target (−1..1)
  let t = 0, last = 0, raf = 0, onScreen = true
  let glass = 0, glassTo = 0         // 0 ink → 1 glass
  let energy = 0
  const rip = new Float32Array(RIPPLES * 3).fill(-1)
  let ripNext = 0

  const draw = () => {
    const fov = (DONUT.fov * Math.PI) / 180
    const aspect = cssW / cssH
    // Distance at which a radius-1 donut spans `size` of the canvas width.
    const dist = 1 / (DONUT.size * Math.tan(fov / 2) * aspect)
    const wob = reduced.matches ? 0 : DONUT.wobble
    const model = mul(rotZ(DONUT.lean), mul(
      translate(0, Math.sin(t * DONUT.floatSpeed) * DONUT.float, 0),
      mul(
        rotX(DONUT.tilt + Math.sin(t * DONUT.wobbleSpeed) * wob + py * DONUT.pointer),
        mul(rotZ(Math.cos(t * DONUT.wobbleSpeed * 0.7) * wob + px * DONUT.pointer), rotY(t * DONUT.spin)),
      ),
    ))
    const vp = mul(perspective(fov, aspect, 0.1, 200), translate(0, 0, -dist))
    const dpr = canvas.width / cssW
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.uniformMatrix4fv(u.model, false, model)
    gl.uniformMatrix4fv(u.vp, false, vp)
    gl.uniform1f(u.time, t)
    gl.uniform1f(u.aspect, aspect)
    gl.uniform1f(u.energy, energy)
    gl.uniform3f(u.liquid, DONUT.liquid, DONUT.ripple, DONUT.rippleSpeed)
    gl.uniform3fv(u.rip, rip)
    gl.uniform3f(u.color, color[0], color[1], color[2])
    gl.uniform3f(u.bg, bg[0], bg[1], bg[2])
    gl.uniform2f(u.rep, -DONUT.repeat, -DONUT.rows)
    const sway = reduced.matches ? 0 : Math.sin(t * DONUT.rollSpeed) * DONUT.roll
    gl.uniform2f(u.off, 0, 0.5 + (DONUT.face + sway) * DONUT.rows)
    gl.uniform3f(u.grain, DONUT.grain, DONUT.grainSize * dpr, Math.floor(t * 12) * 7.13)
    gl.uniform2f(u.res, canvas.width, canvas.height)
    gl.uniform3f(u.cam, 0, 0, dist)
    const lw = DONUT.flatLogo, lh = (lw * aspect * FRESNO_H) / FRESNO_W
    gl.uniform4f(u.logo, (1 - lw) / 2, (1 - lh) / 2, lw, lh)
    gl.uniform2f(u.cell, DONUT.gap, DONUT.fill)
    gl.uniform3f(u.glass, DONUT.refract, DONUT.dispersion, DONUT.shine)

    const k = glass * glass * (3 - 2 * glass)
    gl.disable(gl.DEPTH_TEST)
    if (k > 0.001) { // the flat wordmark the glass bends
      gl.bindVertexArray(flat)
      gl.uniform1i(u.mode, 2)
      gl.uniform1f(u.alpha, k)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    gl.bindVertexArray(vao)
    if (k < 0.999) { // ink ring
      gl.uniform1i(u.mode, 0)
      gl.uniform1f(u.alpha, 1 - k)
      gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0)
    }
    if (k > 0.001) { // glass tube: solid, nearest surface wins
      gl.enable(gl.DEPTH_TEST)
      gl.uniform1i(u.mode, 1)
      gl.uniform1f(u.alpha, k)
      gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0)
    }
  }

  const frame = (now: number) => {
    raf = 0
    const dt = Math.min(0.05, (now - (last || now)) / 1000)
    last = now
    t += dt
    px += (tx - px) * Math.min(1, dt * 4)
    py += (ty - py) * Math.min(1, dt * 4)
    glass += (glassTo - glass) * Math.min(1, dt * 4.5)
    if (Math.abs(glassTo - glass) < 0.002) glass = glassTo
    energy *= Math.exp(-dt * DONUT.calm)
    for (let i = 0; i < RIPPLES; i++) if (rip[i * 3 + 2] >= 0) {
      rip[i * 3 + 2] += dt
      if (rip[i * 3 + 2] > 5) rip[i * 3 + 2] = -1
    }
    draw()
    schedule()
  }
  const schedule = () => {
    if (!raf && onScreen && !document.hidden && !reduced.matches) raf = requestAnimationFrame(frame)
  }
  const wake = () => { last = 0; if (reduced.matches) draw(); else schedule() }

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    cssW = Math.max(1, r.width)
    cssH = Math.max(1, r.height)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    draw()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; wake() })
  io.observe(canvas)

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    tx = (e.clientX / window.innerWidth) * 2 - 1
    ty = (e.clientY / window.innerHeight) * 2 - 1
  }
  // Click / tap: a ripple leaves that point and the whole surface sloshes.
  const onDown = (e: PointerEvent) => {
    if (reduced.matches) return
    const r = canvas.getBoundingClientRect()
    rip[ripNext * 3] = ((e.clientX - r.left) / r.width) * 2 - 1
    rip[ripNext * 3 + 1] = 1 - ((e.clientY - r.top) / r.height) * 2
    rip[ripNext * 3 + 2] = 0
    ripNext = (ripNext + 1) % RIPPLES
    energy = 1
  }
  canvas.addEventListener('pointerdown', onDown)
  const onTheme = new MutationObserver(() => { readColors(); if (!raf) draw() })
  onTheme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('visibilitychange', wake)
  reduced.addEventListener('change', wake)

  resize()
  schedule()

  const stop = () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    io.disconnect()
    onTheme.disconnect()
    canvas.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointermove', onMove)
    document.removeEventListener('visibilitychange', wake)
    reduced.removeEventListener('change', wake)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
  const setGlass = (on: boolean) => {
    glassTo = on ? 1 : 0
    if (reduced.matches) { glass = glassTo; draw() } else schedule()
  }
  return { stop, setGlass }
}
