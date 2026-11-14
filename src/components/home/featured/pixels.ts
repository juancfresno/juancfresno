// Pixel meshes for the featured pieces: a held card breaks into a mesh of
// bitmap cells (~7 px) and every cell reacts to the finger as a small
// physical piece on springs. One engine, three behaviours:
//  · grid     — square cells pushed away from the finger like a magnet; gaps
//               open and the colours drop to a short dithered palette.
//  · halftone — the whole card turns into halftone dots (size from the
//               light); under the finger a lens closes the dots back into
//               the image.
//  · net      — the cells are knots of an elastic net joined by thin threads:
//               pull it and it stretches, gaps widen where you pull, it
//               bounces back when let go.
// Drawing: one instanced WebGL2 draw (a quad per cell, its shape from a
// distance function in the fragment shader). Each cell carries its own piece
// of the image, so at rest (activation 0, overlapping a hair) the mesh is
// exactly the image and the swap from the <img> has no seam. Springs run on
// the CPU. Same interface as the other materials.

import type { Cloth } from './cloth'

export type PixelKind = 'grid' | 'halftone' | 'net'

const CELL = 7 // css px

const VS = `#version 300 es
layout(location=0) in vec2 a_q; // unit quad corner, -0.5..0.5
layout(location=1) in vec4 a_st; // per cell: offset x, y, scale, activation
uniform vec2 u_cell; uniform int u_cols; uniform vec2 u_canvas; uniform float u_pad; uniform float u_quad;
out vec2 v_q; out vec2 v_c; out float v_s; out float v_a; flat out int v_id;
void main(){
  int id = gl_InstanceID;
  vec2 c = (vec2(float(id % u_cols), float(id / u_cols)) + 0.5) * u_cell; // rest centre
  v_q = a_q * u_quad; v_c = c; v_s = a_st.z; v_a = a_st.w; v_id = id;
  vec2 p = c + a_st.xy + v_q * u_cell;
  vec2 ndc = (p + u_pad) / u_canvas * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}`

const FS = `#version 300 es
precision highp float;
precision highp int; // u_cols is shared with the vertex shader (highp there)
in vec2 v_q; in vec2 v_c; in float v_s; in float v_a; flat in int v_id;
uniform sampler2D u_tex; uniform vec2 u_size; uniform vec2 u_cell; uniform int u_cols;
uniform int u_mode; uniform float u_lod; uniform float u_px; // one cell in device px
out vec4 o;
const float B4[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
void main(){
  vec2 uvT = (v_c + v_q * u_cell) / u_size;
  if (uvT.x < 0.0 || uvT.y < 0.0 || uvT.x > 1.0 || uvT.y > 1.0) discard;
  vec3 tile = texture(u_tex, uvT).rgb;
  vec3 fl = textureLod(u_tex, clamp(v_c / u_size, 0.0, 1.0), u_lod).rgb;
  int cx = v_id % u_cols, cy = v_id / u_cols;
  float b = (B4[(cy & 3) * 4 + (cx & 3)] + 0.5) / 16.0;
  vec3 pal = floor(fl * 4.0 + b) / 4.0; // short dithered palette
  float a = v_a;
  float hs, cr;
  if (u_mode == 1) {
    float lum = dot(fl, vec3(0.3, 0.59, 0.11));
    float rl = 0.1 + 0.5 * sqrt(lum);
    hs = mix(0.5, rl, a); cr = mix(0.0, rl, a);
  } else { hs = 0.5 * v_s; cr = 0.0; }
  hs += (1.0 - a) * 0.7 / u_px; // overlap at rest: no seams
  vec2 d = abs(v_q) - vec2(hs - cr);
  float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - cr;
  float al = clamp(0.5 - sd * u_px, 0.0, 1.0);
  if (al <= 0.0) discard;
  vec3 col = mix(tile, u_mode == 1 ? fl : pal, a);
  o = vec4(col, al);
}`

const TVS = `#version 300 es
layout(location=0) in vec2 a_c; // x = along (0..1), y = side (-1..1)
layout(location=1) in vec4 a_l; // x0 y0 x1 y1 (card px)
layout(location=2) in vec2 a_uv;
uniform vec2 u_canvas; uniform float u_pad; uniform float u_th;
out vec2 v_uv;
void main(){
  vec2 dir = a_l.zw - a_l.xy;
  vec2 n = normalize(vec2(-dir.y, dir.x) + 1e-5);
  vec2 p = mix(a_l.xy, a_l.zw, a_c.x) + n * a_c.y * u_th * 0.5;
  v_uv = a_uv;
  vec2 ndc = (p + u_pad) / u_canvas * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}`

const TFS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex; uniform float u_lod; uniform float u_alpha;
out vec4 o;
void main(){ o = vec4(textureLod(u_tex, v_uv, u_lod).rgb * 0.85, u_alpha); }`

type Opts = {
  canvas: HTMLCanvasElement
  img: HTMLImageElement
  w: number
  h: number
  pad: number
  onSleep: () => void
  kind: PixelKind
}

export function createPixels({ canvas, img, w, h, pad, onSleep, kind }: Opts): Cloth | null {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, alpha: true })
  if (!gl) return null
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const CW = w + pad * 2, CH = h + pad * 2
  canvas.width = Math.round(CW * dpr)
  canvas.height = Math.round(CH * dpr)
  const m = Math.min(w, h)

  // ── Mesh ─────────────────────────────────────────────────────────────────
  const cols = Math.max(8, Math.round(w / CELL))
  const rows = Math.max(8, Math.round(h / CELL))
  const cx = w / cols, cy = h / rows
  const n = cols * rows
  const RX = new Float32Array(n), RY = new Float32Array(n)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    RX[r * cols + c] = (c + 0.5) * cx
    RY[r * cols + c] = (r + 0.5) * cy
  }
  const ox = new Float32Array(n), oy = new Float32Array(n), vx = new Float32Array(n), vy = new Float32Array(n)
  const sc = new Float32Array(n).fill(1), vs = new Float32Array(n)
  const ac = new Float32Array(n), va = new Float32Array(n)
  const st = new Float32Array(n * 4)

  // Net links (structural), their thread geometry and colour lookup.
  const links: number[] = []
  if (kind === 'net') {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      if (c < cols - 1) links.push(i, i + 1)
      if (r < rows - 1) links.push(i, i + cols)
    }
  }
  const LK = new Int32Array(links)
  const nl = LK.length / 2
  const LR = new Float32Array(nl)
  const lineD = new Float32Array(nl * 4)
  const lineUV = new Float32Array(nl * 2)
  for (let k = 0; k < nl; k++) {
    const a = LK[k * 2], b = LK[k * 2 + 1]
    LR[k] = Math.hypot(RX[b] - RX[a], RY[b] - RY[a])
    lineUV[k * 2] = (RX[a] + RX[b]) / 2 / w
    lineUV[k * 2 + 1] = (RY[a] + RY[b]) / 2 / h
  }

  // ── GL ───────────────────────────────────────────────────────────────────
  const program = (vs: string, fs: string) => {
    const p = gl.createProgram()!
    for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
      const sh = gl.createShader(t)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      gl.attachShader(p, sh)
    }
    gl.linkProgram(p)
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null
  }
  const prog = program(VS, FS)
  const tprog = kind === 'net' ? program(TVS, TFS) : null
  if (!prog || (kind === 'net' && !tprog)) return null

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const lod = Math.max(0, Math.log2(((img.naturalWidth || w) / w) * cx))

  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const qb = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, qb)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const sb = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, sb)
  gl.bufferData(gl.ARRAY_BUFFER, st, gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(1)
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(1, 1)

  gl.useProgram(prog)
  const U = (p: WebGLProgram, k: string) => gl.getUniformLocation(p, k)
  gl.uniform2f(U(prog, 'u_cell'), cx, cy)
  gl.uniform1i(U(prog, 'u_cols'), cols)
  gl.uniform2f(U(prog, 'u_canvas'), CW, CH)
  gl.uniform1f(U(prog, 'u_pad'), pad)
  gl.uniform1f(U(prog, 'u_quad'), kind === 'halftone' ? 1.3 : 1.2)
  gl.uniform2f(U(prog, 'u_size'), w, h)
  gl.uniform1i(U(prog, 'u_mode'), kind === 'halftone' ? 1 : 0)
  gl.uniform1f(U(prog, 'u_lod'), lod)
  gl.uniform1f(U(prog, 'u_px'), cx * dpr)
  gl.uniform1i(U(prog, 'u_tex'), 0)

  let tvao: WebGLVertexArrayObject | null = null, lb: WebGLBuffer | null = null, uAlpha: WebGLUniformLocation | null = null
  if (tprog) {
    tvao = gl.createVertexArray()
    gl.bindVertexArray(tvao)
    const cb = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, cb)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    lb = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, lb)
    gl.bufferData(gl.ARRAY_BUFFER, lineD, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(1, 1)
    const ub = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, ub)
    gl.bufferData(gl.ARRAY_BUFFER, lineUV, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(2, 1)
    gl.useProgram(tprog)
    gl.uniform2f(U(tprog, 'u_canvas'), CW, CH)
    gl.uniform1f(U(tprog, 'u_pad'), pad)
    gl.uniform1f(U(tprog, 'u_th'), 1.1)
    gl.uniform1f(U(tprog, 'u_lod'), lod)
    gl.uniform1i(U(tprog, 'u_tex'), 0)
    uAlpha = U(tprog, 'u_alpha')
  }
  gl.bindVertexArray(null)
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 0)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  // ── State ────────────────────────────────────────────────────────────────
  let held = false
  let gx = 0, gy = 0, mx = 0, my = 0, sx = 0, sy = 0 // press, pointer, smoothed pointer
  let g = 0 // hold ramp
  let raf = 0, last = 0, quiet = 0
  const grab = new Float32Array(kind === 'net' ? n : 0)
  const R = m * 0.36 // grid: magnet radius
  const LENS = m * 0.26 // halftone: lens radius

  const spring = (x: Float32Array, v: Float32Array, i: number, t: number, k: number, d: number) => {
    v[i] = (v[i] + (t - x[i]) * k) * d
    x[i] += v[i]
  }

  const step = () => {
    g += ((held ? 1 : 0) - g) * (held ? 0.14 : 0.1)
    sx += (mx - sx) * 0.3
    sy += (my - sy) * 0.3
    if (kind === 'grid') {
      for (let i = 0; i < n; i++) {
        const dx = RX[i] - sx, dy = RY[i] - sy, d = Math.hypot(dx, dy) || 1
        const f = Math.exp(-((d / R) ** 2)) * g
        const push = f * m * 0.08
        spring(ox, vx, i, (dx / d) * push, 0.16, 0.74)
        spring(oy, vy, i, (dy / d) * push, 0.16, 0.74)
        spring(sc, vs, i, 1 - g * 0.16 - f * 0.42, 0.16, 0.72)
        spring(ac, va, i, g * (0.6 + 0.4 * f / Math.max(g, 1e-3)), 0.2, 0.7)
      }
    } else if (kind === 'halftone') {
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(RX[i] - sx, RY[i] - sy)
        const f = Math.exp(-((d / LENS) ** 2))
        spring(ac, va, i, g * (1 - f), 0.18, 0.7)
      }
    } else {
      // Elastic net: links pull knots together, a weak anchor holds the
      // shape, the grabbed knots follow the drag.
      let ddx = mx - gx, ddy = my - gy
      const dl = Math.hypot(ddx, ddy), cap = m * 0.42
      if (dl > cap) { ddx *= cap / dl; ddy *= cap / dl }
      const kA = held ? 0.004 : 0.03 + 0.05 * (1 - g)
      for (let sub = 0; sub < 2; sub++) {
        for (let k = 0; k < nl; k++) {
          const a = LK[k * 2], b = LK[k * 2 + 1]
          const ex = RX[b] + ox[b] - RX[a] - ox[a], ey = RY[b] + oy[b] - RY[a] - oy[a]
          const len = Math.hypot(ex, ey) || 1e-6
          const f = ((len - LR[k]) / len) * 0.2
          vx[a] += ex * f; vy[a] += ey * f
          vx[b] -= ex * f; vy[b] -= ey * f
        }
        for (let i = 0; i < n; i++) {
          vx[i] -= ox[i] * kA; vy[i] -= oy[i] * kA
          if (held && grab[i] > 0) {
            vx[i] += (ddx * grab[i] - ox[i]) * 0.3 * grab[i]
            vy[i] += (ddy * grab[i] - oy[i]) * 0.3 * grab[i]
          }
          vx[i] *= 0.86; vy[i] *= 0.86
          ox[i] += vx[i]; oy[i] += vy[i]
        }
      }
      for (let i = 0; i < n; i++) {
        spring(sc, vs, i, 1 - g * 0.36, 0.18, 0.72)
        spring(ac, va, i, g, 0.2, 0.7)
      }
    }
  }

  const draw = () => {
    for (let i = 0; i < n; i++) {
      const j = i * 4
      st[j] = ox[i]; st[j + 1] = oy[i]; st[j + 2] = sc[i]; st[j + 3] = Math.max(0, Math.min(1, ac[i]))
    }
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (tprog && lb && g > 0.01) {
      for (let k = 0; k < nl; k++) {
        const a = LK[k * 2], b = LK[k * 2 + 1], j = k * 4
        lineD[j] = RX[a] + ox[a]; lineD[j + 1] = RY[a] + oy[a]
        lineD[j + 2] = RX[b] + ox[b]; lineD[j + 3] = RY[b] + oy[b]
      }
      gl.useProgram(tprog)
      gl.uniform1f(uAlpha, Math.min(1, g) * 0.8)
      gl.bindVertexArray(tvao)
      gl.bindBuffer(gl.ARRAY_BUFFER, lb)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, lineD)
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nl)
    }
    gl.useProgram(prog)
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, sb)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, st)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n)
  }

  const settled = () => {
    if (g > 0.01) return false
    for (let i = 0; i < n; i++) {
      if (Math.abs(ox[i]) > 0.2 || Math.abs(oy[i]) > 0.2 || Math.abs(sc[i] - 1) > 0.01 || ac[i] > 0.01) return false
    }
    return true
  }

  const frame = (t: number) => {
    raf = 0
    const dt = last ? Math.min(50, t - last) : 16.7
    last = t
    const steps = Math.max(1, Math.min(3, Math.round(dt / 16.7)))
    for (let s = 0; s < steps; s++) step()
    draw()
    if (!held && settled()) {
      if (++quiet > 4) {
        ox.fill(0); oy.fill(0); vx.fill(0); vy.fill(0); sc.fill(1); vs.fill(0); ac.fill(0); va.fill(0); g = 0
        last = 0
        onSleep()
        return
      }
    } else quiet = 0
    raf = requestAnimationFrame(frame)
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame) }

  return {
    press(x, y) {
      held = true
      gx = mx = sx = x; gy = my = sy = y
      if (kind === 'net') {
        const core = m * 0.04, rad = m * 0.2
        for (let i = 0; i < n; i++) {
          const d = Math.hypot(RX[i] - x, RY[i] - y)
          const f = Math.max(0, Math.min(1, (rad - d) / (rad - core)))
          grab[i] = f * f * (3 - 2 * f)
        }
      }
      quiet = 0
      draw()
      wake()
    },
    move(x, y) { mx = x; my = y },
    release() { held = false; wake() },
    destroy() {
      cancelAnimationFrame(raf)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
