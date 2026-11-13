// @ts-nocheck
/* FLOPPY core: the procedural 3.5" disk (geometry, textures, label, materials).
   Ported from public/lab/floppy/index.html (the standalone Lab demo, spec in SPEC.md there);
   keep both in step when the object changes. Units: 1 = 1 mm. */
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

const INK = '#10100E', PEARL = '#FCFCF7', BLUE = '#003DFF';
const TAU = Math.PI * 2, HALF = Math.PI / 2;


// ───────────────────────────────────────────── 2D polygon helpers
const pt = (x, y, s = 1) => ({ x, y, s }); // s scales the bevel at that vertex
function arcPts(cx, cy, r, a0, a1, n, s = 1) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push(pt(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s)); }
  return out;
}
function rrect(x0, y0, x1, y1, r = 0, s = 1, n = 4) {
  if (r <= 0) return [pt(x0, y0, s), pt(x1, y0, s), pt(x1, y1, s), pt(x0, y1, s)];
  return [
    ...arcPts(x0 + r, y0 + r, r, 2 * HALF, 3 * HALF, n, s), ...arcPts(x1 - r, y0 + r, r, 3 * HALF, 4 * HALF, n, s),
    ...arcPts(x1 - r, y1 - r, r, 0, HALF, n, s), ...arcPts(x0 + r, y1 - r, r, HALF, 2 * HALF, n, s),
  ];
}
const circle = (cx, cy, r, n = 64, s = 1) => arcPts(cx, cy, r, 0, TAU, n, s).slice(0, n);
const moved = (pts, dx, dy, rot = 0) => pts.map(p => {
  const c = Math.cos(rot), q = Math.sin(rot);
  return pt(p.x * c - p.y * q + dx, p.x * q + p.y * c + dy, p.s);
});
function clean(pts) { // drop duplicates, force counter-clockwise
  const out = [];
  for (const p of pts) { const l = out[out.length - 1]; if (!l || Math.hypot(p.x - l.x, p.y - l.y) > 1e-5) out.push(p); }
  while (out.length > 1 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) < 1e-5) out.pop();
  let a = 0;
  for (let i = 0; i < out.length; i++) { const p = out[i], q = out[(i + 1) % out.length]; a += p.x * q.y - q.x * p.y; }
  return a < 0 ? out.reverse() : out;
}
function offsetPoly(pts, d) { // d > 0 moves a CCW polygon inwards
  if (!d) return pts;
  const n = pts.length, out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n];
    let e1x = b.x - a.x, e1y = b.y - a.y, e2x = c.x - b.x, e2y = c.y - b.y;
    const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1;
    e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2;
    let mx = -e1y - e2y, my = e1x + e2x;
    const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    const k = d * b.s / Math.max(0.35, mx * -e1y + my * e1x);
    out[i] = { x: b.x + mx * k, y: b.y + my * k, s: b.s };
  }
  return out;
}

// ───────────────────────────────────────────── mesh builder (auto winding, material groups)
class MeshBuilder {
  constructor() { this.g = [0, 1, 2, 3].map(() => ({ p: [], n: [], u: [] })); }
  tri(gi, a, b, c) {
    const ux = b.p[0] - a.p[0], uy = b.p[1] - a.p[1], uz = b.p[2] - a.p[2];
    const vx = c.p[0] - a.p[0], vy = c.p[1] - a.p[1], vz = c.p[2] - a.p[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * nx + ny * ny + nz * nz < 1e-14) return;
    const d = nx * (a.n[0] + b.n[0] + c.n[0]) + ny * (a.n[1] + b.n[1] + c.n[1]) + nz * (a.n[2] + b.n[2] + c.n[2]);
    const g = this.g[gi];
    for (const v of d >= 0 ? [a, b, c] : [a, c, b]) { g.p.push(...v.p); g.n.push(...v.n); g.u.push(...v.u); }
  }
  quad(gi, a, b, c, d) { this.tri(gi, a, b, c); this.tri(gi, a, c, d); }
  build() {
    const p = [], n = [], u = [], geo = new THREE.BufferGeometry();
    let start = 0;
    this.g.forEach((g, i) => {
      if (!g.p.length) return;
      p.push(...g.p); n.push(...g.n); u.push(...g.u);
      geo.addGroup(start, g.p.length / 3, i); start += g.p.length / 3;
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
    return geo;
  }
}
const nrm3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/* A slab: outline + holes extruded from z0 to z1 with a bevel profile ("rings": [{ z, d }], d = inset).
   Groups: 0 outer wall · 1 top cap · 2 bottom cap · 3 hole walls. */
function slab({ outline, holes = [], z0, z1, rings, uvScale = 1 / 24, capUv, capTop = true, capBottom = false }) {
  const mb = new MeshBuilder();
  const O = clean(outline);
  const oR = rings || [{ z: z0, d: 0 }, { z: z1, d: 0 }];
  const hs = holes.map(h => (Array.isArray(h) ? { pts: h } : h)).map(h => ({
    pts: clean(h.pts),
    rings: h.bevel ? [{ z: z0, d: 0 }, { z: z1 - h.bevel, d: 0 }, { z: z1, d: h.bevel }] : [{ z: z0, d: 0 }, { z: z1, d: 0 }],
  }));
  wall(mb, O, oR, false, 0, uvScale);
  for (const h of hs) wall(mb, h.pts, h.rings, true, 3, uvScale);
  const capAt = (pick, dir, gi) => {
    const oRing = pick(oR), oc = offsetPoly(O, oRing.d), hp = hs.map(h => offsetPoly(h.pts, -pick(h.rings).d));
    const v2 = a => a.map(p => new THREE.Vector2(p.x, p.y));
    const faces = THREE.ShapeUtils.triangulateShape(v2(oc), hp.map(v2));
    const all = oc.concat(...hp);
    for (const f of faces) {
      const v = f.map(i => ({ p: [all[i].x, all[i].y, oRing.z], n: [0, 0, dir], u: capUv ? capUv(all[i].x, all[i].y) : [all[i].x * uvScale, all[i].y * uvScale] }));
      mb.tri(gi, v[0], v[1], v[2]);
    }
  };
  if (capTop) capAt(r => r[r.length - 1], 1, 1);
  if (capBottom) capAt(r => r[0], -1, 2);
  return mb.build();
}
function wall(mb, C, R, isHole, gi, uvS) {
  const n = C.length, sg = isHole ? -1 : 1;
  const rp = R.map(r => offsetPoly(C, sg * r.d));
  const en = [], arc = [0];
  for (let i = 0; i < n; i++) {
    const a = C[i], b = C[(i + 1) % n], l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ex = (b.x - a.x) / l, ey = (b.y - a.y) / l;
    en.push(isHole ? [-ey, ex] : [ey, -ex]); arc.push(arc[i] + l);
  }
  const vn = []; // smoothed 2D normal where the contour turns gently, null on hard corners
  for (let i = 0; i < n; i++) {
    const p = en[(i + n - 1) % n], q = en[i];
    if (p[0] * q[0] + p[1] * q[1] > 0.8) { const l = Math.hypot(p[0] + q[0], p[1] + q[1]); vn.push([(p[0] + q[0]) / l, (p[1] + q[1]) / l]); } else vn.push(null);
  }
  const sn = []; // profile direction per ring segment: [horizontal weight, z weight]
  for (let k = 0; k < R.length - 1; k++) { const dz = R[k + 1].z - R[k].z, dd = R[k + 1].d - R[k].d, l = Math.hypot(dz, dd) || 1; sn.push([dz / l, dd / l]); }
  const ringN = (k, seg) => { // smooth along the bevel, hard where the profile breaks
    const other = seg === k ? k - 1 : k;
    if (other < 0 || other >= sn.length) return sn[seg];
    const a = sn[seg], b = sn[other];
    if (a[0] * b[0] + a[1] * b[1] < 0.72) return a;
    const l = Math.hypot(a[0] + b[0], a[1] + b[1]); return [(a[0] + b[0]) / l, (a[1] + b[1]) / l];
  };
  for (let k = 0; k < R.length - 1; k++) {
    const nb = ringN(k, k), nt = ringN(k + 1, k);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, nA = vn[i] || en[i], nB = vn[j] || en[i];
      const V = (p, z, n2, pr, u) => ({ p: [p.x, p.y, z], n: nrm3([n2[0] * pr[0], n2[1] * pr[0], pr[1]]), u: [u * uvS, z * uvS] });
      mb.quad(gi,
        V(rp[k][i], R[k].z, nA, nb, arc[i]), V(rp[k][j], R[k].z, nB, nb, arc[i + 1]),
        V(rp[k + 1][j], R[k + 1].z, nB, nt, arc[i + 1]), V(rp[k + 1][i], R[k + 1].z, nA, nt, arc[i]));
    }
  }
}

// ───────────────────────────────────────────── procedural textures
function rng(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s ^= s >>> 16) >>> 0) / 4294967296); }
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(canvas, { srgb = false, repeat = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.anisotropy = aniso;
  return t;
}
function grainNormalCanvas(size = 256, seed = 7) { // moulded ABS texture: two octaves of noise as a tangent-space normal map
  const r = rng(seed), h = new Float32Array(size * size), low = new Float32Array((size / 4) ** 2), ls = size / 4;
  for (let i = 0; i < low.length; i++) low[i] = r();
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = x / 4, fy = y / 4, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const L = (a, b) => low[((b + ls) % ls) * ls + ((a + ls) % ls)];
    const lo = (L(x0, y0) * (1 - tx) + L(x0 + 1, y0) * tx) * (1 - ty) + (L(x0, y0 + 1) * (1 - tx) + L(x0 + 1, y0 + 1) * tx) * ty;
    h[y * size + x] = lo * 0.3 + r() * 0.7;
  }
  const c = makeCanvas(size, size), ctx = c.getContext('2d'), img = ctx.createImageData(size, size);
  const H = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = nrm3([(H(x - 1, y) - H(x + 1, y)) * 1.6, (H(x, y - 1) - H(x, y + 1)) * 1.6, 1]), i = (y * size + x) * 4;
    img.data[i] = (v[0] * 0.5 + 0.5) * 255; img.data[i + 1] = (v[1] * 0.5 + 0.5) * 255; img.data[i + 2] = (v[2] * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return c;
}
function brushedCanvas(size = 512, seed = 3) { // horizontal brushing, used as roughness
  const r = rng(seed), c = makeCanvas(size, size), ctx = c.getContext('2d');
  ctx.fillStyle = '#b4b4b4'; ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y++) { const v = 150 + r() * 70; ctx.fillStyle = `rgba(${v},${v},${v},.55)`; ctx.fillRect(0, y, size, 1); }
  for (let i = 0; i < 2600; i++) {
    const y = r() * size, x = r() * size, len = 40 + r() * 420, light = r() > 0.5;
    ctx.fillStyle = light ? `rgba(255,255,255,${0.04 + r() * 0.16})` : `rgba(40,40,40,${0.04 + r() * 0.16})`;
    const hgt = r() > 0.85 ? 2 : 1;
    ctx.fillRect(x, y, len, hgt); ctx.fillRect(x - size, y, len, hgt);
  }
  return c;
}
function ringsCanvas(size = 512, seed = 11) { // lathe-turned steel for the hub (planar, concentric)
  const r = rng(seed), c = makeCanvas(size, size), ctx = c.getContext('2d');
  ctx.fillStyle = '#b8b8b8'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 230; i++) {
    const v = 120 + r() * 120; ctx.strokeStyle = `rgba(${v},${v},${v},.5)`; ctx.lineWidth = 0.6 + r() * 1.4;
    ctx.beginPath(); ctx.arc(size / 2, size / 2, 4 + (i / 230) * size * 0.5, 0, TAU); ctx.stroke();
  }
  return c;
}
function mylarCanvas(w = 1024, h = 256, seed = 23) { // polar: u = angle, v = radius. Fine tracks plus soft angular streaks
  const r = rng(seed), c = makeCanvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y++) { const v = 110 + r() * 90; ctx.fillStyle = `rgba(${v},${v},${v},.6)`; ctx.fillRect(0, y, w, 1); }
  for (let i = 0; i < 26; i++) { // angular streaks: these are what make the spin readable
    const x = r() * w, ww = 8 + r() * 90, light = r() > 0.45, a = 0.05 + r() * 0.16;
    const g = ctx.createLinearGradient(x - ww, 0, x + ww, 0), col = light ? '255,255,255' : '0,0,0';
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; const y0 = r() * h * 0.5, hh = h * (0.3 + r() * 0.7);
    for (const ox of [0, -w, w]) ctx.fillRect(x - ww + ox, y0, ww * 2, hh);
  }
  return c;
}

// ───────────────────────────────────────────── label (CanvasTexture drawn from data)
const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const GLYPHS = {
  '001': ['........', '.######.', '#......#', '#.####.#', '#.####.#', '#......#', '.######.', '........'],
};
function glyphFor(n) { // one tiny pixel glyph per project; unknown numbers get a symmetric hash glyph
  if (GLYPHS[n]) return GLYPHS[n];
  const r = rng([...String(n)].reduce((a, c) => a * 31 + c.charCodeAt(0), 17)), rows = [];
  for (let y = 0; y < 8; y++) { let h = ''; for (let x = 0; x < 4; x++) h += r() > 0.5 ? '#' : '.'; rows.push(h + [...h].reverse().join('')); }
  return rows;
}
function drawLabel(data, opts = {}) {
  const W = 2048, H = 1700, M = 96, G = 32, COLS = 24, colW = (W - 2 * M - (COLS - 1) * G) / COLS;
  const colX = i => M + i * (colW + G), R = W - M;
  const total = opts.total || '005', up = s => String(s).toLocaleUpperCase('es');
  const c = makeCanvas(W, H), ctx = c.getContext('2d');
  const INK_MID = 'rgba(16,16,14,.56)', INK_LOW = 'rgba(16,16,14,.26)';
  ctx.fillStyle = PEARL; ctx.fillRect(0, 0, W, H);

  const MONO = '"Sometype Mono", ui-monospace, Menlo, monospace', SANS = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
  const mono = (text, x, y, size, { align = 'left', color = INK, track = 0.04 } = {}) => {
    ctx.font = `500 ${size}px ${MONO}`; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const chars = [...text], adv = ctx.measureText('0').width + size * track, tw = adv * chars.length - size * track;
    const x0 = align === 'right' ? x - tw : align === 'center' ? x - tw / 2 : x;
    chars.forEach((ch, i) => ctx.fillText(ch, x0 + i * adv, y));
    return tw;
  };
  const rule = (x0, x1, y, color = INK, w = 3) => { ctx.fillStyle = color; ctx.fillRect(x0, y - w / 2, x1 - x0, w); };
  const MICRO = 38;

  // register crop marks
  ctx.fillStyle = INK_MID;
  for (const [x, y, sx, sy] of [[M, M, -1, -1], [R, M, 1, -1], [M, H - M, -1, 1], [R, H - M, 1, 1]]) {
    ctx.fillRect(Math.min(x + sx * 18, x + sx * 52), y - 1.5, 34, 3); ctx.fillRect(x - 1.5, Math.min(y + sy * 18, y + sy * 52), 3, 34);
  }

  // top band
  mono('Fresno© Lab'.toUpperCase(), M, 160, MICRO);
  mono(`LAB ${data.n} · ${up(data.title)} · ${data.year}`, colX(8), 160, MICRO);
  mono('3.5 IN · HD', R, 160, MICRO, { align: 'right', color: INK_MID });
  rule(M, R, 196);
  for (let i = 0; i < COLS; i++) { ctx.fillStyle = INK; ctx.fillRect(colX(i) - 1.5, 196, 3, 16); ctx.fillStyle = INK_LOW; ctx.fillRect(colX(i) + colW - 1, 196, 2, 9); }

  // big number
  ctx.font = `500 640px ${MONO}`; ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const adv = ctx.measureText('0').width - 26;
  [...data.n].forEach((ch, i) => ctx.fillText(ch, M - 30 + i * adv, 720));

  // spec table, right block
  const tx = colX(16), rows = [['No.', `${data.n} / ${total}`], ['Kind', up(data.kind)], ['EN', up(data.en || data.title)], ['Year', data.year], ['Format', '1.44 MB']];
  rows.forEach(([k, v], i) => {
    const y = 318 + i * 86;
    mono(up(k), tx, y, MICRO, { color: INK_MID }); mono(v, R, y, MICRO, { align: 'right' });
    rule(tx, R, y + 30, INK_LOW, 2);
  });

  // title, shrunk to fit
  let size = 196; ctx.textAlign = 'left';
  const setTitle = () => { ctx.font = `700 ${size}px ${SANS}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${-size * 0.025}px`; };
  setTitle(); while (ctx.measureText(data.title).width > R - M && size > 80) { size -= 6; setTitle(); }
  ctx.fillStyle = INK; ctx.fillText(data.title, M - size * 0.045, 960);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  // ruled field ("handwritten-looking", empty by default)
  mono('{ Notes ↘'.toUpperCase(), M, 1090, MICRO, { color: INK_MID });
  const fx1 = colX(14) + colW;
  for (let i = 0; i < 3; i++) rule(M, fx1, 1178 + i * 88, INK_LOW, 2);
  if (opts.note) { ctx.font = `400 74px "Permanent Marker", "Marker Felt", cursive`; ctx.fillStyle = INK; ctx.fillText(opts.note, M + 8, 1166); }

  // pixel glyph
  const glyph = glyphFor(data.n), cell = 22, gx = R - cell * 8, gy = 1094;
  ctx.fillStyle = INK;
  glyph.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') ctx.fillRect(gx + x * cell, gy + y * cell, cell, cell); }));
  mono(`GLYPH ${data.n}`, gx - 28, gy + cell * 8 - 2, MICRO, { align: 'right', color: INK_MID });

  // Bayer dither strip: the single accent
  const bx = tx, bw = R - tx, bc = 9, bcols = Math.floor(bw / bc);
  ctx.fillStyle = BLUE;
  for (let x = 0; x < bcols; x++) for (let y = 0; y < 4; y++) {
    if (1 - x / (bcols - 1) > (BAYER4[y][x % 4] + 0.5) / 16) ctx.fillRect(bx + x * bc, 1400 + y * bc, bc, bc);
  }

  // bottom band
  rule(M, R, 1476);
  for (let i = 0; i < COLS; i++) { ctx.fillStyle = INK; ctx.fillRect(colX(i) - 1.5, 1460, 3, 16); }
  mono('{ LAB ↘', M, 1560, MICRO);
  mono('JUANCFRESNO.COM/LAB', colX(8), 1560, MICRO, { color: INK_MID });
  mono('SIDE A', R, 1560, MICRO, { align: 'right' });

  // paper: faint fibre noise
  const r = rng(91), noise = makeCanvas(256, 256), nctx = noise.getContext('2d'), img = nctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  nctx.putImageData(img, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.05; ctx.fillStyle = ctx.createPattern(noise, 'repeat'); ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(60,56,44,.05)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 520; i++) {
    const x = r() * W, y = r() * H, a = r() * TAU, l = 14 + r() * 46;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 14, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 14, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

// ───────────────────────────────────────────── FRESNO© wordmark (234 × 28), from the brand SVG
const LOGO = [
  'M223.381 15.7711C217.072 15.7711 213.231 12.7787 213.231 7.86535C213.231 2.95204 217.072 0 223.381 0C229.71 0 233.511 2.95204 233.511 7.86535C233.511 12.7787 229.71 15.7711 223.381 15.7711ZM223.381 13.7492C228.638 13.7492 231.125 11.6059 231.125 7.84513C231.125 4.12476 228.638 1.9815 223.381 1.9815C218.164 1.9815 215.617 4.12476 215.617 7.84513C215.617 11.6059 218.164 13.7492 223.381 13.7492ZM223.442 12.7382C219.721 12.7382 216.992 11.1207 216.992 7.86535C216.992 4.65047 219.721 2.99247 223.442 2.99247C227.02 2.99247 229.427 4.42805 229.77 6.91504H226.899C226.414 5.88385 225.342 5.11551 223.462 5.11551C221.137 5.11551 219.903 6.3489 219.903 7.86535C219.903 9.42225 221.137 10.6354 223.462 10.6354C225.302 10.6354 226.434 9.90751 226.899 8.8561H229.77C229.447 11.2824 227.02 12.7382 223.442 12.7382Z',
  'M189.041 28C176.979 28 169.836 23.0462 169.836 14V13.9641C169.836 4.88205 176.979 0 189.041 0C201.102 0 208.246 4.88205 208.246 13.9641V14C208.246 23.0462 201.102 28 189.041 28ZM189.041 21.359C194.677 21.359 198.482 18.6308 198.482 14V13.9641C198.482 9.29744 194.677 6.60513 189.041 6.60513C183.405 6.60513 179.6 9.15385 179.6 13.9641V14C179.6 18.7744 183.405 21.359 189.041 21.359Z',
  'M139.809 27.282H130.906V0.610229H140.922L158.153 17.0154L158.44 17.3384V0.610229H167.342V27.282H157.363L140.024 10.841L139.809 10.6256V27.282Z',
  'M112.67 28C101.183 28 96.6241 23.4051 96.4087 18.1282H105.598C105.742 20.5333 107.465 21.7897 112.742 21.7897C117.229 21.7897 118.845 20.9282 118.845 19.4564C118.845 18.2359 118.342 17.6615 111.557 16.9436C99.5318 15.7949 97.4497 12.4564 97.4497 8.07692C97.4497 3.94872 100.896 0 111.988 0C122.829 0 127.137 4.2 127.604 9.8H118.773C118.45 7.89744 117.122 6.17436 112.347 6.17436C108.327 6.17436 106.963 6.9641 106.963 8.25641C106.963 9.26154 107.25 10.1949 112.491 10.6974C126.886 12.0615 128.357 15.5795 128.357 19.2051C128.357 25.1641 122.973 28 112.67 28Z',
  'M95.7789 27.282H66.5225V0.610229H95.4199V7.14356H76.1789V10.7692H93.8763V16.5128H76.1789V20.7487H95.7789V27.282Z',
  'M40.3936 27.282H30.7372V0.610229H50.05C60.1013 0.610229 63.691 4.09228 63.691 8.75895C63.691 12.4923 61.25 15.0051 57.05 15.8307V15.8666C60.1372 16.6564 61.3936 17.6615 62.291 21.682L62.65 23.1538C63.0808 25.0923 63.4398 26.0256 63.9782 27.282H54.1064C53.7474 26.6 53.5321 25.882 53.0295 23.5846L52.6705 22.0051C52.3115 20.3179 50.9115 19.5282 46.9987 19.5282H40.3936V27.282ZM40.3936 7.14356V13.3538H49.4756C52.4551 13.3538 54.0705 12.1333 54.0705 10.0513C54.0705 8.11279 52.4551 7.14356 49.4756 7.14356H40.3936Z',
  'M9.65641 27.282H0V0.610229H28.6821V7.17946H9.65641V11.4872H26.959V17.8769H9.65641V27.282Z',
];
function logoShapes(width, cx, cy) { // outlines in mm (width = its length), for moulding the wordmark into the shell
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 234 28">${LOGO.map(d => `<path d="${d}"/>`).join('')}</svg>`;
  const k = width / 234, map = v => pt(cx + (v.y - 14) * k, cy + (v.x - 117) * k, 0), out = []; // vertical, reads bottom to top
  for (const p of new SVGLoader().parse(svg).paths) for (const sh of SVGLoader.createShapes(p)) {
    const e = sh.extractPoints(5); out.push({ outer: e.shape.map(map), holes: e.holes.map(h => h.map(map)) });
  }
  return out;
}
const inPoly = (p, poly) => { let r = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) r = !r; } return r; };

// ───────────────────────────────────────────── the object
/* Layout, front view, shutter up (x right, y up, z towards the label side):
   shell 90 × 94 × 3.3, chamfer top right, head window on the centre line, label on the lower part.
   The back half is built in "back view" coordinates and turned 180° around Y. */
const SHELL = { hw: 45, hh: 47, t: 1.65, corner: 1.2, chamfer: 3.5, bevel: 0.35, seam: 0.1 };
const HUB_Y = 2;                       // media centre
const NOTCH = { x0: -28, x1: 31, y: 17.5 }; // shutter recess (front view)
const SHUT = { x0: -14, x1: 30, y0: 17.9, travel: 12.5, t: 0.2 };
const LABEL = { x0: -35, x1: 35, y0: -45, y1: 13.1 };
const TAB = { x: 40.3, yOn: -41.6, yOff: -36.4 };

function shellOutline(notch, mirror) {
  const { hw, hh, corner: r, chamfer: ch } = SHELL, p = [];
  p.push(...arcPts(-hw + r, -hh + r, r, 2 * HALF, 3 * HALF, 5), ...arcPts(hw - r, -hh + r, r, 3 * HALF, 4 * HALF, 5));
  p.push(pt(hw, hh - ch), pt(hw - ch, hh));
  if (notch) {
    const { x0, x1, y, r: nr = 0, s = 0, sm = 0 } = notch;
    p.push(pt(x1 + 1.2, hh), pt(x1, hh, sm));
    if (nr > 0) p.push(...arcPts(x1 - nr, y + nr, nr, 0, -HALF, 4, s), ...arcPts(x0 + nr, y + nr, nr, -HALF, -2 * HALF, 4, s));
    else p.push(pt(x1, y, s), pt(x0, y, s));
    p.push(pt(x0, hh, sm), pt(x0 - 1.2, hh));
  }
  p.push(...arcPts(-hw + r, hh - r, r, HALF, 2 * HALF, 5));
  return mirror ? p.map(q => pt(-q.x, q.y, q.s)).reverse() : p;
}
function outerInset(z) { // shell edge profile: seam chamfer at the bottom, rounded edge at the top
  const { t, bevel: b, seam } = SHELL;
  if (z < seam) return seam - z;
  if (z > t - b) { const k = z - (t - b); return b - Math.sqrt(Math.max(0, b * b - k * k)); }
  return 0;
}
function outerRings(z0, z1) {
  const { t, bevel: b, seam } = SHELL, zs = new Set([z0, z1]);
  for (const k of [seam, t - b]) if (k > z0 + 1e-4 && k < z1 - 1e-4) zs.add(k);
  for (let i = 1; i <= 7; i++) { const z = t - b + b * Math.sin(i / 7 * HALF); if (z > z0 + 1e-4 && z < z1 - 1e-4) zs.add(z); }
  return [...zs].sort((a, b2) => a - b2).map(z => ({ z, d: outerInset(z) }));
}

export function createFloppy(data, options = {}) {
  const maxAniso = options.maxAnisotropy || 8;
  const disposables = [], sh = options.shared || {}, LS = options.labelScale || 1, LW = Math.round(2048 * LS), LH = Math.round(1700 * LS);
  const fitLabel = c => { if (LS === 1) return c; const o = makeCanvas(LW, LH), x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, LW, LH); return o; };
  const keep = o => (disposables.push(o), o);

  // ── textures
  const grainN = sh.grainN || (sh.grainN = keep(tex(grainNormalCanvas(), { repeat: [3, 3], aniso: maxAniso })));
  const brushed = sh.brushed || (sh.brushed = keep(tex(brushedCanvas(), { repeat: [1, 5], aniso: maxAniso })));
  const ringsT = sh.ringsT || (sh.ringsT = keep(tex(ringsCanvas(), { aniso: maxAniso })));
  if (!sh.mylarR) { const mylarC = mylarCanvas(); sh.mylarR = keep(tex(mylarC, { aniso: maxAniso })); sh.mylarA = keep(tex(mylarC, { srgb: true, aniso: maxAniso })); }
  const mylarR = sh.mylarR, mylarA = sh.mylarA;
  const labelT = keep(new THREE.CanvasTexture(fitLabel(drawLabel(data, options.label))));
  labelT.colorSpace = THREE.SRGBColorSpace; labelT.anisotropy = maxAniso; labelT.generateMipmaps = true; labelT.minFilter = THREE.LinearMipmapLinearFilter;

  // ── materials ("Fresno ink")
  const fresnel = (mat, strength) => { // soft edge lift at grazing angles
    mat.onBeforeCompile = sh => {
      sh.uniforms.uFresnel = { value: strength };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uFresnel;')
        .replace('#include <opaque_fragment>', 'outgoingLight += vec3( 0.60, 0.64, 0.72 ) * uFresnel * pow( 1.0 - saturate( dot( normalize( vViewPosition ), normal ) ), 5.0 );\n#include <opaque_fragment>');
    };
    return mat;
  };
  const shellC = options.shell || INK, accentC = options.accent || BLUE, innerC = new THREE.Color(shellC).multiplyScalar(0.5);
  // "90s translucent": tinted polycarbonate. The tint comes from attenuation through the wall,
  // so the disk, the hub and the spring show through.
  const glass = (roughness, extra = {}) => new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 0.94, thickness: 1.6, ior: 1.45, roughness, attenuationColor: new THREE.Color(shellC), attenuationDistance: 1.5, envMapIntensity: 1.15, ...extra });
  const M = {
    absTex: options.translucent ? glass(0.2, { normalMap: grainN, normalScale: new THREE.Vector2(0.08, 0.08) }) : fresnel(new THREE.MeshPhysicalMaterial({ color: shellC, roughness: 0.6, normalMap: grainN, normalScale: new THREE.Vector2(0.2, 0.2) }), 0.07),
    absSmooth: options.translucent ? glass(0.1) : fresnel(new THREE.MeshPhysicalMaterial({ color: shellC, roughness: 0.42 }), 0.07),
    absInner: options.translucent ? glass(0.16) : new THREE.MeshPhysicalMaterial({ color: innerC, roughness: 0.66, specularIntensity: 0.45, envMapIntensity: 0.3 }),
    metal: new THREE.MeshPhysicalMaterial({ color: '#dcdad3', metalness: 1, roughness: 0.36, roughnessMap: brushed, anisotropy: 0.6, anisotropyRotation: HALF }),
    steel: new THREE.MeshPhysicalMaterial({ color: '#c6c6c2', metalness: 1, roughness: 0.4, roughnessMap: ringsT }),
    mylar: new THREE.MeshPhysicalMaterial({ color: '#4a3526', map: mylarA, metalness: 0.7, roughness: 0.46, roughnessMap: mylarR, anisotropy: 0.85, anisotropyRotation: HALF, side: THREE.DoubleSide }),
    blue: new THREE.MeshPhysicalMaterial({ color: accentC, roughness: 0.62, specularIntensity: 0.3 }),
    paper: new THREE.MeshStandardMaterial({ color: '#ffffff', map: labelT, roughness: 0.92 }),
    paperEdge: new THREE.MeshStandardMaterial({ color: PEARL, roughness: 0.95 }),
    dark: new THREE.MeshBasicMaterial({ color: '#050504' }),
  };
  Object.values(M).forEach(keep);
  const metalSide = keep(M.metal.clone()); metalSide.side = THREE.DoubleSide;

  const root = new THREE.Group(); root.name = 'floppy';
  const add = (parent, geo, mats) => { const m = new THREE.Mesh(keep(geo), mats); parent.add(m); return m; };
  const shellMats = top => [M.absSmooth, top, M.absSmooth, M.absInner];
  const steelAll = [M.steel, M.steel, M.steel, M.steel], metalAll = [M.metal, M.metal, M.metal, M.metal], blueAll = [M.blue, M.blue, M.blue, M.blue];
  const sq = (cx, cy, w, h, r = 0.3) => rrect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, r, 1, 3);
  const T = SHELL.t, Z = { cav: 0.45, floor: T - 0.35, rec: T - 0.15 };

  const CAV = circle(0, HUB_Y, 43.6, 96, 0);
  const WIN = () => rrect(-4.5, 20, 4.5, 43.5, 0.8, 0, 3);
  const half = ({ mirror, parent }) => {
    const core = shellOutline({ x0: NOTCH.x0, x1: NOTCH.x1, y: SHELL.hh - 0.25 }, mirror);
    const skin = shellOutline({ x0: NOTCH.x0, x1: NOTCH.x1, y: NOTCH.y, r: 0.8, s: 0.2, sm: 0.4 }, mirror);
    return (z0, z1, outline, holes, top, capTop = true) =>
      add(parent, slab({ outline: outline === 'core' ? core : skin, holes, z0, z1, rings: outerRings(z0, z1), capTop }), shellMats(top));
  };

  // ── front half
  const front = new THREE.Group(); root.add(front);
  {
    const L = half({ mirror: false, parent: front });
    const wp = () => sq(TAB.x, TAB.yOn, 3.5, 4), hd = () => sq(-TAB.x, TAB.yOn, 3.5, 4);
    const ax = -36.5, ay = 36.5; // moulded insertion arrow
    const arrow = () => [pt(ax - 1.05, ay - 4.3, 0), pt(ax + 1.05, ay - 4.3, 0), pt(ax + 1.05, ay - 0.2, 0), pt(ax + 3.1, ay - 0.2, 0), pt(ax, ay + 4.3, 0), pt(ax - 3.1, ay - 0.2, 0), pt(ax - 1.05, ay - 0.2, 0)];
    // FRESNO© moulded into the shell, vertical, right of the shutter. Counters stay up as islands
    const logo = sh.logo || (sh.logo = logoShapes(22, 38.2, 30.4));
    const nested = l => logo.some(o => o !== l && o.holes.some(h => inPoly(l.outer[0], h)));
    const marks = () => [arrow(), ...logo.filter(l => !nested(l)).map(l => l.outer.map(q => pt(q.x, q.y, 0)))];
    L(0, Z.cav, 'core', [CAV, wp(), hd()], M.absSmooth, false);
    L(Z.cav, Z.floor, 'core', [WIN(), wp(), hd()], M.absSmooth);
    L(Z.floor, Z.rec, 'skin', [wp(), hd(), ...marks()], M.absSmooth);
    L(Z.rec, T, 'skin', [{ pts: rrect(LABEL.x0 - 0.3, LABEL.y0 - 0.3, LABEL.x1 + 0.3, LABEL.y1 + 0.3, 1.4), bevel: 0.05 }, { pts: wp(), bevel: 0.08 }, { pts: hd(), bevel: 0.08 }, ...marks()], M.absTex);
    for (const l of logo) if (!nested(l)) for (const h of l.holes) {
      add(front, slab({ outline: h, holes: logo.filter(o => nested(o) && inPoly(o.outer[0], h)).map(o => o.outer), z0: Z.floor, z1: T }), shellMats(M.absTex));
    }
    // label
    const lw2 = LABEL.x1 - LABEL.x0, lh2 = LABEL.y1 - LABEL.y0;
    add(front, slab({
      outline: rrect(LABEL.x0, LABEL.y0, LABEL.x1, LABEL.y1, 1.1), z0: Z.rec, z1: Z.rec + 0.09,
      rings: [{ z: Z.rec, d: 0 }, { z: Z.rec + 0.06, d: 0 }, { z: Z.rec + 0.09, d: 0.03 }],
      capUv: (x, y) => [(x - LABEL.x0) / lw2, (y - LABEL.y0) / lh2],
    }), [M.paperEdge, M.paper, M.paperEdge, M.paperEdge]);
  }

  // ── back half (back-view coordinates, turned around Y)
  const back = new THREE.Group(); back.rotation.y = Math.PI; root.add(back);
  {
    const L = half({ mirror: true, parent: back });
    const hub = (b = 0) => ({ pts: circle(0, HUB_Y, 13.6, 72), bevel: b });
    const wp = () => sq(-TAB.x, TAB.yOn, 3.5, 4), hd = () => sq(TAB.x, TAB.yOn, 3.5, 4);
    const slot = () => rrect(-TAB.x - 2, -44.1, -TAB.x + 2, -34.1, 0.4, 1, 3);
    const loc = () => [circle(-40.3, 33.5, 1.5, 20), rrect(38.7, 31.8, 41.9, 35.2, 1.3, 1, 4)]; // drive locating holes
    L(0, Z.cav, 'core', [CAV, wp(), hd()], M.absSmooth, false);
    L(Z.cav, Z.floor, 'core', [WIN(), hub(), wp(), hd()], M.absSmooth);
    L(Z.floor, Z.rec, 'skin', [hub(), slot(), hd(), ...loc()], M.absSmooth);
    L(Z.rec, T, 'skin', [hub(0.14), { pts: slot(), bevel: 0.06 }, { pts: hd(), bevel: 0.08 }, ...loc().map(pts => ({ pts, bevel: 0.06 })),
      { pts: rrect(LABEL.x0 - 0.3, LABEL.y0 - 0.3, LABEL.x1 + 0.3, -29, 1.4), bevel: 0.05 }], M.absTex);
    // blue seat ring around the hub
    add(back, slab({ outline: circle(0, HUB_Y, 13.4, 72), holes: [circle(0, HUB_Y, 12.7, 72)], z0: 0.6, z1: 0.98 }), blueAll);
  }

  // ── write-protect tab (lives in the back half, also seen from the front through its hole)
  const tab = new THREE.Group(); tab.position.set(-TAB.x, TAB.yOn, 0); back.add(tab);
  add(tab, slab({ outline: rrect(-1.85, -2.3, 1.85, 2.3, 0.3), z0: -Z.floor, z1: Z.rec, rings: [{ z: -Z.floor, d: 0 }, { z: Z.rec - 0.12, d: 0 }, { z: Z.rec, d: 0.12 }], capBottom: true }), blueAll);
  add(tab, slab({ outline: rrect(-1.25, -0.4, 1.25, 0.4, 0.2), z0: Z.rec, z1: Z.rec + 0.13, rings: [{ z: Z.rec, d: 0 }, { z: Z.rec + 0.07, d: 0 }, { z: Z.rec + 0.13, d: 0.06 }] }), blueAll);

  // ── chamfer accent
  {
    const m = add(root, new THREE.BoxGeometry(3.1, 0.1, 2.2), M.blue);
    const c = SHELL.chamfer / 2, k = -0.03 / Math.SQRT2;
    m.position.set(SHELL.hw - c + k, SHELL.hh - c + k, 0); m.rotation.z = -Math.PI / 4;
  }

  // ── shutter: U clip with its own window, slides along x
  const shutter = new THREE.Group(); root.add(shutter);
  {
    const zf = Z.floor + 0.01, zt = zf + SHUT.t, yTop = 46.45, br = 0.5;
    const plate = (x0, x1, wx0, wx1) => slab({
      outline: [...arcPts(x0 + 0.4, SHUT.y0 + 0.4, 0.4, 2 * HALF, 3 * HALF, 3), ...arcPts(x1 - 0.4, SHUT.y0 + 0.4, 0.4, 3 * HALF, 4 * HALF, 3), pt(x1, yTop, 0), pt(x0, yTop, 0)],
      holes: [{ pts: rrect(wx0, 19.8, wx1, 43.7, 0.7, 1, 3), bevel: 0.04 }],
      z0: zf, z1: zt, rings: [{ z: zf, d: 0 }, { z: zt - 0.05, d: 0 }, { z: zt, d: 0.05 }], uvScale: 1 / 40,
    });
    add(shutter, plate(SHUT.x0, SHUT.x1, 7.8, 17.2), metalAll);
    const bp = new THREE.Group(); bp.rotation.y = Math.PI; shutter.add(bp);
    add(bp, plate(-SHUT.x1, -SHUT.x0, -17.2, -7.8), metalAll);
    // bridge over the shutter edge, with two small bends
    const prof = [], zi = zt - br;
    for (let i = 0; i <= 6; i++) { const a = i / 6 * HALF; prof.push({ y: yTop + br * Math.sin(a), z: zi + br * Math.cos(a), ny: Math.sin(a), nz: Math.cos(a) }); }
    for (let i = 6; i >= 0; i--) { const a = i / 6 * HALF; prof.push({ y: yTop + br * Math.sin(a), z: -zi - br * Math.cos(a), ny: Math.sin(a), nz: -Math.cos(a) }); }
    const mb = new MeshBuilder(); let len = 0;
    for (let i = 0; i < prof.length - 1; i++) {
      const a = prof[i], b = prof[i + 1], l = Math.hypot(b.y - a.y, b.z - a.z);
      const V = (x, q, v) => ({ p: [x, q.y, q.z], n: [0, q.ny, q.nz], u: [x / 40, v / 40] });
      mb.quad(0, V(SHUT.x0, a, len), V(SHUT.x1, a, len), V(SHUT.x1, b, len + l), V(SHUT.x0, b, len + l)); len += l;
    }
    add(shutter, mb.build(), [metalSide]);
  }

  // ── shutter spring: a small torsion spring in the corner, only seen through a translucent shell
  if (options.translucent) {
    class Coil extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { const a = t * TAU * 4.5; return o.set(Math.cos(a) * 1.5, Math.sin(a) * 1.5, (t - 0.5) * 1.5); } }
    const sp = add(root, new THREE.TubeGeometry(new Coil(), 120, 0.13, 6, false), M.steel); sp.position.set(-38.2, 43.2, 0);
    for (const [x1, y1, x2, y2] of [[-36.7, 43.2, -29, 45.6], [-38.2, 41.7, -38.6, 30]]) { // its two legs
      const len = Math.hypot(x2 - x1, y2 - y1), leg = add(root, new THREE.CylinderGeometry(0.13, 0.13, len, 6), M.steel);
      leg.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0); leg.rotation.z = Math.atan2(y2 - y1, x2 - x1) - HALF;
    }
  }

  // ── media: mylar disk + steel hub, spins around z
  const spin = new THREE.Group(); spin.position.set(0, HUB_Y, 0); root.add(spin);
  {
    const mb = new MeshBuilder(), seg = 128, r0 = 12.4, r1 = 43, rad = 6;
    for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU, ra = r0 + (r1 - r0) * j / rad, rb = r0 + (r1 - r0) * (j + 1) / rad;
      const V = (a, r, u) => ({ p: [Math.cos(a) * r, Math.sin(a) * r, 0], n: [0, 0, 1], u: [u, (r - r0) / (r1 - r0)] });
      mb.quad(0, V(a0, ra, i / seg), V(a1, ra, (i + 1) / seg), V(a1, rb, (i + 1) / seg), V(a0, rb, i / seg));
    }
    add(spin, mb.build(), [M.mylar]);
    const hubG = new THREE.Group(); hubG.rotation.y = Math.PI; spin.add(hubG); // back-view coordinates
    const pinSlot = moved(rrect(-1.3, -2.2, 1.3, 2.2, 0.4, 1, 3), 6.3, 1.4, 0.38);
    const ruv = (x, y) => [x / 26 + 0.5, y / 26 + 0.5];
    add(hubG, slab({ outline: circle(0, 0, 12.4, 72), holes: [{ pts: sq(0, 0, 4, 4, 0.5), bevel: 0.08 }, { pts: pinSlot, bevel: 0.08 }], z0: 0.95, z1: 1.2, capUv: ruv }), steelAll);
    add(hubG, slab({ outline: circle(0, 0, 12.4, 72), holes: [{ pts: circle(0, 0, 9.3, 64), bevel: 0.16 }], z0: 1.2, z1: 1.38, rings: [{ z: 1.2, d: 0 }, { z: 1.24, d: 0 }, { z: 1.38, d: 0.14 }], capUv: ruv }), steelAll);
    const blk = add(hubG, new THREE.CircleGeometry(12.2, 48), M.dark); blk.position.z = 0.9;
  }

  // ── state and motion
  const s = { open: 0, openV: 0, openTarget: 0, spinV: 0, protect: 0, protectTarget: 0 };
  const api = {
    group: root, data, state: s,
    bounds: new THREE.Box3(new THREE.Vector3(-SHELL.hw - 1, -SHELL.hh - 1, -2.6), new THREE.Vector3(SHELL.hw + 1, SHELL.hh + 1, 2.6)),
    setShutter(v) { s.openTarget = v ? 1 : 0; },
    setProtect(v) { s.protectTarget = v ? 1 : 0; },
    get busy() { return Math.abs(s.openTarget - s.open) > 1e-3 || Math.abs(s.openV) > 1e-3 || s.spinV > 0.02 || Math.abs(s.protectTarget - s.protect) > 1e-3; },
    setData(next, labelOpts) { // swap the label from data (dissolve / peel come in a later phase)
      api.data = next; labelT.image = fitLabel(drawLabel(next, labelOpts)); labelT.needsUpdate = true;
    },
    setLabelImage(src) { // artwork made elsewhere (Figma export). Any size; cover-fitted to 2048 × 1700
      return new Promise((resolve, reject) => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => {
          const c = makeCanvas(LW, LH), x = c.getContext('2d'), k = Math.max(LW / img.width, LH / img.height), w = img.width * k, h = img.height * k;
          x.imageSmoothingQuality = 'high'; x.drawImage(img, (LW - w) / 2, (LH - h) / 2, w, h);
          labelT.image = c; labelT.needsUpdate = true; resolve();
        };
        img.onerror = reject; img.src = src;
      });
    },
    update(dt, instant = false) {
      if (instant) { s.open = s.openTarget; s.openV = 0; s.protect = s.protectTarget; } else {
        // shutter: an underdamped spring, stiffer on the way back (that is the real spring closing it)
        const k = s.openTarget ? 300 : 420, c = s.openTarget ? 19 : 30, h = dt / 2;
        for (let i = 0; i < 2; i++) { s.openV += (k * (s.openTarget - s.open) - c * s.openV) * h; s.open += s.openV * h; }
        if (s.open < 0) { s.open = 0; s.openV = Math.abs(s.openV) * 0.22; } // hits its stop
        s.protect += (s.protectTarget - s.protect) * (1 - Math.exp(-dt * 16));
      }
      shutter.position.x = -SHUT.travel * s.open;
      const want = s.openTarget ? 9.5 : 0; // rad/s, slowed from the real 300 rpm so the turn reads on screen
      s.spinV += (want - s.spinV) * (1 - Math.exp(-dt * (want ? 2.4 : 1.1)));
      if (instant) s.spinV = 0;
      spin.rotation.z -= s.spinV * dt;
      tab.position.y = TAB.yOn + (TAB.yOff - TAB.yOn) * s.protect;
    },
    dispose() { disposables.forEach(d => d.dispose && d.dispose()); },
  };
  return api;
}

