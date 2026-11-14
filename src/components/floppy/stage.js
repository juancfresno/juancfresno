// @ts-nocheck
/* FLOPPY stage: the Lab module (Figma 7025:21805). One disk per project on a
   conveyor of slots: the active one in focus, the rest at other depths and
   blurred. One WebGL canvas; each blurred disk is rendered on its own to a small
   target, blurred there and composited back to front. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createFloppy } from './core.js';

/* The disk box (Home): an ink ABS tray with a smoked lid hinged at the back, a key lock and a
   paper label. Local frame: origin at the centre of the base, y up, front = +z. `fillers` disks
   already stand at the back (plain stand-ins); the real ones drop into the front slots. Units: mm. */
const BOX = { w: 100, pitch: 8, base: 44, lid: 58, wall: 2.4 };
export function buildBox(slots, fillers) {
  const { w: Wb, pitch, base: Hb, lid: Hl, wall: t } = BOX, D = slots * pitch + 12;
  const g = new THREE.Group(), keep = [];
  const mat = (m) => (keep.push(m), m);
  const abs = mat(new THREE.MeshPhysicalMaterial({ color: '#2b2b27', roughness: 0.44 }));
  const smoke = mat(new THREE.MeshPhysicalMaterial({ color: '#3a322b', roughness: 0.06, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.08 }));
  const steel = mat(new THREE.MeshPhysicalMaterial({ color: '#c6c6c2', metalness: 1, roughness: 0.32 }));
  const paper = mat(new THREE.MeshStandardMaterial({ color: '#FCFCF7', roughness: 0.92 }));
  const part = (w, h, d, x, y, z, m, parent = g) => {
    const geo = new RoundedBoxGeometry(w, h, d, 2, Math.min(0.9, Math.min(w, h, d) / 2.4)); keep.push(geo);
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  };
  // tray
  part(Wb + 2 * t, t, D + 2 * t, 0, t / 2, 0, abs);
  part(Wb + 2 * t, Hb, t, 0, Hb / 2, D / 2 + t / 2, abs);
  part(Wb + 2 * t, Hb, t, 0, Hb / 2, -D / 2 - t / 2, abs);
  part(t, Hb, D + 2 * t, -Wb / 2 - t / 2, Hb / 2, 0, abs);
  part(t, Hb, D + 2 * t, Wb / 2 + t / 2, Hb / 2, 0, abs);
  // front: paper label and key lock
  const lc = document.createElement('canvas'); lc.width = 640; lc.height = 176;
  const x = lc.getContext('2d'); x.fillStyle = '#FCFCF7'; x.fillRect(0, 0, 640, 176); x.fillStyle = '#10100E';
  x.font = '500 30px "Sometype Mono", ui-monospace, Menlo, monospace'; x.textBaseline = 'alphabetic';
  x.fillText('FRESNO© LAB', 28, 58); x.fillText(`${String(slots).padStart(3, '0')} DISKS`, 28, 146);
  x.fillRect(28, 84, 584, 3); x.fillStyle = '#003DFF'; x.fillRect(560, 112, 52, 36);
  const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8; keep.push(lt);
  const label = part(46, 12.6, 0.3, -18, Hb * 0.5, D / 2 + t + 0.12, mat(new THREE.MeshStandardMaterial({ map: lt, roughness: 0.9 })));
  label.geometry.dispose(); label.geometry = new THREE.BoxGeometry(46, 12.6, 0.3); keep.push(label.geometry);
  const lockG = new THREE.CylinderGeometry(3.4, 3.4, 1.4, 28); keep.push(lockG);
  const lock = new THREE.Mesh(lockG, steel); lock.rotation.x = Math.PI / 2; lock.position.set(32, Hb * 0.5, D / 2 + t + 0.5); g.add(lock);
  part(0.9, 3.4, 0.5, 32, Hb * 0.5, D / 2 + t + 1.2, abs); // keyhole
  // lid, hinged along the back top edge; closed = 0, open = leaning back
  const lid = new THREE.Group(); lid.position.set(0, Hb, -D / 2 - t); g.add(lid);
  const L = D + 2 * t;
  part(Wb + 2 * t, t, L, 0, Hl, L / 2, smoke, lid);
  part(Wb + 2 * t, Hl, t, 0, Hl / 2, L - t / 2, smoke, lid);
  part(Wb + 2 * t, Hl, t, 0, Hl / 2, t / 2, smoke, lid);
  part(t, Hl, L, -Wb / 2 - t / 2, Hl / 2, L / 2, smoke, lid);
  part(t, Hl, L, Wb / 2 + t / 2, Hl / 2, L / 2, smoke, lid);
  // stand-in disks at the back
  const slotZ = (k) => (k - (slots - 1) / 2) * pitch, yIn = t + 47.4;
  const tints = ['#10100E', '#2F6BFF', '#8F8D87', '#10100E'];
  for (let k = 0; k < fillers; k++) {
    part(90, 94, 3.3, 0, yIn, slotZ(k), mat(new THREE.MeshPhysicalMaterial({ color: tints[k % tints.length], roughness: 0.55 })));
    part(44, 0.4, 3.5, 8, yIn + 47, slotZ(k), steel);
    const face = (w, h, x, y, m) => { const geo = new THREE.BoxGeometry(w, h, 0.12); keep.push(geo); const f = new THREE.Mesh(geo, m); f.position.set(x, yIn + y, slotZ(k) + 1.7); g.add(f); };
    face(70, 58, 0, -16, paper); face(44, 29, 8, 32.2, steel); // a blank label and the shutter, so the face is not bare
  }
  return { g, lid, slotZ, yIn, dispose: () => keep.forEach((o) => o.dispose()) };
}

// x, y = centre as a fraction of the stage; s = disk width as a fraction of the stage width;
// blur in css px at a 1680 stage; rx, ry, rz = pitch, yaw, screen roll.
const SLOTS = {
  desktop: {
    exit: { x: -0.4, y: 1.05, s: 0.42, blur: 30, rx: 0.2, ry: 0.9, rz: -0.9 },
    '-1': { x: 0.05, y: 0.72, s: 0.27, blur: 18, rx: 0.12, ry: 0.5, rz: -0.45 },
    0: { x: 0.363, y: 0.438, s: 0.235, blur: 0, rx: 0.08, ry: -0.3, rz: 0.06 },
    1: { x: 0.706, y: 0.428, s: 0.125, blur: 2.4, rx: 0.25, ry: 0.45, rz: 0.3 },
    2: { x: 1.003, y: 0.283, s: 0.095, blur: 4.5, rx: -0.1, ry: -0.5, rz: -0.35 },
    far: { x: 1.24, y: 0.62, s: 0.08, blur: 6, rx: 0.2, ry: 0.4, rz: 0.2 },
  },
  mobile: {
    exit: { x: -0.95, y: 0.8, s: 1, blur: 26, rx: 0.2, ry: 0.9, rz: -0.9 },
    '-1': { x: -0.2, y: 0.47, s: 0.62, blur: 14, rx: 0.12, ry: 0.5, rz: -0.4 },
    0: { x: 0.52, y: 0.4, s: 0.56, blur: 0, rx: 0.08, ry: -0.3, rz: 0.06 },
    1: { x: 0.9, y: 0.115, s: 0.24, blur: 2, rx: 0.25, ry: 0.45, rz: 0.3 },
    2: { x: 1.3, y: 0.3, s: 0.18, blur: 4, rx: -0.1, ry: -0.5, rz: -0.35 },
    far: { x: 1.6, y: 0.6, s: 0.14, blur: 5, rx: 0.2, ry: 0.4, rz: 0.2 },
  },
};
// Second view: the disks on a tilted wheel, the active one at the front.
function ring(mobile, n) {
  const o = {};
  for (let r = -1; r <= n - 2; r++) { // one place per disk, by its distance to the active one
    let a = (r * Math.PI * 2) / n; if (a > Math.PI) a -= Math.PI * 2;
    const c = Math.cos(a), sn = Math.sin(a), d = (c + 1) / 2;
    o[String(r)] = mobile
      ? { x: 0.5 + 0.36 * sn, y: 0.36 + 0.07 * c, s: 0.2 + 0.32 * d, blur: (1 - c) * 2.6, rx: 0.08, ry: -a * 0.55, rz: sn * 0.12 }
      : { x: 0.5 + 0.3 * sn, y: 0.43 + 0.08 * c, s: 0.1 + 0.14 * d, blur: (1 - c) * 3.2, rx: 0.08, ry: -a * 0.55, rz: sn * 0.12 };
  }
  o.far = o[String(Math.round(n / 2))] || o['0']; o.exit = o.far;
  return o;
}
// Ficha open: the active disk comes forward and rests over the card's left edge.
const DETAIL = {
  desktop: { x: 0.27, y: 0.5, s: 0.3, blur: 0, rx: 0.06, ry: -0.34, rz: -0.04 },
  mobile: { x: 0.5, y: 0.2, s: 0.5, blur: 0, rx: 0.06, ry: -0.3, rz: -0.04 },
};
const KEYS = ['x', 'y', 's', 'blur', 'rx', 'ry', 'rz'];
const FOV = 24, DIST = 600, TAN = Math.tan((FOV * Math.PI) / 360);

export function createFloppyStage(host, canvas, { items, onChange = (_i) => {}, onEnter = () => {}, onOpen = (_o) => {}, onRequest = (_i) => {}, onFinale = (_f) => {}, onPick = (_i) => {}, box: boxOpt = null, flow: flowOpt = null, start = 0 }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 20, 6000);
  camera.position.set(0, 0, DIST);

  // studio: dimmed RoomEnvironment + key softbox, strip and cool rim (same as the Lab demo)
  {
    const room = new RoomEnvironment();
    room.traverse((o) => {
      if (o.isPointLight) o.intensity *= 0.16;
      else if (o.isMesh && o.material.isMeshBasicMaterial) o.material.color.multiplyScalar(0.3);
    });
    const panel = (w, h, color, k, pos) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(...pos); m.lookAt(0, 0, 0); room.add(m);
    };
    panel(13, 11, '#fff6ea', 5, [-7, 9, 10]);
    panel(0.9, 14, '#ffffff', 34, [10, 5, 7]);
    panel(12, 3.5, '#bfd2ff', 9, [3, 9, -11]);
    panel(16, 2.4, '#ffffff', 6, [2, 0.6, 11]);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(room, 0.035).texture;
    scene.environmentIntensity = 0.9;
    pmrem.dispose(); room.dispose?.();
  }
  const key = new THREE.DirectionalLight('#fff4e8', 1.9); key.position.set(-160, 220, 260); scene.add(key);
  const rim = new THREE.DirectionalLight('#b9ccff', 1.6); rim.position.set(170, 130, -240); scene.add(rim);

  // ── disks
  const N = items.length, shared = {}, maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const small = matchMedia('(max-width: 768px)');
  const disks = items.map((it, i) => {
    const api = createFloppy({ n: it.n, title: it.title, en: it.en, kind: it.kind, year: it.year }, { shared, maxAnisotropy, labelScale: small.matches ? 0.5 : 0.75, shell: it.shell, accent: it.accent, translucent: it.translucent, label: { total: String(N).padStart(3, '0') } });
    if (it.label) api.setLabelImage(it.label).catch(() => {});
    const roll = new THREE.Group(), tilt = new THREE.Group(), turn = new THREE.Group();
    scene.add(roll); roll.add(tilt); tilt.add(turn); turn.add(api.group);
    return { i, api, roll, tilt, turn, cur: {}, vel: {}, slot: 'far', exiting: 0, u: { yawT: 0, pitchT: 0, yaw: 0, pitch: 0, vy: 0, vp: 0, iy: 0, ip: 0 }, seed: i * 1.7 };
  });
  let active = ((start % N) + N) % N, lastInput = -1e9;
  const VIEWS = { field: SLOTS, ring: { desktop: ring(false, N), mobile: ring(true, N) } };
  let view = 'field', open = false;
  const slots = () => VIEWS[view][small.matches ? 'mobile' : 'desktop'];
  const tmp = {}, poseTmp = {};
  // Flow mode (Home): nothing pinned. The module is a normal section of the page and the canvas a
  // viewport-sized sticky layer inside it. The first `main` disks sit on the DOM spots
  // ([data-floppy-spot]) and cross from one side to the other as the page scrolls; the rest are
  // depth: small blurred ones far away that move slower than the page, and big out-of-focus ones
  // in the foreground, at the sides, that move faster. c = the section y at the viewport centre.
  const flow = flowOpt ? { main: flowOpt.main, c: null, spots: [], h: 1 } : null;
  const DEPTH = [ // x, y (fraction of the section height), s, blur, speed vs the page, drift, rotations
    { x: 0.87, y: 0.1, s: 0.085, blur: 5, v: 0.55, dx: 0.03, rx: 0.25, ry: 0.45, rz: 0.3 },
    { x: -0.03, y: 0.33, s: 0.5, blur: 30, v: 1.7, dx: -0.1, rx: 0.2, ry: 0.9, rz: -0.9 },
    { x: 0.1, y: 0.5, s: 0.07, blur: 6, v: 0.5, dx: -0.03, rx: -0.1, ry: -0.5, rz: -0.35 },
    { x: 1.05, y: 0.7, s: 0.46, blur: 28, v: 1.6, dx: 0.1, rx: 0.12, ry: -0.7, rz: 0.6 },
    { x: 0.72, y: 0.88, s: 0.09, blur: 4.5, v: 0.6, dx: 0.03, rx: 0.2, ry: 0.4, rz: 0.2 },
  ];
  function measure() { // where the spots are inside the section
    const hr = host.getBoundingClientRect(); flow.h = Math.max(1, hr.height);
    flow.spots = [...host.querySelectorAll('[data-floppy-spot]')].map((el) => { const r = el.getBoundingClientRect(); return { x: (r.left - hr.left + r.width / 2) / hr.width, y: r.top - hr.top + r.height / 2, s: r.width / hr.width }; });
  }
  function flowPose(d, vh, top) { // top = the canvas top on screen
    const c = d.cur, m = small.matches;
    if (d.i < flow.main) {
      const a = flow.spots[d.i]; if (!a) return;
      const u = (a.y - flow.c) / vh, dir = d.i % 2 ? -1 : 1, e = Math.max(-1.4, Math.min(1.4, u)); // u: 0 = at the viewport centre, + = still below
      c.x = a.x + dir * e * (m ? 0.2 : 0.15); c.y = (vh / 2 + u * vh * 1.08 - top) / H; c.s = a.s;
      c.blur = Math.max(0, Math.abs(e) - 0.42) * 9; c.rx = 0.08 + e * 0.4; c.ry = dir * (-0.3 + e * 1.15); c.rz = dir * (0.06 - e * 0.42);
    } else {
      // more than five depth disks (Lab): the pattern repeats down the section in bands, mirrored on every other one
      const k = d.i - flow.main, g = DEPTH[k % DEPTH.length], band = Math.floor(k / DEPTH.length), bands = Math.ceil((N - flow.main) / DEPTH.length), f = band % 2 ? -1 : 1;
      const near = g.v > 1, u = (((band + g.y) / bands) * flow.h - flow.c) / vh, e = Math.max(-2, Math.min(2, u));
      c.x = (f < 0 ? 1 - g.x : g.x) + f * g.dx * e; c.y = (vh / 2 + u * vh * g.v - top) / H; c.s = g.s * (m ? (near ? 1.1 : 1.8) : 1);
      c.blur = g.blur; c.rx = g.rx + e * 0.3; c.ry = f * (g.ry + e * (near ? 0.5 : 0.9)); c.rz = f * (g.rz + e * 0.3);
    }
  }
  // Scroll mode (Home): the page scroll is the timeline. q = how many disks have gone by (a float);
  // each disk sits at its distance to q along the same path the conveyor uses, so they file past.
  const scroll = { on: false, q: 0, eff: 0, t: -1e9 };
  // Box (Home): it stands bottom right from the start, holding the disks the Home does not show.
  // Each disk, as the scroll takes it out of focus, flies over its slot and drops in (one scroll
  // unit per disk); after the last one the lid closes over TAIL more units. finale.f = 0 … 1 = the lid.
  const TAIL = boxOpt ? 0.5 : 0, END = boxOpt ? N + TAIL : N - 1, finale = { f: 0, shown: false };
  let boxIn = 0; // the box's own entrance, 0 … 1
  const box = boxOpt ? buildBox(Math.max(N, boxOpt.total || N), Math.max(0, (boxOpt.total || N) - N)) : null;
  if (box) { box.g.visible = false; scene.add(box.g); }
  const inBoxOf = (d) => (box && scroll.on ? Math.max(0, Math.min(1, scroll.eff - d.i)) : 0); // 0 = on stage, 1 = in its slot
  const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const PATH = ['exit', '-1', '0', '1', '2', 'far']; // distances −2 … 3
  const poseAt = (r) => {
    const S = slots(), x = Math.max(-2, Math.min(3, r)) + 2, i0 = Math.min(4, Math.floor(x)), u = x - i0, e = u * u * (3 - 2 * u); // ease: it lingers at each stop
    const a = S[PATH[i0]], b = S[PATH[i0 + 1]];
    for (const k of KEYS) poseTmp[k] = a[k] + (b[k] - a[k]) * e;
    return poseTmp;
  };
  const targetOf = (d) => { // where a disk wants to be right now
    const base = scroll.on ? poseAt(box ? Math.max(0, d.i - scroll.eff) : d.i - scroll.eff) : slots()[d.slot];
    if (!open) return base;
    if (d.i === active && (scroll.on || d.slot === '0')) return DETAIL[small.matches ? 'mobile' : 'desktop'];
    // the rest clear the card: those on its side leave the stage, the near one stays as a blurred foreground
    const m = small.matches, out = m ? (base.x < 0.5 ? -0.7 : 0.7) : base.x > 0.3 ? 0.8 : -0.04;
    return Object.assign(tmp, base, { x: base.x + out, blur: base.blur + 9, s: base.s * 0.84 });
  };
  const rel = (i, a = active) => ((i - a + N + 1) % N) - 1; // −1 … N−2
  const slotKey = (r) => { const k = String(r); return k in slots() ? k : 'far'; };
  const snap = (d, key) => { d.slot = key; for (const k of KEYS) { d.cur[k] = slots()[key][k]; d.vel[k] = 0; } };
  disks.forEach((d) => snap(d, slotKey(rel(d.i))));

  // entrance: the disks wait far below, small and out of focus, and tumble up into
  // their slots (a focus pull) the first time a third of the module is on screen
  let entered = reduced.matches || !!flow;
  const introPose = (d) => {
    const T = targetOf(d);
    Object.assign(d.cur, { x: T.x + (T.x - 0.5) * 0.9, y: T.y + 1.05, s: T.s * 0.22, blur: T.blur + 26, rx: T.rx - 1.6, ry: T.ry + Math.PI * 3, rz: T.rz + 1.4 });
    for (const k of KEYS) d.vel[k] = 0; d.hold = true;
  };
  if (!entered) disks.forEach(introPose);
  function enter() {
    if (entered) return; entered = true;
    const now = performance.now();
    [...disks].sort((a, b) => Math.abs(rel(a.i)) - Math.abs(rel(b.i))).forEach((d, n) => { d.release = now + n * 150; d.soft = now + n * 150 + 2600; });
    // once the focused disk lands its shutter snaps open and shut, like a drive checking it
    const f = focus();
    setTimeout(() => { if (!dead && f === focus() && hover !== f && !manual) { f.api.setShutter(true); wake(); setTimeout(() => { if (!dead && hover !== f && !manual) { f.api.setShutter(false); wake(); } }, 950); } }, 1750);
    onEnter(); wake();
  }

  function setActive(next, silent) {
    next = ((next % N) + N) % N;
    if (next === active) return;
    let delta = next - active; if (delta > N / 2) delta -= N; if (delta < -N / 2) delta += N;
    for (const d of disks) {
      const a = rel(d.i), b = rel(d.i, next);
      if (d.exiting && b >= 1) d.after = slotKey(b); // already leaving: let it finish, it will reappear at its new place
      else if (view === 'field' && delta > 0 && b > a) { d.slot = 'exit'; d.exiting = performance.now(); d.after = slotKey(b); } // leaves past the camera, comes back from afar
      else if (view === 'field' && delta < 0 && b < a) { snap(d, 'exit'); d.slot = slotKey(b); d.exiting = 0; }
      else { d.slot = slotKey(b); d.exiting = 0; }
      d.u.yawT = Math.round(d.u.yawT / (Math.PI * 2)) * Math.PI * 2; d.u.pitchT = 0; d.u.iy = d.u.ip = 0;
      d.api.setShutter(false);
    }
    if (!reduced.matches) disks[next].cur.ry += Math.PI * 2 * Math.sign(delta); // it turns once on its way to the front
    active = next; hover = null; manual = open;
    if (open) disks[next].api.setShutter(true);
    if (reduced.matches) for (const d of disks) { if (d.exiting) { d.exiting = 0; d.slot = d.after; } snap(d, d.slot); }
    if (!silent) onChange(active);
    wake();
  }

  // ── blur targets and the composite pass
  const half = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  const mkRT = (samples = 0) => { const t = new THREE.WebGLRenderTarget(4, 4, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true, samples }); t.texture.generateMipmaps = false; return t; };
  const rts = { 0.5: [mkRT(4), mkRT()], 0.25: [mkRT(), mkRT()] }; // light blurs keep clean edges (MSAA on the half-size target)
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadGeo = new THREE.PlaneGeometry(2, 2);
  const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tD: { value: null }, dir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false, vertexShader: vs,
    fragmentShader: `uniform sampler2D tD; uniform vec2 dir; varying vec2 vUv;
      void main(){ vec4 s = texture2D( tD, vUv ) * 0.1633;
        s += ( texture2D( tD, vUv + dir ) + texture2D( tD, vUv - dir ) ) * 0.1531;
        s += ( texture2D( tD, vUv + dir * 2.0 ) + texture2D( tD, vUv - dir * 2.0 ) ) * 0.12245;
        s += ( texture2D( tD, vUv + dir * 3.0 ) + texture2D( tD, vUv - dir * 3.0 ) ) * 0.0918;
        s += ( texture2D( tD, vUv + dir * 4.0 ) + texture2D( tD, vUv - dir * 4.0 ) ) * 0.051;
        gl_FragColor = s; }`,
  });
  const blitMat = new THREE.ShaderMaterial({ // premultiplied linear → tone mapped, display space
    uniforms: { tD: { value: null } }, depthTest: false, depthWrite: false, transparent: true, vertexShader: vs,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    fragmentShader: `uniform sampler2D tD; varying vec2 vUv;
      void main(){ vec4 c = texture2D( tD, vUv ); float a = clamp( c.a, 0.0, 1.0 );
        gl_FragColor = vec4( c.rgb / max( a, 1e-4 ), 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor = vec4( gl_FragColor.rgb * a, a ); }`,
  });
  const quad = new THREE.Mesh(quadGeo, blurMat); quad.frustumCulled = false;

  // ── layout
  let W = 1, H = 1, pr = 1, quality = Math.min(window.devicePixelRatio || 1, 2);
  function fit() {
    const el = flow ? canvas : host; // flow: the canvas is the sticky viewport layer, not the whole section
    W = Math.max(1, el.clientWidth); H = Math.max(1, el.clientHeight); pr = quality;
    if (flow) measure();
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    for (const k of [0.5, 0.25]) for (const t of rts[k]) t.setSize(Math.max(2, Math.round(W * pr * k)), Math.max(2, Math.round(H * pr * k)));
    for (const d of disks) if (d.hold) introPose(d); // the rest follow on their springs: no jump on resize or quality change
    wake();
  }
  function place(d, t) { // slot space → world
    const c = d.cur, k0 = (90 * H) / (2 * DIST * TAN), z = DIST * (1 - k0 / Math.max(8, c.s * W)), hh = (DIST - z) * TAN;
    const f = reduced.matches ? 0 : 1, u = d.u;
    // cursor: near disks slide more than far ones, and every disk leans towards the pointer
    const par = 0.02 * Math.pow(c.s / 0.235, 1.15) * f, px = c.x - mouse.x * par, py = c.y - mouse.y * par * (W / H);
    _pa.set((px - 0.5) * 2 * hh * camera.aspect, (0.5 - py) * 2 * hh + Math.sin(t * 0.7 + d.seed) * 1.2 * f, z);
    const lean = (v, k, m) => Math.max(-m, Math.min(m, v * k)) * f; // a moving disk banks into its path
    _qa.setFromEuler(_eu.set( // screen roll · pitch · yaw
      c.rx + lean(d.vel.y, 0.6, 0.4) + u.pitch + Math.sin(t * 0.43 + d.seed) * 0.035 * f + mouse.y * 0.16 * f,
      c.ry + u.yaw + Math.sin(t * 0.37 + d.seed * 3) * 0.06 * f + mouse.x * 0.24 * f,
      c.rz + Math.sin(t * 0.31 + d.seed * 2) * 0.025 * f - lean(d.vel.x, 0.55, 0.45), 'ZXY'));
    d.fin = 0;
    const p = inBoxOf(d);
    if (p > 0) { // towards the box: first above its slot, upright, then down into it
      const w = sm(p / 0.62), drop = sm((p - 0.56) / 0.44);
      _pb.set(0, box.yIn + (1 - drop) * 112, box.slotZ(box.first + d.i)).applyMatrix4(box.g.matrixWorld);
      _pa.lerp(_pb, w); _pa.y += Math.sin(Math.PI * w) * 14; _qa.slerp(box.g.quaternion, w); d.fin = w;
    }
    d.roll.position.copy(_pa); d.roll.quaternion.copy(_qa);
  }
  const _pa = new THREE.Vector3(), _pb = new THREE.Vector3(), _qa = new THREE.Quaternion(), _eu = new THREE.Euler();
  if (box) box.first = Math.max(0, ((boxOpt.total || N) - N));
  function placeBox() { // bottom right, small; it comes up from below with the entrance
    const m = small.matches, k0 = (90 * H) / (2 * DIST * TAN), z = DIST * (1 - k0 / Math.max(8, (m ? 0.25 : 0.13) * W)), hh = (DIST - z) * TAN;
    const e = 1 - Math.pow(1 - boxIn, 3), f = reduced.matches ? 0 : 1;
    box.g.position.set(((m ? 0.74 : 0.79) - 0.5 - mouse.x * 0.006 * f) * 2 * hh * camera.aspect, (0.5 - (m ? 0.875 : 0.885)) * 2 * hh - (1 - e) * hh * 0.9, z);
    box.g.rotation.set(0.5, -0.5 + (1 - e) * 1.1 + mouse.x * 0.06 * f, 0, 'YXZ');
    box.lid.rotation.x = -1.9 * sm(scroll.eff / 0.3) * (1 - sm(finale.f)); // shut at rest, open while the disks go in
    box.g.updateMatrixWorld(true);
  }

  // ── pointer: the focused disk turns under the hand, the others come to focus on click
  const ray = new THREE.Raycaster(), inv = new THREE.Matrix4(), ndc = new THREE.Vector2();
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return null;
    for (const d of [...disks].sort((a, b) => b.cur.s - a.cur.s)) {
      ray.setFromCamera(ndc, camera); inv.copy(d.api.group.matrixWorld).invert(); ray.ray.applyMatrix4(inv);
      if (ray.ray.intersectsBox(d.api.bounds)) return d;
    }
    return null;
  }
  let hover = null, manual = false;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const ptr = { id: null, d: null, x: 0, y: 0, t: 0, st: 0, vx: 0, vy: 0, travel: 0 };
  const focus = () => disks[active];
  const applyHover = (d) => {
    if (d === hover) return; hover = d;
    if (flow) { const was = hover; hover = d && d.i < flow.main ? d : null; if (was && was !== hover) was.api.setShutter(false); if (hover) { hover.api.setShutter(true); host.dataset.cursor = 'view'; } else delete host.dataset.cursor; wake(); return; }
    if (d) host.dataset.cursor = d === focus() && !scroll.on ? 'drag' : 'view'; else delete host.dataset.cursor;
    focus().api.setShutter(manual || d === focus()); wake();
  };
  const interactive = (e) => e.target instanceof Element && e.target.closest('a, button');
  const onDown = (e) => {
    if (ptr.id !== null || interactive(e) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const d = pick(e); if (!d) return;
    ptr.id = e.pointerId; ptr.d = d; ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = ptr.st = performance.now(); ptr.vx = ptr.vy = 0; ptr.travel = 0;
    if (d === focus() && !scroll.on && !flow) { try { host.setPointerCapture(e.pointerId); } catch {} d.u.iy = d.u.ip = 0; host.dataset.dragging = ''; }
    lastInput = ptr.t; wake();
  };
  const onMove = (e) => {
    if (e.pointerType === 'mouse') { const r = canvas.getBoundingClientRect(); mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.ty = ((e.clientY - r.top) / r.height) * 2 - 1; }
    if (ptr.id === null && e.pointerType === 'mouse') applyHover(interactive(e) ? null : pick(e));
    if (e.pointerId !== ptr.id) return;
    const now = performance.now(), dt = Math.max(1, now - ptr.t) / 1000, S = e.pointerType === 'mouse' ? 0.0062 : 0.0082;
    const dx = (e.clientX - ptr.x) * S, dy = (e.clientY - ptr.y) * S, u = ptr.d.u;
    ptr.travel += Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y);
    if (ptr.d === focus() && !scroll.on && !flow) {
      u.yawT += dx; if (e.pointerType === 'mouse') u.pitchT = Math.max(-0.95, Math.min(0.95, u.pitchT + dy));
      const a = Math.min(1, dt * 22); ptr.vx += (dx / dt - ptr.vx) * a; ptr.vy += (dy / dt - ptr.vy) * a;
    }
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now; lastInput = now; wake();
  };
  const onUp = (e) => {
    if (e.pointerId !== ptr.id) return;
    const d = ptr.d, now = performance.now(), tap = ptr.travel < 6 && now - ptr.st < 450;
    ptr.id = null; ptr.d = null; delete host.dataset.dragging;
    if (flow) { if (e.type === 'pointerup' && tap && d.i < flow.main) onPick(d.i); } // a tap on a disk opens its experiment
    else if (e.type === 'pointerup') {
      if (tap && inBoxOf(d) > 0.5) onRequest(d.i); // a disk in the box: take it out again
      else if (d !== focus()) { if (tap) { const to = active + (scroll.on ? Math.sign(d.i - active) : rel(d.i) < 0 ? -1 : 1); if (scroll.on) onRequest(to); else setActive(to); } } // any other disk moves the row one step its way
      else if (tap) setOpen(!open);
      else if (!tap && !scroll.on && now - ptr.t < 90 && !reduced.matches) { d.u.iy = Math.max(-16, Math.min(16, ptr.vx)); if (e.pointerType === 'mouse') d.u.ip = Math.max(-6, Math.min(6, ptr.vy)); }
    }
    lastInput = now; wake();
  };
  function setOpen(v, silent) {
    v = !!v; if (v === open) return;
    open = v; manual = v; focus().api.setShutter(v || hover === focus());
    if (reduced.matches) for (const d of disks) for (const k of KEYS) { d.cur[k] = targetOf(d)[k]; d.vel[k] = 0; }
    if (!silent) onOpen(open);
    wake();
  }
  function setView(v) {
    if (!VIEWS[v] || v === view) return;
    view = v;
    for (const d of disks) { d.exiting = 0; d.slot = slotKey(rel(d.i)); if (reduced.matches) snap(d, d.slot); }
    wake();
  }
  const onClick = (e) => { // a click on nothing closes the ficha
    if (open && !interactive(e) && !(e.target instanceof Element && e.target.closest('[data-floppy-card]')) && !pick(e)) setOpen(false);
  };
  host.addEventListener('click', onClick);
  const onLeave = () => { mouse.tx = mouse.ty = 0; if (ptr.id === null) applyHover(null); };
  host.addEventListener('pointerdown', onDown); host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onUp); host.addEventListener('pointercancel', onUp); host.addEventListener('pointerleave', onLeave);

  // ── loop
  let raf = 0, last = 0, clock = 0, visible = !document.hidden, onScreen = false, slow = 0, dead = false;
  const frames = [];
  const wake = () => { if (!raf && visible && onScreen && !dead) { last = 0; raf = requestAnimationFrame(tick); } };
  function settled() {
    if (flow) return true;
    return !scroll.on && ptr.id === null && disks.every((d) => !d.exiting && !d.api.busy && Math.abs(d.u.vy) < 1e-3 && Math.abs(d.u.iy) < 1e-3 && Math.abs(d.u.yawT - d.u.yaw) < 1e-4
      && KEYS.every((k) => Math.abs(d.vel[k]) < 1e-4 && Math.abs(targetOf(d)[k] - d.cur[k]) < 1e-4));
  }
  function tick(now) {
    raf = 0;
    const raw = last ? (now - last) / 1000 : 1 / 60; last = now;
    if (raw > 0 && raw < 0.5) { frames.push(raw); if (frames.length > 60) frames.shift(); }
    const dt = Math.min(raw, 1 / 20), rm = reduced.matches, S = slots();
    clock += dt;
    // quality steps down once if the device cannot hold the frame rate
    if (clock > 3 && frames.length === 60 && quality > 1) { const avg = frames.reduce((a, b) => a + b, 0) / 60; slow = avg > 1 / 34 ? slow + 1 : 0; if (slow > 45) { quality = Math.max(1, quality - 0.5); slow = 0; frames.length = 0; fit(); } }

    { const k = 1 - Math.exp(-dt * 4); mouse.x += (mouse.tx - mouse.x) * k; mouse.y += (mouse.ty - mouse.y) * k; }
    if (scroll.on) {
      const rest = box && scroll.q > N - 0.5 ? END : Math.min(N - 1, Math.round(scroll.q)); // at rest the nearest disk arrives, or the last one goes in and the lid shuts
      const goal = !scroll.hold && now - scroll.t > 200 ? rest : scroll.q; // scroll.hold: QA, stay exactly on the scroll
      scroll.eff = rm ? goal : scroll.eff + (goal - scroll.eff) * (1 - Math.exp(-dt * 9));
      const idx = Math.max(0, Math.min(N - 1, Math.round(scroll.eff)));
      if (idx !== active) {
        disks[active].api.setShutter(false); active = idx; hover = null; manual = open;
        if (open) disks[active].api.setShutter(true);
        onChange(active);
      }
      if (box) {
        if (entered && boxIn < 1) boxIn = Math.min(1, boxIn + dt / 1.5);
        finale.f = Math.max(0, Math.min(1, (scroll.eff - N) / TAIL));
        if (open && scroll.eff - active > 0.08) setOpen(false);
        const on = scroll.eff > N - 0.45; if (on !== finale.shown) { finale.shown = on; onFinale(on); }
        placeBox();
      }
    }
    if (flow) {
      const vh = window.innerHeight, top = canvas.getBoundingClientRect().top, C = vh / 2 - host.getBoundingClientRect().top;
      flow.c = rm || flow.c === null || Math.abs(C - flow.c) > vh * 1.5 ? C : flow.c + (C - flow.c) * (1 - Math.exp(-dt * 11)); // a short lag: the disks float after the page
      let best = active, bd = 1e9;
      for (const d of disks) { flowPose(d, vh, top); if (d.i < flow.main && flow.spots[d.i]) { const k = Math.abs(flow.spots[d.i].y - flow.c); if (k < bd) { bd = k; best = d.i; } } }
      if (best !== active) { active = best; onChange(active); }
    }
    for (const d of disks) {
      if (flow) { place(d, clock); d.api.update(dt, rm); continue; }
      if (d.hold) { if (entered && now >= d.release) d.hold = false; else { place(d, clock); continue; } }
      const T = targetOf(d), order = Math.abs(rel(d.i)), K = d.soft > now ? 7 : d.slot === 'exit' ? 26 : 30 - order * 3.2, C = 2 * (d.soft > now ? 0.86 : 0.7) * Math.sqrt(K), h = dt / 2;
      if (rm) for (const k of KEYS) { d.cur[k] = T[k]; d.vel[k] = 0; }
      else for (let n = 0; n < 2; n++) for (const k of KEYS) { d.vel[k] += (K * (T[k] - d.cur[k]) - C * d.vel[k]) * h; d.cur[k] += d.vel[k] * h; }
      d.cur.blur = Math.max(0, d.cur.blur); d.cur.s = Math.max(0.01, d.cur.s);
      if (d.exiting && (d.cur.x < -d.cur.s * 0.72 || d.cur.y > 1 + d.cur.s || now - d.exiting > 1800)) { d.exiting = 0; snap(d, 'far'); d.slot = d.after; }
      // hand rotation, with the same weight as the Lab demo
      const u = d.u;
      if (ptr.d !== d) {
        u.yawT += u.iy * dt; u.pitchT += u.ip * dt; const decay = Math.pow(0.92, dt * 60); u.iy *= decay; u.ip *= decay;
        if (d !== focus() || (now - lastInput > 3000 && Math.abs(u.iy) < 0.08)) { const k = 1 - Math.exp(-dt * 1.7); u.yawT += (Math.round(u.yawT / Math.PI) * Math.PI - u.yawT) * k; u.pitchT += (0 - u.pitchT) * k; }
      }
      if (rm) { u.yaw = u.yawT; u.pitch = u.pitchT; u.vy = u.vp = 0; } else {
        const h3 = dt / 3, K2 = 95, C2 = 2 * 0.74 * Math.sqrt(K2);
        for (let n = 0; n < 3; n++) { u.vy += (K2 * (u.yawT - u.yaw) - C2 * u.vy) * h3; u.yaw += u.vy * h3; u.vp += (K2 * (u.pitchT - u.pitch) - C2 * u.vp) * h3; u.pitch += u.vp * h3; }
      }
      place(d, clock); d.api.update(dt, rm);
    }

    // composite, far to near
    renderer.setRenderTarget(null); renderer.clear();
    const order = [...disks].sort((a, b) => a.cur.s - b.cur.s), inBox = !!box && scroll.on, group = [];
    for (const d of disks) d.roll.visible = false;
    if (box) box.g.visible = false;
    for (const d of order) {
      const c = d.cur, m = c.s * 0.9;
      if (d.fin < 0.01 && (c.x < -m || c.x > 1 + m || c.y * H < -m * W || c.y * H > H + m * W)) continue; // off stage
      const b = c.blur * (W / 1680) * pr * (small.matches ? 2.2 : 1) * (1 - d.fin);
      if (inBox && b < 0.6) { group.push(d); continue; } // sharp ones share one depth pass with the box
      d.roll.visible = true;
      if (b < 0.6) { renderer.clearDepth(); renderer.render(scene, camera); }
      else {
        const k = b > 14 ? 0.25 : 0.5, [A, B] = rts[k], step = (b * k) / 2.6;
        renderer.setRenderTarget(A); renderer.clear(); renderer.render(scene, camera);
        quad.material = blurMat;
        for (const s of [step, step * 0.5]) {
          blurMat.uniforms.tD.value = A.texture; blurMat.uniforms.dir.value.set(s / A.width, 0); renderer.setRenderTarget(B); renderer.render(quad, quadCam);
          blurMat.uniforms.tD.value = B.texture; blurMat.uniforms.dir.value.set(0, s / A.height); renderer.setRenderTarget(A); renderer.render(quad, quadCam);
        }
        renderer.setRenderTarget(null); quad.material = blitMat; blitMat.uniforms.tD.value = A.texture; renderer.render(quad, quadCam);
      }
      d.roll.visible = false;
    }
    if (inBox) { // the box, its stand-ins and every sharp disk together, so they hide each other properly
      box.g.visible = true; for (const d of group) d.roll.visible = true;
      renderer.clearDepth(); renderer.render(scene, camera);
      box.g.visible = false; for (const d of group) d.roll.visible = false;
    }
    if (!(rm && settled())) raf = requestAnimationFrame(tick);
  }
  const onVis = () => { visible = !document.hidden; if (visible) wake(); else { cancelAnimationFrame(raf); raf = 0; } };
  document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) wake(); else { cancelAnimationFrame(raf); raf = 0; } }, { rootMargin: '120px' });
  io.observe(host);
  const ioIn = new IntersectionObserver(([e]) => { if (e.isIntersecting) { ioIn.disconnect(); enter(); } }, { threshold: 0.35 });
  ioIn.observe(host);
  const ro = new ResizeObserver(fit); ro.observe(host); if (flow) { ro.observe(canvas); window.addEventListener('scroll', wake, { passive: true }); }
  const onMedia = () => fit();
  small.addEventListener?.('change', onMedia); reduced.addEventListener?.('change', wake);
  fit();

  return {
    setActive, next: () => setActive(active + 1), prev: () => setActive(active - 1), setOpen, setView,
    // q = disks gone by (a float, 0 … span), from the page scroll
    setScroll(q) {
      q = q >= 0 ? Math.min(END, q) : 0; // also catches NaN
      if (!scroll.on) { scroll.on = true; scroll.eff = q; view = 'field'; for (const d of disks) { d.exiting = 0; d.u.yawT = d.u.pitchT = 0; } }
      if (Math.abs(q - scroll.q) > 1e-4) scroll.t = performance.now();
      scroll.q = q; wake();
    },
    get scroll() { return scroll; }, get finale() { return finale; }, span: END,
    get open() { return open; }, get view() { return view; },
    get active() { return active; },
    get fps() { return frames.length ? Math.round(frames.length / frames.reduce((a, b) => a + b, 0)) : 0; },
    get quality() { return quality; },
    disks, renderer,
    enter, replay() { entered = false; disks.forEach((d) => { d.soft = 0; snap(d, slotKey(rel(d.i))); introPose(d); }); enter(); },
    renderNow() { onScreen = true; cancelAnimationFrame(raf); raf = 0; tick(performance.now()); },
    dispose() {
      dead = true; cancelAnimationFrame(raf); io.disconnect(); ioIn.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('scroll', wake); small.removeEventListener?.('change', onMedia); reduced.removeEventListener?.('change', wake);
      host.removeEventListener('pointerdown', onDown); host.removeEventListener('pointermove', onMove);
      host.removeEventListener('click', onClick); host.removeEventListener('pointerup', onUp); host.removeEventListener('pointercancel', onUp); host.removeEventListener('pointerleave', onLeave);
      delete host.dataset.cursor; delete host.dataset.dragging;
      disks.forEach((d) => d.api.dispose()); box?.dispose(); scene.environment?.dispose();
      for (const k of [0.5, 0.25]) rts[k].forEach((t) => t.dispose());
      quadGeo.dispose(); blurMat.dispose(); blitMat.dispose(); renderer.dispose();
    },
  };
}
