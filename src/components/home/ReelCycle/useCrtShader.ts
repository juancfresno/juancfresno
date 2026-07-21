'use client'

import { useEffect, useRef } from 'react'

// ─── Fullscreen-triangle vertex shader — standard trick to cover the
// viewport with 3 vertices instead of a quad, no index buffer needed. ──────
const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// ─── CRT/VHS fragment shader ──────────────────────────────────────────────
// - Barrel (pincushion) warp: pushes UVs outward from center, quadratically
//   with distance. Anything that lands outside 0-1 after the warp is
//   discarded (transparent), which is what actually draws the curved
//   silhouette — the rectangle's edges bow inward like an old CRT tube.
// - Row jitter: each horizontal texel row gets a small constant-per-row
//   horizontal offset (hashed from the row index, not from time — so it's
//   static per image, no flicker), scaled up sharply near the top/bottom
//   edges to read as VHS tracking breakup concentrated at the curve.
// - Chromatic aberration: R/B sampled at a small offset from G, growing
//   with distance from center.
// - Scanlines + grain + a mild vignette + slight desaturation for the
//   muted, washed-out read.
const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
varying vec2 v_uv;

float hash(float n) {
  return fract(sin(n * 12.9898) * 43758.5453);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 centered = v_uv - 0.5;
  float dist = length(centered);

  // Barrel warp
  float barrel = 0.30;
  vec2 warped = centered * (1.0 + barrel * dist * dist);
  vec2 uv = warped + 0.5;

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    discard;
  }

  // Row jitter — static per row (hashed from row id), concentrated at
  // the top/bottom edges via edgeFactor
  float edgeFactor = pow(clamp(abs(centered.y) * 2.0, 0.0, 1.0), 3.0);
  float rowId = floor(uv.y * 220.0);
  float jitter = (hash(rowId) - 0.5) * 0.05 * edgeFactor;
  uv.x = clamp(uv.x + jitter, 0.0, 1.0);

  // Chromatic aberration, growing toward the edges
  float ab = 0.004 + 0.01 * dist;
  float r = texture2D(u_texture, clamp(uv + vec2(ab, 0.0), 0.0, 1.0)).r;
  float g = texture2D(u_texture, uv).g;
  float b = texture2D(u_texture, clamp(uv - vec2(ab, 0.0), 0.0, 1.0)).b;
  vec3 color = vec3(r, g, b);

  // Scanlines — follow the warped uv so they curve with the content
  float scan = sin(uv.y * u_resolution.y * 0.9) * 0.05;
  color -= scan;

  // Static grain
  float grain = (hash2(gl_FragCoord.xy) - 0.5) * 0.05;
  color += grain;

  // Slight desaturation — muted, washed-out look
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, vec3(gray), 0.18);

  // Vignette
  float vig = smoothstep(0.85, 0.3, dist);
  color *= mix(0.55, 1.0, vig);

  gl_FragColor = vec4(color, 1.0);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Failed to create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error: ${log}`)
  }
  return shader
}

// ─── useCrtShader — renders `imageSrc` into `canvasRef` through the CRT
// fragment shader above. Static per image: redraws once when the image
// (or the canvas size) changes, no continuous animation loop. ─────────────
export function useCrtShader(canvasRef: React.RefObject<HTMLCanvasElement | null>, imageSrc: string) {
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const textureRef = useRef<WebGLTexture | null>(null)
  const resolutionLocRef = useRef<WebGLUniformLocation | null>(null)
  const drawRef = useRef<() => void>(() => {})

  // One-time setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true })
    if (!gl) return
    glRef.current = gl

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('CRT shader link error:', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    // Fullscreen triangle
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const positionLoc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    textureRef.current = texture

    resolutionLocRef.current = gl.getUniformLocation(program, 'u_resolution')
    const textureLoc = gl.getUniformLocation(program, 'u_texture')
    gl.uniform1i(textureLoc, 0)
    gl.activeTexture(gl.TEXTURE0)

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(parent.clientWidth * dpr)
      const h = Math.round(parent.clientHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
        if (resolutionLocRef.current) gl.uniform2f(resolutionLocRef.current, w, h)
      }
      drawRef.current()
    }

    drawRef.current = () => {
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement as Element)

    return () => {
      ro.disconnect()
      gl.deleteTexture(texture)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload the texture whenever the image changes, then redraw once (static)
  useEffect(() => {
    const gl = glRef.current
    const texture = textureRef.current
    if (!gl || !texture || !imageSrc) return

    let cancelled = false
    const img = new window.Image()
    img.src = imageSrc
    img.onload = () => {
      if (cancelled) return
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      drawRef.current()
    }
    return () => {
      cancelled = true
    }
  }, [imageSrc])
}
