// Mosaic press for the featured pieces: the entrance, under the finger. Where
// you press, the image falls back into fat pixels: a quadtree of blocks
// (48 → 24 → 12 → 6 px) whose size follows the "heat" of the press, biggest
// under the finger. Holding lets it spread over the card; dragging leaves a
// trail that resolves behind; letting go, every block splits back into the
// image (the entrance again).
//  · Heat: a small CPU field (12 px cells), fed by the pointer, decaying.
//  · Drawing: one quad, one fragment shader. Per pixel it walks the quadtree
//    coarse → fine, reads the heat at each cell centre and takes the first
//    size that is hot enough; the colour is the image's mip at that size.
//    No heat = exactly the image. Blocks are not cut at the card's edge:
//    a block on the contour is drawn whole and sticks out (the canvas has a
//    pad for it).
// Same interface as the other materials (press / move / release / destroy).

import type { Cloth } from './cloth'

const VS = `#version 300 es
in vec2 a_p;
out vec2 v_uv;
void main(){ v_uv = vec2(a_p.x * 0.5 + 0.5, 0.5 - a_p.y * 0.5); gl_Position = vec4(a_p, 0.0, 1.0); }`

const FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_img;
uniform sampler2D u_heat;
uniform vec2 u_size; // card css px
uniform vec2 u_field; // heat field css px (a hair bigger than the card)
uniform float u_tpp; // image texels per css px
uniform vec2 u_canvas; // canvas css px (card + pad on every side)
uniform float u_pad;
out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
const float OFF = 27.0; // the grid starts this many px before the card (as the entrance)
// Is the cell of size s around p switched on? A cell on the contour is drawn
// whole, in full colour: it sticks out of the card.
bool hot(vec2 p, float s, float th, out vec4 col){
  vec2 id = floor((p + OFF) / s);
  vec2 lo = id * s - OFF, c = lo + 0.5 * s;
  vec2 ov = clamp(min(lo + s, u_size) - max(lo, vec2(0.0)), 0.0, s) / s;
  float cov = ov.x * ov.y;
  if (cov <= 0.0) return false;
  vec2 cc = clamp(c, vec2(0.0), u_size);
  float ht = texture(u_heat, cc / u_field).r + (hash(id + s) - 0.5) * 0.16;
  if (ht < th) return false;
  col = vec4(textureLod(u_img, cc / u_size, log2(s * u_tpp)).rgb, 1.0);
  return true;
}
void main(){
  vec2 p = v_uv * u_canvas - u_pad;
  vec4 col;
  if (hot(p, 48.0, 0.8, col) || hot(p, 24.0, 0.56, col) || hot(p, 12.0, 0.34, col) || hot(p, 6.0, 0.14, col)) o = col;
  else if (p.x < 0.0 || p.y < 0.0 || p.x > u_size.x || p.y > u_size.y) o = vec4(0.0);
  else o = vec4(texture(u_img, p / u_size).rgb, 1.0);
}`

type Opts = {
  canvas: HTMLCanvasElement
  img: HTMLImageElement
  w: number
  h: number
  pad: number
  onSleep: () => void
}

const CELL = 12 // css px, heat field

export function createMosaic({ canvas, img, w, h, pad, onSleep }: Opts): Cloth | null {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, alpha: true })
  if (!gl) return null
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round((w + pad * 2) * dpr)
  canvas.height = Math.round((h + pad * 2) * dpr)
  const m = Math.min(w, h)

  // ── Heat field ───────────────────────────────────────────────────────────
  const NX = Math.max(8, Math.ceil(w / CELL)), NY = Math.max(8, Math.ceil(h / CELL))
  const H = new Float32Array(NX * NY)
  const px = new Uint8Array(NX * NY)

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
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(p, 'a_p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, NX, NY, 0, gl.RED, gl.UNSIGNED_BYTE, px)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  gl.uniform1i(gl.getUniformLocation(p, 'u_img'), 0)
  gl.uniform1i(gl.getUniformLocation(p, 'u_heat'), 1)
  gl.uniform2f(gl.getUniformLocation(p, 'u_size'), w, h)
  gl.uniform2f(gl.getUniformLocation(p, 'u_field'), NX * CELL, NY * CELL)
  gl.uniform1f(gl.getUniformLocation(p, 'u_tpp'), (img.naturalWidth || w) / w)
  gl.uniform2f(gl.getUniformLocation(p, 'u_canvas'), w + pad * 2, h + pad * 2)
  gl.uniform1f(gl.getUniformLocation(p, 'u_pad'), pad)
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 0)

  const draw = () => {
    for (let i = 0; i < H.length; i++) px[i] = Math.min(255, Math.round(H[i] * 255))
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RED, gl.UNSIGNED_BYTE, px)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  // ── Loop ─────────────────────────────────────────────────────────────────
  let held = false
  let mx = 0, my = 0, sx = 0, sy = 0
  let hold = 0, ramp = 0 // how long it has been held (0–1), press ramp-in
  let raf = 0, last = 0, quiet = 0

  const step = () => {
    sx += (mx - sx) * 0.35
    sy += (my - sy) * 0.35
    if (held) { hold = Math.min(1, hold + 0.011); ramp = Math.min(1, ramp + 0.14) }
    else { hold *= 0.9; ramp = 0 }
    const decay = held ? 0.972 : 0.935
    const R = m * (0.13 + 0.5 * hold), amp = ramp * (0.86 + 0.34 * hold)
    let max = 0
    for (let y = 0; y < NY; y++) {
      const dy = (y + 0.5) * CELL - sy
      for (let x = 0; x < NX; x++) {
        const i = y * NX + x
        let v = H[i] * decay
        if (held) {
          const dx = (x + 0.5) * CELL - sx
          const f = Math.exp(-(dx * dx + dy * dy) / (R * R)) * amp
          if (f > v) v = f
        }
        H[i] = v
        if (v > max) max = v
      }
    }
    return max
  }

  const frame = (t: number) => {
    raf = 0
    const dt = last ? Math.min(50, t - last) : 16.7
    last = t
    const steps = Math.max(1, Math.min(3, Math.round(dt / 16.7)))
    let max = 0
    for (let s = 0; s < steps; s++) max = step()
    draw()
    if (!held && max < 0.05) {
      if (++quiet > 3) {
        H.fill(0); hold = 0; last = 0
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
      mx = sx = x; my = sy = y
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
