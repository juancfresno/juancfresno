// Cloth press for the featured pieces: while a piece is pressed, a WebGL
// canvas replaces the <img> and draws it as a Verlet cloth (grid of points,
// distance constraints, soft springs back to the flat rest pose, corners
// held firmer). Pressing pushes the fabric in around the pointer, dragging
// pulls it, letting go leaves it rippling until it settles; then the canvas
// hides and the flat <img> is back. Shading comes from the surface normal, so
// folds read as light and shadow; at rest it is exactly the image.
// No dependencies. One instance per piece, created on its first press.

const VS = `#version 300 es
in vec2 a_pos; in vec2 a_uv; in float a_shade;
out vec2 v_uv; out float v_shade;
void main(){ v_uv = a_uv; v_shade = a_shade; gl_Position = vec4(a_pos, 0.0, 1.0); }`

const FS = `#version 300 es
precision mediump float;
in vec2 v_uv; in float v_shade;
uniform sampler2D u_tex;
out vec4 o;
void main(){
  vec3 c = texture(u_tex, v_uv).rgb;
  float s = v_shade;
  c = c * min(s, 1.0) + vec3(max(s - 1.0, 0.0) * 0.55);
  o = vec4(c, 1.0);
}`

export type Cloth = {
  press: (x: number, y: number) => void // card-local px
  move: (x: number, y: number) => void
  release: () => void
  destroy: () => void
}

type Opts = {
  canvas: HTMLCanvasElement
  img: HTMLImageElement
  w: number // card css px
  h: number
  pad: number // canvas spill around the card, css px
  onSleep: () => void
}

export function createCloth({ canvas, img, w, h, pad, onSleep }: Opts): Cloth | null {
  const gl = canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: true, alpha: true })
  if (!gl) return null

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const CW = w + pad * 2
  const CH = h + pad * 2
  canvas.width = Math.round(CW * dpr)
  canvas.height = Math.round(CH * dpr)

  // ── Grid ──
  const cols = 26
  const rows = Math.max(10, Math.min(40, Math.round((cols * h) / w)))
  const n = (cols + 1) * (rows + 1)
  const P = new Float32Array(n * 3) // position
  const O = new Float32Array(n * 3) // previous
  const R = new Float32Array(n * 2) // rest
  const K = new Float32Array(n) // spring to rest
  const idx = (c: number, r: number) => r * (cols + 1) + c
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const i = idx(c, r)
      const x = (c / cols) * w
      const y = (r / rows) * h
      R[i * 2] = x; R[i * 2 + 1] = y
      P[i * 3] = O[i * 3] = x
      P[i * 3 + 1] = O[i * 3 + 1] = y
      const corner = (c === 0 || c === cols) && (r === 0 || r === rows)
      const edge = c === 0 || c === cols || r === 0 || r === rows
      K[i] = corner ? 0.22 : edge ? 0.035 : 0.008
    }
  }
  // Constraints: structural + shear.
  const links: number[] = []
  const add = (a: number, b: number) => links.push(a, b)
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    if (c < cols) add(idx(c, r), idx(c + 1, r))
    if (r < rows) add(idx(c, r), idx(c, r + 1))
    if (c < cols && r < rows) { add(idx(c, r), idx(c + 1, r + 1)); add(idx(c + 1, r), idx(c, r + 1)) }
  }
  const L = new Int32Array(links)
  const LR = new Float32Array(L.length / 2)
  for (let k = 0; k < LR.length; k++) {
    const a = L[k * 2], b = L[k * 2 + 1]
    LR[k] = Math.hypot(R[a * 2] - R[b * 2], R[a * 2 + 1] - R[b * 2 + 1])
  }

  // ── GL ──
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src); gl.compileShader(s)
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)

  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const posBuf = gl.createBuffer()
  const shadeBuf = gl.createBuffer()
  const uvBuf = gl.createBuffer()
  const uv = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) { uv[i * 2] = R[i * 2] / w; uv[i * 2 + 1] = R[i * 2 + 1] / h }
  const bindAttr = (buf: WebGLBuffer | null, name: string, size: number, data: Float32Array, usage: number) => {
    const loc = gl.getAttribLocation(prog, name)
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, data, usage)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
  }
  const clip = new Float32Array(n * 2)
  const shade = new Float32Array(n)
  bindAttr(uvBuf, 'a_uv', 2, uv, gl.STATIC_DRAW)
  bindAttr(posBuf, 'a_pos', 2, clip, gl.DYNAMIC_DRAW)
  bindAttr(shadeBuf, 'a_shade', 1, shade, gl.DYNAMIC_DRAW)
  const tri: number[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const a = idx(c, r), b = idx(c + 1, r), d = idx(c, r + 1), e = idx(c + 1, r + 1)
    tri.push(a, b, d, b, e, d)
  }
  const ibuf = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tri), gl.STATIC_DRAW)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 0)

  // ── Interaction state ──
  let held = false
  let gx = 0, gy = 0 // grab point (rest coords)
  let mx = 0, my = 0 // current pointer
  let depth = 0 // press depth, eases in while held
  const radius = Math.min(w, h) * 0.42
  const fall = new Float32Array(n)
  let raf = 0
  let quiet = 0
  let last = 0

  const D = Math.max(w, h) * 2.4 // camera distance for the perspective
  const Lx = -0.45, Ly = -0.55, Lz = -0.7
  const Ll = Math.hypot(Lx, Ly, Lz)
  const lx = Lx / Ll, ly = Ly / Ll, lz = Lz / Ll
  const base = -lz // dot(rest normal (0,0,-1), light)

  function step() {
    const damp = 0.965
    const maxPull = Math.min(w, h) * 0.22
    let dx = mx - gx, dy = my - gy
    const dl = Math.hypot(dx, dy)
    if (dl > maxPull) { dx *= maxPull / dl; dy *= maxPull / dl }
    depth += ((held ? Math.min(w, h) * 0.09 : 0) - depth) * 0.18

    for (let i = 0; i < n; i++) {
      const j = i * 3
      const vx = (P[j] - O[j]) * damp
      const vy = (P[j + 1] - O[j + 1]) * damp
      const vz = (P[j + 2] - O[j + 2]) * damp
      O[j] = P[j]; O[j + 1] = P[j + 1]; O[j + 2] = P[j + 2]
      P[j] += vx; P[j + 1] += vy; P[j + 2] += vz
      const k = K[i]
      P[j] += (R[i * 2] - P[j]) * k
      P[j + 1] += (R[i * 2 + 1] - P[j + 1]) * k
      P[j + 2] += -P[j + 2] * k * 1.4
      if (held && fall[i] > 0) {
        const f = fall[i]
        const s = 0.3 * f
        P[j] += (R[i * 2] + dx * f - P[j]) * s
        P[j + 1] += (R[i * 2 + 1] + dy * f - P[j + 1]) * s
        P[j + 2] += (depth * f - P[j + 2]) * s
      }
    }
    for (let it = 0; it < 5; it++) {
      for (let k = 0; k < LR.length; k++) {
        const a = L[k * 2] * 3, b = L[k * 2 + 1] * 3
        const ex = P[b] - P[a], ey = P[b + 1] - P[a + 1], ez = P[b + 2] - P[a + 2]
        const d = Math.hypot(ex, ey, ez) || 1e-6
        const rest = LR[k]
        // Stretch is resisted hard, compression barely: the fabric buckles.
        const st = d > rest ? 0.5 : 0.06
        const c = ((d - rest) / d) * st
        P[a] += ex * c; P[a + 1] += ey * c; P[a + 2] += ez * c
        P[b] -= ex * c; P[b + 1] -= ey * c; P[b + 2] -= ez * c
      }
    }
  }

  function draw() {
    const cx = w / 2, cy = h / 2
    for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
      const i = idx(c, r), j = i * 3
      const s = D / (D + P[j + 2])
      const sx = cx + (P[j] - cx) * s + pad
      const sy = cy + (P[j + 1] - cy) * s + pad
      clip[i * 2] = (sx / CW) * 2 - 1
      clip[i * 2 + 1] = 1 - (sy / CH) * 2
      // Normal from neighbours.
      const il = idx(Math.max(0, c - 1), r) * 3, ir = idx(Math.min(cols, c + 1), r) * 3
      const iu = idx(c, Math.max(0, r - 1)) * 3, id = idx(c, Math.min(rows, r + 1)) * 3
      const ax = P[ir] - P[il], ay = P[ir + 1] - P[il + 1], az = P[ir + 2] - P[il + 2]
      const bx = P[id] - P[iu], by = P[id + 1] - P[iu + 1], bz = P[id + 2] - P[iu + 2]
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx
      const nl = Math.hypot(nx, ny, nz) || 1
      nx /= nl; ny /= nl; nz /= nl
      if (nz > 0) { nx = -nx; ny = -ny; nz = -nz }
      shade[i] = 1 + (nx * lx + ny * ly + nz * lz - base) * 1.6
    }
    gl!.bindBuffer(gl!.ARRAY_BUFFER, posBuf)
    gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, clip)
    gl!.bindBuffer(gl!.ARRAY_BUFFER, shadeBuf)
    gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, shade)
    gl!.clear(gl!.COLOR_BUFFER_BIT)
    gl!.drawElements(gl!.TRIANGLES, tri.length, gl!.UNSIGNED_SHORT, 0)
  }

  function energy() {
    let e = 0
    for (let i = 0; i < n; i++) {
      const j = i * 3
      e = Math.max(e, Math.abs(P[j] - R[i * 2]), Math.abs(P[j + 1] - R[i * 2 + 1]), Math.abs(P[j + 2]),
        Math.abs(P[j] - O[j]), Math.abs(P[j + 2] - O[j + 2]))
    }
    return e
  }

  function frame(t: number) {
    raf = 0
    // Fixed 60 Hz steps, at most 3 per frame.
    const dt = last ? Math.min(50, t - last) : 16.7
    last = t
    const steps = Math.max(1, Math.min(3, Math.round(dt / 16.7)))
    for (let s = 0; s < steps; s++) step()
    draw()
    if (!held && energy() < 0.08) {
      if (++quiet > 8) { sleep(); return }
    } else quiet = 0
    raf = requestAnimationFrame(frame)
  }

  function sleep() {
    for (let i = 0; i < n; i++) {
      P[i * 3] = O[i * 3] = R[i * 2]
      P[i * 3 + 1] = O[i * 3 + 1] = R[i * 2 + 1]
      P[i * 3 + 2] = O[i * 3 + 2] = 0
    }
    last = 0
    onSleep()
  }

  const wake = () => { if (!raf) raf = requestAnimationFrame(frame) }

  return {
    press(x, y) {
      held = true
      gx = mx = x; gy = my = y
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(R[i * 2] - x, R[i * 2 + 1] - y)
        const f = Math.max(0, 1 - d / radius)
        fall[i] = f * f * (3 - 2 * f)
        // A little noise so compression folds instead of staying flat.
        P[i * 3 + 2] += (Math.random() - 0.5) * 0.6 * fall[i]
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
