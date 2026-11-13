// Cloth press for the featured pieces. While a piece is held, a WebGL2 canvas
// replaces its <img> and draws it as fabric lying on the page:
//  · Simulation: position-based cloth (Verlet + constraint relaxation). The
//    weave is inextensible (structural links resist stretch AND compression),
//    so pushing the fabric can only go up, into folds; bend links (every
//    second node) give it body, so folds are broad and satin-like instead of
//    crumpled. The page is a floor (the cloth never goes behind it) with a
//    little friction. Grabbing lifts the fabric under the pointer and drags
//    it; folds open perpendicular to the pull. Letting go, soft springs bring
//    it back flat and the <img> returns.
//  · Shading per pixel: normals from the mesh, a key light top-left, a satin
//    highlight (tight + broad lobe), steep fold walls going dark, valley
//    occlusion from curvature, and a soft shadow cast on the page by the
//    lifted parts. Flat cloth = exactly the image.
// No dependencies; one instance per piece, created on its first press.

const VS = `#version 300 es
in vec3 a_pos; in vec2 a_uv; in vec3 a_n; in float a_ao;
out vec2 v_uv; out vec3 v_n; out float v_ao;
void main(){ v_uv = a_uv; v_n = a_n; v_ao = a_ao; gl_Position = vec4(a_pos, 1.0); }`

const FS = `#version 300 es
precision highp float;
in vec2 v_uv; in vec3 v_n; in float v_ao;
uniform sampler2D u_tex;
out vec4 o;
const vec3 L = normalize(vec3(-0.42, -0.62, -0.66)); // towards the light (y down, -z = towards the viewer)
const vec3 H = normalize(L + vec3(0.0, 0.0, -1.0));
void main(){
  vec3 n = normalize(v_n);
  vec3 c = texture(u_tex, v_uv).rgb;
  float d0 = -L.z;
  float d = max(dot(n, L), 0.0);
  float lambert = mix(1.0, d / d0, 0.9);
  float wall = mix(0.12, 1.0, smoothstep(0.05, 0.95, -n.z)); // steep sides go dark
  float shade = clamp(lambert, 0.0, 1.3) * mix(1.0, wall, 0.8) * v_ao;
  float h = max(dot(n, H), 0.0), h0 = -H.z;
  float spec = max(pow(h, 80.0) - pow(h0, 80.0), 0.0) * 0.45
             + max(pow(h, 12.0) - pow(h0, 12.0), 0.0) * 0.1;
  vec3 col = c * shade + vec3(spec);
  o = vec4(col, 1.0);
}`

const SVS = `#version 300 es
in vec3 a_pos; in float a_a;
out float v_a;
void main(){ v_a = a_a; gl_Position = vec4(a_pos.xy, 0.999, 1.0); }`

const SFS = `#version 300 es
precision mediump float;
in float v_a;
out vec4 o;
void main(){ o = vec4(0.0, 0.0, 0.0, v_a); }`

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
  const gl = canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: false, alpha: true, depth: true })
  if (!gl) return null

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const CW = w + pad * 2
  const CH = h + pad * 2
  canvas.width = Math.round(CW * dpr)
  canvas.height = Math.round(CH * dpr)
  const m = Math.min(w, h)

  // ── Grid ──────────────────────────────────────────────────────────────────
  const cols = Math.max(26, Math.min(54, Math.round(w / 8)))
  const rows = Math.max(16, Math.min(70, Math.round((cols * h) / w)))
  const W1 = cols + 1
  const n = W1 * (rows + 1)
  const P = new Float32Array(n * 3) // position (x, y, z; z < 0 = lifted towards the viewer)
  const O = new Float32Array(n * 3) // previous position
  const R = new Float32Array(n * 2) // rest
  const idx = (c: number, r: number) => r * W1 + c
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    const i = idx(c, r)
    R[i * 2] = (c / cols) * w
    R[i * 2 + 1] = (r / rows) * h
  }
  const reset = () => {
    for (let i = 0; i < n; i++) {
      P[i * 3] = O[i * 3] = R[i * 2]
      P[i * 3 + 1] = O[i * 3 + 1] = R[i * 2 + 1]
      P[i * 3 + 2] = O[i * 3 + 2] = 0
    }
  }
  reset()

  // Links: structural (stiff both ways) and bend (every second node, softer).
  const st: number[] = []
  const bd: number[] = []
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    if (c < cols) st.push(idx(c, r), idx(c + 1, r))
    if (r < rows) st.push(idx(c, r), idx(c, r + 1))
    if (c + 2 <= cols) bd.push(idx(c, r), idx(c + 2, r))
    if (r + 2 <= rows) bd.push(idx(c, r), idx(c, r + 2))
  }
  const mk = (arr: number[]) => {
    const L = new Int32Array(arr)
    const D = new Float32Array(L.length / 2)
    for (let k = 0; k < D.length; k++) {
      const a = L[k * 2], b = L[k * 2 + 1]
      D[k] = Math.hypot(R[a * 2] - R[b * 2], R[a * 2 + 1] - R[b * 2 + 1])
    }
    return { L, D }
  }
  const S = mk(st)
  const B = mk(bd)

  // ── GL ────────────────────────────────────────────────────────────────────
  const program = (vs: string, fs: string) => {
    const p = gl.createProgram()!
    for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
      const s = gl.createShader(t)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      gl.attachShader(p, s)
    }
    gl.linkProgram(p)
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null
  }
  const prog = program(VS, FS)
  const sprog = program(SVS, SFS)
  if (!prog || !sprog) return null

  const pos = new Float32Array(n * 3) // clip space
  const nrm = new Float32Array(n * 3)
  const ao = new Float32Array(n)
  const spos = new Float32Array(n * 3)
  const sa = new Float32Array(n)
  const uv = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) { uv[i * 2] = R[i * 2] / w; uv[i * 2 + 1] = R[i * 2 + 1] / h }

  const buf = (data: Float32Array, usage: number) => {
    const b = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, data, usage)
    return b
  }
  const attr = (p: WebGLProgram, b: WebGLBuffer, name: string, size: number) => {
    const loc = gl.getAttribLocation(p, name)
    if (loc < 0) return
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
  }
  const tri: number[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const a = idx(c, r), b = idx(c + 1, r), d = idx(c, r + 1), e = idx(c + 1, r + 1)
    // Alternate the diagonal so folds don't lean one way.
    if ((c + r) % 2) tri.push(a, b, e, a, e, d)
    else tri.push(a, b, d, b, e, d)
  }
  const indices = new Uint16Array(tri)

  const bPos = buf(pos, gl.DYNAMIC_DRAW)
  const bNrm = buf(nrm, gl.DYNAMIC_DRAW)
  const bAo = buf(ao, gl.DYNAMIC_DRAW)
  const bUv = buf(uv, gl.STATIC_DRAW)
  const bSpos = buf(spos, gl.DYNAMIC_DRAW)
  const bSa = buf(sa, gl.DYNAMIC_DRAW)

  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  attr(prog, bPos, 'a_pos', 3)
  attr(prog, bUv, 'a_uv', 2)
  attr(prog, bNrm, 'a_n', 3)
  attr(prog, bAo, 'a_ao', 1)
  const ib = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

  const svao = gl.createVertexArray()
  gl.bindVertexArray(svao)
  attr(sprog, bSpos, 'a_pos', 3)
  attr(sprog, bSa, 'a_a', 1)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
  gl.bindVertexArray(null)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic')
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8)

  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 0)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  // ── Interaction state ─────────────────────────────────────────────────────
  let held = false
  let gx = 0, gy = 0 // grab point (rest coords)
  let mx = 0, my = 0 // pointer now
  let lift = 0 // eases in while held
  let tx = 0, ty = 0 // smoothed drag
  let since = 0 // frames since release
  const grabCore = m * 0.07 // pinned hard
const grabR = m * 0.15 // eases out to here
  const grab = new Float32Array(n)
  let raf = 0
  let quiet = 0
  let last = 0

  const D = Math.max(w, h) * 2.6 // camera distance (perspective)
  const ZR = m * 0.6 // depth range for the z-buffer

  function step() {
    // Drag, capped and smoothed so a fast flick doesn't tear the mesh.
    const cap = m * 0.38
    let dx = mx - gx, dy = my - gy
    const dl = Math.hypot(dx, dy)
    if (dl > cap) { const f = cap / dl; dx *= f; dy *= f }
    tx += (dx - tx) * 0.35
    ty += (dy - ty) * 0.35
    lift += ((held ? m * 0.035 + dl * 0.07 : 0) - lift) * 0.12

    // Springs to the rest pose: barely there while held, firmer after release.
    const ramp = held ? 0 : Math.min(1, since / 40)
    const kx = held ? 0.0012 : 0.004 + 0.03 * ramp
    const kz = held ? 0 : 0.02 + 0.08 * ramp
    const damp = held ? 0.982 : 0.955

    for (let i = 0; i < n; i++) {
      const j = i * 3
      let vx = (P[j] - O[j]) * damp
      let vy = (P[j + 1] - O[j + 1]) * damp
      let vz = (P[j + 2] - O[j + 2]) * damp
      const vmax = m * 0.05
      const vl = Math.hypot(vx, vy, vz)
      if (vl > vmax) { const f = vmax / vl; vx *= f; vy *= f; vz *= f }
      O[j] = P[j]; O[j + 1] = P[j + 1]; O[j + 2] = P[j + 2]
      P[j] += vx + (R[i * 2] - P[j]) * kx
      P[j + 1] += vy + (R[i * 2 + 1] - P[j + 1]) * kx
      P[j + 2] += vz - P[j + 2] * kz
    }

    for (let it = 0; it < 16; it++) {
      if (held) {
        for (let i = 0; i < n; i++) {
          const g = grab[i]
          if (g <= 0) continue
          const j = i * 3
          const s = g
          P[j] += (R[i * 2] + tx * g - P[j]) * s
          P[j + 1] += (R[i * 2 + 1] + ty * g - P[j + 1]) * s
          P[j + 2] += (-lift * g - P[j + 2]) * s
        }
      }
      relax(S.L, S.D, 1)
      relax(B.L, B.D, 0.85)
      // Floor: the page. Never behind it; some friction while resting on it.
      for (let i = 0; i < n; i++) {
        const j = i * 3
        if (P[j + 2] > 0) {
          P[j + 2] = 0
          O[j] += (P[j] - O[j]) * 0.18
          O[j + 1] += (P[j + 1] - O[j + 1]) * 0.18
        }
      }
    }
  }

  function relax(L: Int32Array, Dd: Float32Array, k: number) {
    for (let q = 0; q < Dd.length; q++) {
      const a = L[q * 2] * 3, b = L[q * 2 + 1] * 3
      const ex = P[b] - P[a], ey = P[b + 1] - P[a + 1], ez = P[b + 2] - P[a + 2]
      const d = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1e-6
      const c = ((d - Dd[q]) / d) * 0.5 * k
      P[a] += ex * c; P[a + 1] += ey * c; P[a + 2] += ez * c
      P[b] -= ex * c; P[b + 1] -= ey * c; P[b + 2] -= ez * c
    }
  }

  function draw() {
    const cx = w / 2, cy = h / 2
    const sx0 = 0.55, sy0 = 0.85 // shadow offset per unit of height (light top-left)
    for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
      const i = idx(c, r), j = i * 3
      const x = P[j], y = P[j + 1], z = P[j + 2]
      const s = D / (D + z)
      pos[j] = ((cx + (x - cx) * s + pad) / CW) * 2 - 1
      pos[j + 1] = 1 - ((cy + (y - cy) * s + pad) / CH) * 2
      pos[j + 2] = Math.max(-1, Math.min(1, z / ZR))
      // Normal (central differences).
      const il = idx(Math.max(0, c - 1), r) * 3, ir = idx(Math.min(cols, c + 1), r) * 3
      const iu = idx(c, Math.max(0, r - 1)) * 3, id = idx(c, Math.min(rows, r + 1)) * 3
      const ax = P[ir] - P[il], ay = P[ir + 1] - P[il + 1], az = P[ir + 2] - P[il + 2]
      const bx = P[id] - P[iu], by = P[id + 1] - P[iu + 1], bz = P[id + 2] - P[iu + 2]
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx
      const nl = Math.hypot(nx, ny, nz) || 1
      nx /= nl; ny /= nl; nz /= nl
      if (nz > 0) { nx = -nx; ny = -ny; nz = -nz }
      nrm[j] = nx; nrm[j + 1] = ny; nrm[j + 2] = nz
      // Valley occlusion: lower than its neighbours (z larger) = darker.
      const lap = z - (P[il + 2] + P[ir + 2] + P[iu + 2] + P[id + 2]) * 0.25
      const cell = w / cols
      ao[i] = 1 - Math.min(0.55, Math.max(0, lap / cell) * 1.6)
      // Cast shadow on the page.
      const hgt = -z
      spos[j] = ((x + hgt * sx0 + pad) / CW) * 2 - 1
      spos[j + 1] = 1 - ((y + hgt * sy0 + pad) / CH) * 2
      spos[j + 2] = 0
      sa[i] = Math.min(0.5, (hgt / (m * 0.08)) * 0.5)
    }
    const up = (b: WebGLBuffer, d: Float32Array) => { gl!.bindBuffer(gl!.ARRAY_BUFFER, b); gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, d) }
    up(bPos, pos); up(bNrm, nrm); up(bAo, ao); up(bSpos, spos); up(bSa, sa)

    gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT)
    // Shadow first, no depth.
    gl!.disable(gl!.DEPTH_TEST)
    gl!.useProgram(sprog)
    gl!.bindVertexArray(svao)
    gl!.drawElements(gl!.TRIANGLES, indices.length, gl!.UNSIGNED_SHORT, 0)
    // Cloth with depth, so folds that overlap sort correctly.
    gl!.enable(gl!.DEPTH_TEST)
    gl!.depthFunc(gl!.LEQUAL)
    gl!.useProgram(prog)
    gl!.bindVertexArray(vao)
    gl!.drawElements(gl!.TRIANGLES, indices.length, gl!.UNSIGNED_SHORT, 0)
  }

  function settled() {
    let e = 0
    for (let i = 0; i < n; i++) {
      const j = i * 3
      e = Math.max(e, Math.abs(P[j] - R[i * 2]), Math.abs(P[j + 1] - R[i * 2 + 1]), Math.abs(P[j + 2]))
      if (e > 0.25) return false
    }
    return true
  }

  function frame(t: number) {
    raf = 0
    const dt = last ? Math.min(50, t - last) : 16.7
    last = t
    const steps = Math.max(1, Math.min(2, Math.round(dt / 16.7)))
    for (let s = 0; s < steps; s++) { step(); if (!held) since++ }
    draw()
    if (!held && settled()) {
      if (++quiet > 6) { sleep(); return }
    } else quiet = 0
    raf = requestAnimationFrame(frame)
  }

  function sleep() {
    reset()
    last = 0
    onSleep()
  }

  const wake = () => { if (!raf) raf = requestAnimationFrame(frame) }

  return {
    press(x, y) {
      held = true
      since = 0
      gx = mx = x; gy = my = y
      tx = ty = 0
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(R[i * 2] - x, R[i * 2 + 1] - y)
        const f = Math.max(0, Math.min(1, (grabR - d) / (grabR - grabCore)))
        grab[i] = f * f * (3 - 2 * f)
      }
      quiet = 0
      draw()
      wake()
    },
    move(x, y) { mx = x; my = y },
    release() { held = false; since = 0; wake() },
    destroy() {
      cancelAnimationFrame(raf)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
