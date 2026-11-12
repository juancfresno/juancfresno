// @ts-nocheck
/* FLOPPY stage: the Lab module (Figma 7025:21805). One disk per project on a
   conveyor of slots: the active one in focus, the rest at other depths and
   blurred. One WebGL canvas; each blurred disk is rendered on its own to a small
   target, blurred there and composited back to front. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createFloppy } from './core.js';

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
const KEYS = ['x', 'y', 's', 'blur', 'rx', 'ry', 'rz'];
const FOV = 24, DIST = 600, TAN = Math.tan((FOV * Math.PI) / 360);

export function createFloppyStage(host, canvas, { items, onChange = (_i) => {}, onEnter = () => {}, start = 0 }) {
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
  const slots = () => SLOTS[small.matches ? 'mobile' : 'desktop'];
  const rel = (i, a = active) => ((i - a + N + 1) % N) - 1; // −1 … N−2
  const slotKey = (r) => (r <= 2 ? String(r) : 'far');
  const snap = (d, key) => { d.slot = key; for (const k of KEYS) { d.cur[k] = slots()[key][k]; d.vel[k] = 0; } };
  disks.forEach((d) => snap(d, slotKey(rel(d.i))));

  // entrance: the disks wait far below, small and out of focus, and tumble up into
  // their slots (a focus pull) the first time a third of the module is on screen
  let entered = reduced.matches;
  const introPose = (d) => {
    const T = slots()[d.slot];
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
      if (delta > 0 && b > a) { d.slot = 'exit'; d.exiting = performance.now(); d.after = slotKey(b); } // leaves past the camera, comes back from afar
      else if (delta < 0 && b < a) { snap(d, 'exit'); d.slot = slotKey(b); d.exiting = 0; }
      else { d.slot = slotKey(b); d.exiting = 0; }
      d.u.yawT = Math.round(d.u.yawT / (Math.PI * 2)) * Math.PI * 2; d.u.pitchT = 0; d.u.iy = d.u.ip = 0;
      d.api.setShutter(false);
    }
    active = next; hover = null; manual = false;
    if (reduced.matches) for (const d of disks) { if (d.exiting) { d.exiting = 0; d.slot = d.after; } snap(d, d.slot); }
    if (!silent) onChange(active);
    wake();
  }

  // ── blur targets and the composite pass
  const half = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  const mkRT = () => { const t = new THREE.WebGLRenderTarget(4, 4, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true }); t.texture.generateMipmaps = false; return t; };
  const rts = { 0.5: [mkRT(), mkRT()], 0.25: [mkRT(), mkRT()] };
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
    W = Math.max(1, host.clientWidth); H = Math.max(1, host.clientHeight); pr = quality;
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    for (const k of [0.5, 0.25]) for (const t of rts[k]) t.setSize(Math.max(2, Math.round(W * pr * k)), Math.max(2, Math.round(H * pr * k)));
    for (const d of disks) { if (d.hold) introPose(d); else if (!d.exiting && !(d.soft > performance.now())) snap(d, slotKey(rel(d.i))); }
    wake();
  }
  function place(d, t) { // slot space → world
    const c = d.cur, k0 = (90 * H) / (2 * DIST * TAN), z = DIST * (1 - k0 / Math.max(8, c.s * W)), hh = (DIST - z) * TAN;
    const f = reduced.matches ? 0 : 1, u = d.u;
    // cursor: near disks slide more than far ones, and every disk leans towards the pointer
    const par = 0.02 * Math.pow(c.s / 0.235, 1.15) * f, px = c.x - mouse.x * par, py = c.y - mouse.y * par * (W / H);
    d.roll.position.set((px - 0.5) * 2 * hh * camera.aspect, (0.5 - py) * 2 * hh + Math.sin(t * 0.7 + d.seed) * 1.2 * f, z);
    d.roll.rotation.z = c.rz + Math.sin(t * 0.31 + d.seed * 2) * 0.025 * f;
    d.tilt.rotation.x = c.rx + u.pitch + Math.sin(t * 0.43 + d.seed) * 0.035 * f + mouse.y * 0.16 * f;
    d.turn.rotation.y = c.ry + u.yaw + Math.sin(t * 0.37 + d.seed * 3) * 0.06 * f + mouse.x * 0.24 * f;
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
    if (d) host.dataset.cursor = d === focus() ? 'drag' : 'view'; else delete host.dataset.cursor;
    focus().api.setShutter(manual || d === focus()); wake();
  };
  const interactive = (e) => e.target instanceof Element && e.target.closest('a, button');
  const onDown = (e) => {
    if (ptr.id !== null || interactive(e) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const d = pick(e); if (!d) return;
    ptr.id = e.pointerId; ptr.d = d; ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = ptr.st = performance.now(); ptr.vx = ptr.vy = 0; ptr.travel = 0;
    if (d === focus()) { try { host.setPointerCapture(e.pointerId); } catch {} d.u.iy = d.u.ip = 0; host.dataset.dragging = ''; }
    lastInput = ptr.t; wake();
  };
  const onMove = (e) => {
    if (e.pointerType === 'mouse') { const r = canvas.getBoundingClientRect(); mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.ty = ((e.clientY - r.top) / r.height) * 2 - 1; }
    if (ptr.id === null && e.pointerType === 'mouse') applyHover(interactive(e) ? null : pick(e));
    if (e.pointerId !== ptr.id) return;
    const now = performance.now(), dt = Math.max(1, now - ptr.t) / 1000, S = e.pointerType === 'mouse' ? 0.0062 : 0.0082;
    const dx = (e.clientX - ptr.x) * S, dy = (e.clientY - ptr.y) * S, u = ptr.d.u;
    ptr.travel += Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y);
    if (ptr.d === focus()) {
      u.yawT += dx; if (e.pointerType === 'mouse') u.pitchT = Math.max(-0.95, Math.min(0.95, u.pitchT + dy));
      const a = Math.min(1, dt * 22); ptr.vx += (dx / dt - ptr.vx) * a; ptr.vy += (dy / dt - ptr.vy) * a;
    }
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now; lastInput = now; wake();
  };
  const onUp = (e) => {
    if (e.pointerId !== ptr.id) return;
    const d = ptr.d, now = performance.now(), tap = ptr.travel < 6 && now - ptr.st < 450;
    ptr.id = null; ptr.d = null; delete host.dataset.dragging;
    if (e.type === 'pointerup') {
      if (d !== focus()) { if (tap) setActive(d.i); }
      else if (tap && e.pointerType !== 'mouse') { manual = !manual; d.api.setShutter(manual); }
      else if (!tap && now - ptr.t < 90 && !reduced.matches) { d.u.iy = Math.max(-16, Math.min(16, ptr.vx)); if (e.pointerType === 'mouse') d.u.ip = Math.max(-6, Math.min(6, ptr.vy)); }
    }
    lastInput = now; wake();
  };
  const onLeave = () => { mouse.tx = mouse.ty = 0; if (ptr.id === null) applyHover(null); };
  host.addEventListener('pointerdown', onDown); host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onUp); host.addEventListener('pointercancel', onUp); host.addEventListener('pointerleave', onLeave);

  // ── loop
  let raf = 0, last = 0, clock = 0, visible = !document.hidden, onScreen = false, slow = 0, dead = false;
  const frames = [];
  const wake = () => { if (!raf && visible && onScreen && !dead) { last = 0; raf = requestAnimationFrame(tick); } };
  function settled() {
    return ptr.id === null && disks.every((d) => !d.exiting && !d.api.busy && Math.abs(d.u.vy) < 1e-3 && Math.abs(d.u.iy) < 1e-3 && Math.abs(d.u.yawT - d.u.yaw) < 1e-4
      && KEYS.every((k) => Math.abs(d.vel[k]) < 1e-4 && Math.abs(slots()[d.slot][k] - d.cur[k]) < 1e-4));
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
    for (const d of disks) {
      if (d.hold) { if (entered && now >= d.release) d.hold = false; else { place(d, clock); continue; } }
      const T = S[d.slot], order = Math.abs(rel(d.i)), K = d.soft > now ? 7 : d.slot === 'exit' ? 26 : 34 - order * 3.5, C = 2 * 0.86 * Math.sqrt(K), h = dt / 2;
      if (rm) for (const k of KEYS) { d.cur[k] = T[k]; d.vel[k] = 0; }
      else for (let n = 0; n < 2; n++) for (const k of KEYS) { d.vel[k] += (K * (T[k] - d.cur[k]) - C * d.vel[k]) * h; d.cur[k] += d.vel[k] * h; }
      d.cur.blur = Math.max(0, d.cur.blur); d.cur.s = Math.max(0.01, d.cur.s);
      if (d.exiting && (now - d.exiting > 620 || d.cur.x < -d.cur.s)) { d.exiting = 0; snap(d, d.after); }
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
    const order = [...disks].sort((a, b) => a.cur.s - b.cur.s);
    for (const d of disks) d.roll.visible = false;
    for (const d of order) {
      const c = d.cur, m = c.s * 0.9;
      if (c.x < -m || c.x > 1 + m || c.y * H < -m * W || c.y * H > H + m * W) continue; // off stage
      d.roll.visible = true;
      const b = c.blur * (W / 1680) * pr * (small.matches ? 2.2 : 1);
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
    if (!(rm && settled())) raf = requestAnimationFrame(tick);
  }
  const onVis = () => { visible = !document.hidden; if (visible) wake(); else { cancelAnimationFrame(raf); raf = 0; } };
  document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) wake(); else { cancelAnimationFrame(raf); raf = 0; } }, { rootMargin: '120px' });
  io.observe(host);
  const ioIn = new IntersectionObserver(([e]) => { if (e.isIntersecting) { ioIn.disconnect(); enter(); } }, { threshold: 0.35 });
  ioIn.observe(host);
  const ro = new ResizeObserver(fit); ro.observe(host);
  const onMedia = () => fit();
  small.addEventListener?.('change', onMedia); reduced.addEventListener?.('change', wake);
  fit();

  return {
    setActive, next: () => setActive(active + 1), prev: () => setActive(active - 1),
    get active() { return active; },
    get fps() { return frames.length ? Math.round(frames.length / frames.reduce((a, b) => a + b, 0)) : 0; },
    get quality() { return quality; },
    disks, renderer,
    enter, replay() { entered = false; disks.forEach((d) => { d.soft = 0; snap(d, slotKey(rel(d.i))); introPose(d); }); enter(); },
    renderNow() { onScreen = true; cancelAnimationFrame(raf); raf = 0; tick(performance.now()); },
    dispose() {
      dead = true; cancelAnimationFrame(raf); io.disconnect(); ioIn.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis); small.removeEventListener?.('change', onMedia); reduced.removeEventListener?.('change', wake);
      host.removeEventListener('pointerdown', onDown); host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp); host.removeEventListener('pointercancel', onUp); host.removeEventListener('pointerleave', onLeave);
      delete host.dataset.cursor; delete host.dataset.dragging;
      disks.forEach((d) => d.api.dispose()); scene.environment?.dispose();
      for (const k of [0.5, 0.25]) rts[k].forEach((t) => t.dispose());
      quadGeo.dispose(); blurMat.dispose(); blitMat.dispose(); renderer.dispose();
    },
  };
}
