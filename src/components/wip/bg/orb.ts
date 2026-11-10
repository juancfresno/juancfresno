// ─── WIP background · sphere / tunnel / lens (raw WebGL2) ─────────────────────
// The feed mosaic (the same tile as /feed: feed-canvas.json + the curated
// selection) is painted once into an atlas texture, one piece at a time as
// it loads (≤ 4 in flight, sub-uploads, throttled mipmaps), and a single
// full-screen fragment shader maps it:
//   sphere · a globe seen from outside (ray–sphere, lon/lat, limb fade);
//   tunnel · the inside of a cylinder, rings running towards the centre;
//   lens   · the plane through a fisheye (centre magnified, edges packed).
// The RGB split is the feed's: R and B sampled along the screen velocity,
// min(18, (speed − 0.6) · 0.6) px, so slow motion stays clean. Grain is the
// page's DOM grain. Mipmap seams of the atan wrap are avoided by taking the
// gradient from whichever of two offset parameterisations is continuous.
import tileData from '@/content/feed-canvas.json'
import type { FeedItem } from '@/content/feed'
import { makeLayout, coverUv, type Tile } from '@/components/feed/canvas/layout'

const TILE = tileData as unknown as Tile

export type OrbMode = 'sphere' | 'tunnel' | 'lens'
export const ORB_MODES: OrbMode[] = ['sphere', 'tunnel', 'lens']
const MODE_ID: Record<OrbMode, number> = { sphere: 0, tunnel: 1, lens: 2 }

export type OrbFrame = {
  mode: OrbMode
  a: number; b: number // sphere: yaw, pitch · tunnel: angle (turns), depth · lens: camera x, y (CSS px)
  cx: number; cy: number; r: number // centre + radius / scale, device px
  split: [number, number] // device px
  bg: [number, number, number]
}

const VS = `#version 300 es
layout(location=0) in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`

const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform int uMode;
uniform vec2 uAB;
uniform vec3 uGeo;     // cx, cy, r (device px, y down)
uniform vec2 uSplit;
uniform vec2 uTile;    // lens: tile size in device px
uniform vec3 uBg;
out vec4 o;
const float PI = 3.14159265;

// uv in tile units (REPEAT), fade = coverage × shading
void mapAt(vec2 p, out vec2 uv, out float fade){
  if (uMode == 0) {
    vec2 d = (p - uGeo.xy) / uGeo.z;
    float r2 = dot(d, d);
    float z = sqrt(max(0.0, 1.0 - r2));
    vec3 n = vec3(d.x, -d.y, z);
    float cp = cos(uAB.y), sp = sin(uAB.y);
    n = vec3(n.x, cp * n.y - sp * n.z, sp * n.y + cp * n.z);
    float cy = cos(uAB.x), sy = sin(uAB.x);
    n = vec3(cy * n.x + sy * n.z, n.y, -sy * n.x + cy * n.z);
    float lon = atan(n.x, n.z);
    float lat = asin(clamp(n.y, -1.0, 1.0));
    uv = vec2(lon / (2.0 * PI) * 4.0, 0.5 - lat / PI * 2.4);
    float edge = 1.0 - smoothstep(1.0 - 1.5 / uGeo.z, 1.0, sqrt(r2));
    fade = edge * (0.18 + 0.82 * pow(z, 0.55));
  } else if (uMode == 1) {
    vec2 q = (p - uGeo.xy) / uGeo.z;
    float r = max(length(q), 1e-3);
    float a = atan(q.y, q.x);
    uv = vec2(a / (2.0 * PI) * 3.0 + uAB.x * 3.0, 0.42 / r + uAB.y);
    fade = smoothstep(0.04, 0.75, r);
  } else {
    vec2 q = p - uGeo.xy;
    float rr = length(q) / uGeo.z;
    vec2 q2 = q * (0.72 + 0.55 * rr * rr);
    uv = (vec2(uAB.x, uAB.y) + uGeo.xy + q2) / uTile;
    fade = 1.0 - 0.45 * smoothstep(0.4, 1.3, rr);
  }
}

vec4 tap(vec2 uv, vec2 gx, vec2 gy){ return textureGrad(uTex, uv, gx, gy); }

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv; float f;
  mapAt(p, uv, f);
  // Gradients without the wrap seam: compare with a half-turn shifted copy.
  vec2 uv2 = vec2(fract(uv.x + 0.5), uv.y);
  vec2 g1x = dFdx(uv), g1y = dFdy(uv), g2x = dFdx(uv2), g2y = dFdy(uv2);
  vec2 gx = abs(g1x.x) <= abs(g2x.x) ? g1x : g2x;
  vec2 gy = abs(g1y.x) <= abs(g2y.x) ? g1y : g2y;
  // Very far rings / poles: clamp the footprint (keeps the tunnel centre calm).
  gx = clamp(gx, -0.05, 0.05); gy = clamp(gy, -0.05, 0.05);

  vec4 c = tap(uv, gx, gy);
  vec3 col;
  float a = c.a * f;
  if (dot(uSplit, uSplit) > 0.0001) {
    vec2 uvR, uvB; float fR, fB;
    mapAt(p - uSplit, uvR, fR);
    mapAt(p + uSplit, uvB, fB);
    vec4 cR = tap(uvR, gx, gy), cB = tap(uvB, gx, gy);
    col = vec3(mix(uBg.r, cR.r, cR.a * fR), mix(uBg.g, c.g, a), mix(uBg.b, cB.b, cB.a * fB));
  } else {
    col = mix(uBg, c.rgb, a);
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
  }
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link')
  const u = (n: string) => gl.getUniformLocation(p, n)
  return { p, u: { tex: u('uTex'), res: u('uRes'), mode: u('uMode'), ab: u('uAB'), geo: u('uGeo'), split: u('uSplit'), tile: u('uTile'), bg: u('uBg') } }
}

export function createOrb(canvas: HTMLCanvasElement, items: FeedItem[], small: boolean, onChange: () => void) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' })
  if (!gl || gl.isContextLost()) return null
  let prog: ReturnType<typeof compile>
  try { prog = compile(gl) } catch { return null }

  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  // ── atlas: one tile of the mosaic ──
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
  const AW = Math.min(maxTex, small ? 2048 : 3072)
  const unit = AW / TILE.cols
  const AH = Math.round(TILE.rows * unit)
  const gutter = Math.max(4, Math.round(unit * 0.12))
  const levels = Math.floor(Math.log2(Math.max(AW, AH))) + 1
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, AW, AH)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  const ext = gl.getExtension('EXT_texture_filter_anisotropic')
  if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))

  const L = makeLayout(items, 1680)
  const jobs = TILE.slots.map((sl, s) => {
    const x = Math.round(sl.x * unit), y = Math.round(sl.y * unit)
    const w = Math.round(sl.w * unit) - gutter, h = Math.round(sl.h * unit) - gutter
    const it = items[L.piece(0, s)]
    return { x, y, w, h, it, src: Math.max(w, h) > 620 ? it.src : `/feed/t/${it.id}.webp` }
  })
  // Biggest first: they carry the look.
  jobs.sort((a, b) => b.w * b.h - a.w * a.h)
  const scratch = document.createElement('canvas')
  const sctx = scratch.getContext('2d')!
  let next = 0, inflight = 0, dead = false, mipDirty = false, lastMip = 0, loaded = 0
  const pump = () => {
    while (!dead && inflight < 4 && next < jobs.length) {
      const j = jobs[next++]
      inflight++
      const im = new Image()
      im.decoding = 'async'
      im.src = j.src
      im.decode().then(() => {
        if (dead) return
        scratch.width = j.w; scratch.height = j.h
        const [u0, v0, us, vs] = coverUv(im.naturalWidth, im.naturalHeight, j.w, j.h)
        sctx.drawImage(im, u0 * im.naturalWidth, v0 * im.naturalHeight, us * im.naturalWidth, vs * im.naturalHeight, 0, 0, j.w, j.h)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texSubImage2D(gl.TEXTURE_2D, 0, j.x, j.y, gl.RGBA, gl.UNSIGNED_BYTE, scratch)
        mipDirty = true
        loaded++
        onChange()
      }, () => {}).finally(() => { inflight--; pump() })
    }
  }
  pump()

  let W = 1, H = 1, dpr = 1
  return {
    resize(w: number, h: number, d: number) {
      W = w; H = h; dpr = d
      canvas.width = Math.round(w * d); canvas.height = Math.round(h * d)
    },
    tilePx: () => [TILE.cols * unit, TILE.rows * unit] as const,
    draw(f: OrbFrame) {
      const now = performance.now()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      if (mipDirty && (now - lastMip > 180 || loaded === jobs.length)) { gl.generateMipmap(gl.TEXTURE_2D); mipDirty = false; lastMip = now }
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.useProgram(prog.p)
      gl.uniform1i(prog.u.tex, 0)
      gl.uniform2f(prog.u.res, canvas.width, canvas.height)
      gl.uniform1i(prog.u.mode, MODE_ID[f.mode])
      const k = f.mode === 'lens' ? dpr : 1 // lens camera comes in CSS px
      gl.uniform2f(prog.u.ab, f.a * k, f.b * k)
      gl.uniform3f(prog.u.geo, f.cx * dpr, f.cy * dpr, f.r * dpr)
      gl.uniform2f(prog.u.split, f.split[0] * dpr, f.split[1] * dpr)
      // Lens: one tile ≈ 1.6 screens wide at 1680, in device px.
      const tw = Math.max(W, 900) * 1.6 * dpr
      gl.uniform2f(prog.u.tile, tw, tw * (AH / AW))
      gl.uniform3fv(prog.u.bg, f.bg)
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    pending: () => mipDirty || loaded < jobs.length,
    destroy() {
      dead = true
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(prog.p)
    },
  }
}

export type Orb = NonNullable<ReturnType<typeof createOrb>>
