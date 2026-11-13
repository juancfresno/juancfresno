// Liquid press for the featured pieces: the image lies under a thin layer of
// water. Pressing pushes the surface down and keeps feeding rings while held;
// dragging leaves a wake; letting go the surface springs back (a rebound
// drop) and the rings run out, bounce off the card edges and die.
//  · Simulation: a height field on a CPU grid (~5 px cells), the classic
//    two-buffer wave equation with damping, fixed edges.
//  · Drawing: one quad over the card. The field goes up as a small texture
//    (slope x, slope y, height); the fragment shader refracts the image along
//    the slope with a slight RGB dispersion, adds a key light, a tight
//    highlight on the crests and a touch of darkening in the troughs.
//    Calm water = exactly the image.
// Same interface as the cloth (press / move / release / destroy).

import type { Cloth } from './cloth'

const VS = `#version 300 es
in vec2 a_p;
out vec2 v_uv;
void main(){ v_uv = vec2(a_p.x * 0.5 + 0.5, 0.5 - a_p.y * 0.5); gl_Position = vec4(a_p, 0.0, 1.0); }`

const FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_img;
uniform sampler2D u_h;
uniform vec2 u_texel; // one field cell in uv
uniform float u_refr;
out vec4 o;
void main(){
  vec4 t = texture(u_h, v_uv);
  vec2 g = (t.rg - 0.5) * 2.0; // slope
  float hh = (t.b - 0.5) * 2.0; // height (+ = crest)
  vec2 off = g * u_refr;
  float r = texture(u_img, v_uv - off * 1.18).r;
  float gg = texture(u_img, v_uv - off).g;
  float b = texture(u_img, v_uv - off * 0.82).b;
  vec3 c = vec3(r, gg, b);
  vec3 n = normalize(vec3(-g * 2.6, 1.0));
  vec3 L = normalize(vec3(-0.45, -0.6, 0.66)); // light top-left (uv y down)
  float lam = dot(n, L) / L.z; // 1 when flat
  vec3 R = reflect(-L, n);
  float R0z = max(reflect(-L, vec3(0.0, 0.0, 1.0)).z, 0.0);
  float spec = (pow(max(R.z, 0.0), 90.0) - pow(R0z, 90.0)) * 0.55 + (pow(max(R.z, 0.0), 14.0) - pow(R0z, 14.0)) * 0.12;
  c *= mix(1.0, lam, 0.55) * (1.0 + hh * 0.08);
  c += vec3(max(spec, 0.0));
  o = vec4(c, 1.0);
}`

type Opts = {
  canvas: HTMLCanvasElement
  img: HTMLImageElement
  w: number
  h: number
  pad: number
  onSleep: () => void
}

export function createLiquid({ canvas, img, w, h, pad, onSleep }: Opts): Cloth | null {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, alpha: true })
  if (!gl) return null
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round((w + pad * 2) * dpr)
  canvas.height = Math.round((h + pad * 2) * dpr)
  const m = Math.min(w, h)

  // ── Field ────────────────────────────────────────────────────────────────
  const NX = Math.max(60, Math.min(180, Math.round(w / 5)))
  const NY = Math.max(40, Math.min(220, Math.round((NX * h) / w)))
  const cw = w / NX, ch = h / NY
  let A = new Float32Array(NX * NY) // now
  let B = new Float32Array(NX * NY) // previous (then next)
  const px = new Uint8Array(NX * NY * 4)
  const DAMP = 0.979

  const stepField = () => {
    for (let y = 1; y < NY - 1; y++) {
      const row = y * NX
      for (let x = 1; x < NX - 1; x++) {
        const i = row + x
        B[i] = ((A[i - 1] + A[i + 1] + A[i - NX] + A[i + NX]) * 0.5 - B[i]) * DAMP
      }
    }
    const t = A; A = B; B = t
  }

  // Gaussian push at card-local px (amp < 0 = down).
  const push = (x: number, y: number, amp: number, rad: number) => {
    const cx = x / cw, cy = y / ch, r = rad / cw, r2 = r * r
    const x0 = Math.max(1, Math.floor(cx - r * 2)), x1 = Math.min(NX - 2, Math.ceil(cx + r * 2))
    const y0 = Math.max(1, Math.floor(cy - r * 2)), y1 = Math.min(NY - 2, Math.ceil(cy + r * 2))
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const d2 = (xx - cx) ** 2 + (yy - cy) ** 2
      A[yy * NX + xx] += amp * Math.exp(-d2 / r2)
    }
  }

  const upload = () => {
    let k = 0
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++, k += 4) {
      const i = y * NX + x
      const l = A[x > 0 ? i - 1 : i], r = A[x < NX - 1 ? i + 1 : i]
      const u = A[y > 0 ? i - NX : i], d = A[y < NY - 1 ? i + NX : i]
      px[k] = Math.max(0, Math.min(255, 128 + (r - l) * 160))
      px[k + 1] = Math.max(0, Math.min(255, 128 + (d - u) * 160))
      px[k + 2] = Math.max(0, Math.min(255, 128 - A[i] * 90))
      px[k + 3] = 255
    }
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, hTex)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RGBA, gl.UNSIGNED_BYTE, px)
  }

  // ── GL ───────────────────────────────────────────────────────────────────
  const p = gl.createProgram()!
  for (const [t, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]] as const) {
    const sh = gl.createShader(t)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    gl.attachShader(p, sh)
  }
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null
  gl.useProgram(p)
  const vb = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vb)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(p, 'a_p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const tex = (unit: number) => {
    const t = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }
  tex(0)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  const hTex = tex(1)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NX, NY, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.uniform1i(gl.getUniformLocation(p, 'u_img'), 0)
  gl.uniform1i(gl.getUniformLocation(p, 'u_h'), 1)
  gl.uniform2f(gl.getUniformLocation(p, 'u_texel'), 1 / NX, 1 / NY)
  gl.uniform1f(gl.getUniformLocation(p, 'u_refr'), 0.034)
  // Only the card: the spill pad stays clear.
  gl.viewport(Math.round(pad * dpr), Math.round(pad * dpr), Math.round(w * dpr), Math.round(h * dpr))
  gl.clearColor(0, 0, 0, 0)

  // ── Loop ─────────────────────────────────────────────────────────────────
  let held = false
  let mx = 0, my = 0, lx = 0, ly = 0
  let raf = 0, last = 0, quiet = 0, pressT = 0
  const R0 = Math.max(10, m * 0.05)

  const frame = (t: number) => {
    raf = 0
    const dt = last ? Math.min(50, t - last) : 16.7
    last = t
    const steps = Math.max(1, Math.min(3, Math.round(dt / 16.7)))
    for (let s = 0; s < steps; s++) {
      if (held) {
        // The finger keeps pressing (rings keep coming) and leaves a wake.
        pressT++
        if (pressT % 9 === 0) push(mx, my, -1.1, R0)
        const dx = mx - lx, dy = my - ly, dl = Math.hypot(dx, dy)
        if (dl > 0.5) {
          const n = Math.ceil(dl / (cw * 1.5))
          const a = -Math.min(1.2, dl * 0.05) / n
          for (let k = 1; k <= n; k++) push(lx + (dx * k) / n, ly + (dy * k) / n, a, R0 * 0.8)
          lx = mx; ly = my
        }
      }
      stepField()
    }
    upload()
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    let e = 0
    for (let i = 0; i < A.length; i += 3) { const v = Math.abs(A[i]); if (v > e) e = v }
    if (!held && e < 0.035) {
      if (++quiet > 8) { sleep(); return }
    } else quiet = 0
    raf = requestAnimationFrame(frame)
  }

  const sleep = () => {
    A.fill(0); B.fill(0)
    last = 0
    onSleep()
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame) }

  return {
    press(x, y) {
      held = true
      pressT = 0
      mx = lx = x; my = ly = y
      push(x, y, -3.2, R0 * 1.3)
      quiet = 0
      upload()
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      wake()
    },
    move(x, y) { mx = x; my = y },
    release() {
      held = false
      push(mx, my, 1.6, R0) // the surface springs back
      wake()
    },
    destroy() {
      cancelAnimationFrame(raf)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
