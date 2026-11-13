// ─── About: the FRESNO© wordmark wrapped on a torus ("donut") ────────────────
// One WebGL2 canvas, no dependencies. The wordmark (fresnoPaths.ts) is drawn
// once into a 2D canvas and used as a repeating alpha texture on a torus: u
// runs around the ring, v around the tube. No lighting and no depth test: the
// ink is one flat colour and the tube is see-through, so the far side of the
// text shows through the gaps (as on a printed transparent ring).
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
  fov: 9,            // degrees; lower = flatter, more graphic (less difference between front and back)
}

const SEG_RING = 160
const SEG_TUBE = 56

const VS = `#version 300 es
in vec3 aPos;
in vec2 aUv;
uniform mat4 uMvp;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = uMvp * vec4(aPos, 1.0);
}`

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec3 uColor;
uniform vec2 uRep;
uniform vec2 uOff;
out vec4 o;
void main() {
  float a = texture(uTex, vUv * uRep + uOff).a;
  // Keep the letter edges crisp when the texture is magnified.
  float w = clamp(fwidth(a), 0.02, 0.5);
  a = smoothstep(0.5 - w, 0.5 + w, a);
  o = vec4(uColor * a, a);
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
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  for (let i = 0; i <= SEG_RING; i++) {
    const u = i / SEG_RING, th = u * Math.PI * 2
    for (let j = 0; j <= SEG_TUBE; j++) {
      const v = j / SEG_TUBE, ph = v * Math.PI * 2
      const d = R + r * Math.cos(ph)
      pos.push(d * Math.cos(th), r * Math.sin(ph), d * Math.sin(th))
      uv.push(u, v)
    }
  }
  const row = SEG_TUBE + 1
  for (let i = 0; i < SEG_RING; i++) for (let j = 0; j < SEG_TUBE; j++) {
    const a = i * row + j, b = a + row
    idx.push(a, b, a + 1, a + 1, b, b + 1)
  }
  return { pos: new Float32Array(pos), uv: new Float32Array(uv), idx: new Uint16Array(idx) }
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

// Returns the cleanup, or null when WebGL2 is not available (the caller then
// shows the flat SVG logo).
export function startLogoDonut(canvas: HTMLCanvasElement): (() => void) | null {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true })
  if (!gl) return null

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)

  const mesh = torus(DONUT.ratio)
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const attr = (name: string, data: Float32Array, n: number) => {
    const loc = gl.getAttribLocation(prog, name)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0)
  }
  attr('aPos', mesh.pos, 3)
  attr('aUv', mesh.uv, 2)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW)

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

  const uMvp = gl.getUniformLocation(prog, 'uMvp')
  const uColor = gl.getUniformLocation(prog, 'uColor')
  const uRep = gl.getUniformLocation(prog, 'uRep')
  const uOff = gl.getUniformLocation(prog, 'uOff')

  gl.disable(gl.DEPTH_TEST)
  gl.disable(gl.CULL_FACE)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let color = parseColor(getComputedStyle(canvas).color)
  let cssW = 1, cssH = 1
  let px = 0, py = 0, tx = 0, ty = 0 // pointer tilt: current, target (−1..1)
  let t = 0, last = 0, raf = 0, onScreen = true

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
    const mvp = mul(perspective(fov, aspect, 0.1, 200), mul(translate(0, 0, -dist), model))
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniformMatrix4fv(uMvp, false, mvp)
    gl.uniform3f(uColor, color[0], color[1], color[2])
    gl.uniform2f(uRep, -DONUT.repeat, -DONUT.rows)
    const sway = reduced.matches ? 0 : Math.sin(t * DONUT.rollSpeed) * DONUT.roll
    gl.uniform2f(uOff, 0, 0.5 + (DONUT.face + sway) * DONUT.rows)
    gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0)
  }

  const frame = (now: number) => {
    raf = 0
    const dt = Math.min(0.05, (now - (last || now)) / 1000)
    last = now
    t += dt
    px += (tx - px) * Math.min(1, dt * 4)
    py += (ty - py) * Math.min(1, dt * 4)
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
  const onTheme = new MutationObserver(() => { color = parseColor(getComputedStyle(canvas).color); if (!raf) draw() })
  onTheme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('visibilitychange', wake)
  reduced.addEventListener('change', wake)

  resize()
  schedule()

  return () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    io.disconnect()
    onTheme.disconnect()
    window.removeEventListener('pointermove', onMove)
    document.removeEventListener('visibilitychange', wake)
    reduced.removeEventListener('change', wake)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
