// Paper press for the featured pieces: the card is a printed sheet. Press
// and drag inwards and the sheet peels from the corner (or edge) furthest
// along the opposite direction, rolling over a cylinder like a page being
// turned: the back is blank paper with a faint show-through of the print,
// the curl is shaded, and the lifted part casts a soft shadow on the sheet
// and on the page. Letting go, the sheet flops back flat with a small bounce.
//  · Geometry, all in one fragment shader (inverse mapping, no mesh): the
//    paper beyond the axis line rolls onto a cylinder of radius r and comes
//    back flat on top. For each pixel the candidates are tried top-down
//    (flat back layer, back half of the curl, front half, the flat sheet),
//    with soft edges so the outline is antialiased.
//  · The peel point E is the rect corner furthest along d = (press − pointer);
//    it travels with the drag, so the fold line moves half as fast.
// Same interface as the cloth (press / move / release / destroy).

import type { Cloth } from './cloth'

const VS = `#version 300 es
in vec2 a_p;
uniform vec2 u_canvas; // css px
uniform float u_pad;
out vec2 v_p; // card-local css px
void main(){
  v_p = vec2(a_p.x * 0.5 + 0.5, 0.5 - a_p.y * 0.5) * u_canvas - u_pad;
  gl_Position = vec4(a_p, 0.0, 1.0);
}`

const FS = `#version 300 es
precision highp float;
in vec2 v_p;
uniform sampler2D u_tex;
uniform vec2 u_size; // card px
uniform vec2 u_d; // unit, towards the peeled side
uniform vec2 u_a; // a point on the axis line
uniform float u_r; // curl radius
uniform vec3 u_paper;
out vec4 o;
const float PI = 3.14159265;
vec3 acc = vec3(0.0); float al = 0.0;
void add(vec3 c, float a){ acc += (1.0 - al) * a * c; al += (1.0 - al) * a; }
float cover(vec2 q){ vec2 e = min(q, u_size - q); return clamp(min(e.x, e.y) + 0.5, 0.0, 1.0); }
float soft(vec2 q, float k){ vec2 e = min(q, u_size - q); return smoothstep(-k, k, min(e.x, e.y)); }
vec3 front(vec2 q){ return texture(u_tex, q / u_size).rgb; }
vec3 back(vec2 q){
  vec3 t = texture(u_tex, q / u_size).rgb;
  float g = dot(t, vec3(0.3, 0.59, 0.11));
  return mix(u_paper, u_paper * (0.82 + 0.18 * g), 0.55); // a ghost of the print through the sheet
}
// Where the top (flat back) layer would sit over pixel p, for shadows.
float topAt(vec2 p, float k){
  float s = dot(p - u_a, u_d);
  if (s > 0.0) return 0.0;
  float u = PI * u_r - s;
  return soft(p + u_d * (u - s), k);
}
void main(){
  vec2 p = v_p;
  float r = max(u_r, 1e-3);
  float s = dot(p - u_a, u_d);
  float lift = r * 2.0;
  // 1 · flat back layer, on top of everything.
  if (s <= 0.0) {
    float u = PI * r - s;
    vec2 q = p + u_d * (u - s);
    add(back(q) * 0.98, cover(q));
  }
  if (s >= 0.0 && s <= r) {
    float a = asin(clamp(s / r, 0.0, 1.0));
    // 2 · back half of the curl (facing up again near the top).
    float ph = PI - a;
    vec2 q = p + u_d * (r * ph - s);
    float sh = mix(0.7, 1.0, -cos(ph));
    add(back(q) * sh + vec3(pow(sin(ph), 12.0) * 0.06), cover(q));
    // 3 · front half, rolling away from the light.
    vec2 q2 = p + u_d * (r * a - s);
    float sf = mix(1.0, 0.55, pow(sin(a), 2.0));
    add(front(q2) * sf, cover(q2));
  }
  // 4 · the flat sheet, with the curl's occlusion and the top layer's shadow.
  vec2 off = vec2(0.45, 0.75) * lift * 0.7 + 1.5;
  float shTop = topAt(p - off, max(3.0, lift * 0.6)) * 0.42;
  if (s <= 0.0) {
    float occ = 1.0 - 0.38 * exp(s / (r * 1.4 + 1.0)) * clamp(r / 6.0, 0.0, 1.0);
    add(front(p) * occ * (1.0 - shTop), cover(p));
  }
  // 5 · the page under a peeled area: only a shadow.
  float curlSh = (s > 0.0 && s < r * 1.8 + 6.0) ? 0.3 * (1.0 - s / (r * 1.8 + 6.0)) * soft(p, 2.0) * clamp(r / 6.0, 0.0, 1.0) : 0.0;
  add(vec3(0.0), max(shTop, curlSh));
  o = al > 0.0 ? vec4(acc / al, al) : vec4(0.0);
}`

type Opts = {
  canvas: HTMLCanvasElement
  img: HTMLImageElement
  w: number
  h: number
  pad: number
  onSleep: () => void
}

export function createPaper({ canvas, img, w, h, pad, onSleep }: Opts): Cloth | null {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, alpha: true })
  if (!gl) return null
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const CW = w + pad * 2, CH = h + pad * 2
  canvas.width = Math.round(CW * dpr)
  canvas.height = Math.round(CH * dpr)
  const m = Math.min(w, h)

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

  const t = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  const U = (n: string) => gl.getUniformLocation(p, n)
  gl.uniform1i(U('u_tex'), 0)
  gl.uniform2f(U('u_canvas'), CW, CH)
  gl.uniform1f(U('u_pad'), pad)
  gl.uniform2f(U('u_size'), w, h)
  gl.uniform3f(U('u_paper'), 0.93, 0.92, 0.89)
  const uD = U('u_d'), uA = U('u_a'), uR = U('u_r')
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 0)

  // ── State ────────────────────────────────────────────────────────────────
  let held = false
  let gx = 0, gy = 0, mx = 0, my = 0
  let dx = 1, dy = 0 // peel direction (smoothed)
  let aimed = false // first real drag sets it at once
  let L = 0, vL = 0 // peel length + its speed (spring)
  let raf = 0, last = 0, quiet = 0

  const corners = [[0, 0], [w, 0], [0, h], [w, h]]
  const draw = () => {
    // Furthest corner along d (whole sheet lies behind the axis at L = 0).
    let ex = 0, ey = 0, best = -Infinity, worst = Infinity
    for (const [cx, cy] of corners) {
      const k = cx * dx + cy * dy
      if (k > best) { best = k; ex = cx; ey = cy }
      if (k < worst) worst = k
    }
    const ext = best - worst
    const l = Math.max(0, Math.min(L, ext * 0.92))
    const r = Math.min(m * 0.075, l * 0.22)
    const uE = (l + Math.PI * r) / 2
    gl.uniform2f(uD, dx, dy)
    gl.uniform2f(uA, ex - dx * uE, ey - dy * uE)
    gl.uniform1f(uR, r)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const frame = (tm: number) => {
    raf = 0
    const dt = last ? Math.min(50, tm - last) : 16.7
    last = tm
    const steps = Math.max(1, Math.min(3, Math.round(dt / 16.7)))
    for (let s = 0; s < steps; s++) {
      const vx = gx - mx, vy = gy - my, len = Math.hypot(vx, vy)
      if (held && len > 4) {
        // Turn the peel direction gently (a fast swing would flip corners).
        const k = aimed ? Math.min(1, 0.08 + (len / m) * 0.4) : 1
        aimed = true
        dx += (vx / len - dx) * k; dy += (vy / len - dy) * k
        const dl = Math.hypot(dx, dy) || 1
        dx /= dl; dy /= dl
      }
      const target = held ? len * 1.1 : 0
      vL += (target - L) * (held ? 0.22 : 0.12)
      vL *= held ? 0.62 : 0.8
      L += vL
      if (L < 0) { L = 0; vL *= -0.35 } // flops onto the page, a small bounce
    }
    draw()
    if (!held && L < 0.3 && Math.abs(vL) < 0.08) {
      if (++quiet > 4) { L = 0; vL = 0; last = 0; onSleep(); return }
    } else quiet = 0
    raf = requestAnimationFrame(frame)
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame) }

  return {
    press(x, y) {
      held = true
      aimed = false
      gx = mx = x; gy = my = y
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
