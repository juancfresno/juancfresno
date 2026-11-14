// @ts-nocheck
/* The desk (Lab, bottom of the page): the room where it started, rebuilt from memory. A beige
   late-90s PC (CRT, tower on the desk, keyboard, mouse), the disk box and a few loose floppies with
   hand-written labels. No brands: the badge and the system on screen are Fresno's own.
   One WebGL canvas, three.js, units in mm, desk top at y = 0, front = +z.
   The screen is a 2D canvas (boot sequence, then a desktop that lists the Lab) used as a texture.
   v1 of 14 Nov 2026: the proportions come from memory and a reference photo, the real room's
   photos (desk, light, objects, the childhood photo for the frame) are still to come. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createFloppy } from './core.js';
import { buildBox } from './stage.js';

const FOV = 24, TAN = Math.tan((FOV * Math.PI) / 360);
const BEIGE = '#d9d3c1', BEIGE_D = '#bdb6a2', BEIGE_L = '#e4dfcf', DARK = '#24231f';
const SW = 640, SH = 480; // the screen, 4:3
const BOOT = 4.4; // seconds of BIOS before the desktop

function hand(title, sub, tint) { // a floppy label written by hand, as a data URL (2048 × 1700 like the Lab artwork)
  const c = document.createElement('canvas'); c.width = 1024; c.height = 850;
  const x = c.getContext('2d');
  x.fillStyle = '#f3efe2'; x.fillRect(0, 0, 1024, 850);
  x.fillStyle = tint; x.fillRect(0, 0, 1024, 120);
  x.strokeStyle = 'rgba(40, 60, 120, 0.28)'; x.lineWidth = 3;
  for (let y = 250; y < 800; y += 110) { x.beginPath(); x.moveTo(70, y); x.lineTo(954, y); x.stroke(); }
  x.fillStyle = '#1b2a6b'; x.textBaseline = 'alphabetic';
  x.save(); x.translate(90, 235); x.rotate(-0.025);
  x.font = 'italic 104px "Bradley Hand", "Marker Felt", "Segoe Print", "Comic Sans MS", cursive'; x.fillText(title, 0, 0, 860);
  x.font = 'italic 70px "Bradley Hand", "Marker Felt", "Segoe Print", "Comic Sans MS", cursive'; x.fillText(sub, 6, 112, 860);
  x.restore();
  return c.toDataURL('image/png');
}

function woodCanvas() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d'); x.fillStyle = '#a88660'; x.fillRect(0, 0, 1024, 512);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 520; i++) {
    const y = r() * 512, a = 0.03 + r() * 0.08;
    x.strokeStyle = r() > 0.5 ? `rgba(70, 44, 20, ${a})` : `rgba(240, 214, 170, ${a})`; x.lineWidth = 0.6 + r() * 2.2;
    x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(340, y + (r() - 0.5) * 14, 680, y + (r() - 0.5) * 14, 1024, y + (r() - 0.5) * 8); x.stroke();
  }
  return c;
}

export function createDesk(host, canvas, { items = [], games = [], strings = {} } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 100, 12000);
  const keep = [], k = (o) => (keep.push(o), o);

  { // the floppies' studio, a little dimmer: this is a room in the evening, lit by the window and the screen
    const room = new RoomEnvironment();
    room.traverse((o) => { if (o.isPointLight) o.intensity *= 0.16; else if (o.isMesh && o.material.isMeshBasicMaterial) o.material.color.multiplyScalar(0.3); });
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = k(pmrem.fromScene(room, 0.035).texture); scene.environmentIntensity = 0.75;
    pmrem.dispose(); room.dispose?.();
  }
  const sun = new THREE.DirectionalLight('#ffe9cf', 2.3); sun.position.set(-620, 980, 760); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 1.2; sun.shadow.radius = 5;
  Object.assign(sun.shadow.camera, { left: -1000, right: 1000, top: 900, bottom: -700, near: 100, far: 3200 }); sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#b9ccff', 0.9); rim.position.set(700, 500, -600); scene.add(rim);
  const glow = new THREE.PointLight('#7fd6ff', 0, 900, 1.6); scene.add(glow); // the screen lights the keyboard

  const mat = (color, roughness = 0.62, extra = {}) => k(new THREE.MeshPhysicalMaterial({ color, roughness, ...extra }));
  const beige = mat(BEIGE), beigeD = mat(BEIGE_D, 0.7), beigeL = mat(BEIGE_L, 0.55), dark = mat(DARK, 0.5), black = mat('#0b0b0a', 0.35);
  const shadowed = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };
  const box = (w, h, d, x, y, z, m, parent, r = 3) => {
    const mesh = shadowed(new THREE.Mesh(k(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) / 2.2))), m));
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  };
  const cyl = (r, h, x, y, z, m, parent, rx = 0) => {
    const mesh = shadowed(new THREE.Mesh(k(new THREE.CylinderGeometry(r, r, h, 40)), m));
    mesh.position.set(x, y, z); mesh.rotation.x = rx; parent.add(mesh); return mesh;
  };
  const plate = (w, h, draw, x, y, z, parent, emissive = false) => { // a small printed or lit surface
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round((512 * h) / w); draw(c.getContext('2d'), c.width, c.height);
    const t = k(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const m = new THREE.Mesh(k(new THREE.PlaneGeometry(w, h)), k(emissive ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })));
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const badge = (x, W, H) => { x.fillStyle = BEIGE_L; x.fillRect(0, 0, W, H); x.fillStyle = '#3d3b34'; x.font = `500 ${H * 0.56}px "Sometype Mono", ui-monospace, monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('FRESNO©', W / 2, H / 2 + 2); };

  const world = new THREE.Group(); scene.add(world);

  // ── desk
  const woodT = k(new THREE.CanvasTexture(woodCanvas())); woodT.colorSpace = THREE.SRGBColorSpace; woodT.wrapS = woodT.wrapT = THREE.RepeatWrapping; woodT.repeat.set(1.4, 1.2); woodT.anisotropy = 8;
  const desk = box(1560, 36, 900, 0, -18, 40, k(new THREE.MeshPhysicalMaterial({ map: woodT, roughness: 0.58, clearcoat: 0.25, clearcoatRoughness: 0.5 })), world, 6);
  desk.castShadow = false;

  // ── monitor (CRT)
  const mon = new THREE.Group(); mon.position.set(-110, 0, -70); mon.rotation.y = 0.14; world.add(mon);
  cyl(124, 14, 0, 7, -40, beige, mon); cyl(74, 30, 0, 28, -40, beigeD, mon);
  const MY = 212;
  box(396, 336, 96, 0, MY, 0, beige, mon, 12);
  box(340, 290, 250, 0, MY - 2, -160, beige, mon, 18);
  box(262, 226, 150, 0, MY - 6, -330, beigeD, mon, 22);
  box(330, 254, 6, 0, MY + 18, 46, beigeD, mon, 4); // the recess around the tube
  const screenC = document.createElement('canvas'); screenC.width = SW; screenC.height = SH;
  const sx = screenC.getContext('2d');
  const screenT = k(new THREE.CanvasTexture(screenC)); screenT.colorSpace = THREE.SRGBColorSpace; screenT.anisotropy = 8;
  const tube = new THREE.Mesh(k(new THREE.PlaneGeometry(300, 225, 24, 18)), k(new THREE.MeshBasicMaterial({ map: screenT, toneMapped: false })));
  { const p = tube.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i) / 150, v = p.getY(i) / 112.5; p.setZ(i, 5 * (1 - (u * u + v * v) / 2)); } p.needsUpdate = true; tube.geometry.computeVertexNormals(); } // the tube bulges
  tube.position.set(0, MY + 18, 49.2); mon.add(tube);
  const glass = new THREE.Mesh(tube.geometry, k(new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, roughness: 0.04, clearcoat: 1, envMapIntensity: 1.4, depthWrite: false })));
  glass.position.set(0, MY + 18, 49.9); mon.add(glass);
  plate(52, 13, badge, 0, MY - 136, 48.4, mon);
  cyl(7, 4, 150, MY - 138, 48, beigeL, mon, Math.PI / 2);
  const led = cyl(2.2, 3, 128, MY - 138, 48, k(new THREE.MeshBasicMaterial({ color: '#3dff7a', toneMapped: false })), mon, Math.PI / 2); led.castShadow = false;
  for (let i = 0; i < 4; i++) box(9, 4, 4, -150 + i * 16, MY - 138, 48, beigeD, mon, 1);

  // ── tower, on the desk next to the monitor (it used to live on the floor)
  const tow = new THREE.Group(); tow.position.set(300, 0, -60); tow.rotation.y = -0.2; world.add(tow);
  box(192, 432, 440, 0, 216, 0, beige, tow, 6);
  const FZ = 221;
  box(188, 428, 8, 0, 216, FZ, beigeL, tow, 4);
  box(152, 43, 4, 0, 384, FZ + 4, beigeD, tow, 2); box(140, 2, 2, 0, 388, FZ + 6.4, dark, tow, 0.5); box(16, 6, 3, 56, 372, FZ + 6.4, beigeL, tow, 1); // CD drive
  box(152, 43, 4, 0, 335, FZ + 4, beigeD, tow, 2); // empty bay
  box(108, 30, 4, 0, 284, FZ + 4, beigeD, tow, 2); // 3.5" drive
  const slot = box(92, 4.2, 3, 0, 288, FZ + 6, black, tow, 0.6); slot.castShadow = false;
  box(11, 6, 4, 40, 275, FZ + 6.4, beigeL, tow, 1);
  const driveLed = box(5, 2.4, 2, -42, 275, FZ + 6.4, k(new THREE.MeshBasicMaterial({ color: '#2a3a1a', toneMapped: false })), tow, 0.4); driveLed.castShadow = false;
  cyl(12, 5, 0, 222, FZ + 5, beigeD, tow, Math.PI / 2); cyl(5, 5, 34, 222, FZ + 5, beigeD, tow, Math.PI / 2);
  const pw = cyl(2, 3, -30, 222, FZ + 5, k(new THREE.MeshBasicMaterial({ color: '#3dff7a', toneMapped: false })), tow, Math.PI / 2); pw.castShadow = false;
  const hdd = cyl(2, 3, -40, 222, FZ + 5, k(new THREE.MeshBasicMaterial({ color: '#ffb02e', toneMapped: false })), tow, Math.PI / 2); hdd.castShadow = false;
  plate(56, 14, badge, 0, 170, FZ + 4.3, tow);
  for (let i = 0; i < 7; i++) box(120, 2.2, 2, 0, 52 + i * 9, FZ + 4.4, dark, tow, 0.5).castShadow = false;

  // ── keyboard
  const kb = new THREE.Group(); kb.position.set(-110, 0, 290); kb.rotation.y = 0.07; world.add(kb);
  const kbody = new THREE.Group(); kbody.rotation.x = 0.075; kb.add(kbody);
  box(456, 20, 168, 0, 13, 0, beige, kbody, 5);
  const keys = [];
  const row = (z, x0, n, w = 17, pitch = 19.05) => { for (let i = 0; i < n; i++) keys.push([x0 + i * pitch, z, w]); };
  for (let r = 0; r < 5; r++) { row(-48 + r * 19.05, -214 + (r % 2) * 5, 14); row(-48 + r * 19.05, 76, 3); row(-48 + r * 19.05, 148, 4); }
  row(-70, -214, 14, 15, 19.05); row(-70, 76, 3, 15);
  const keyG = k(new RoundedBoxGeometry(17, 8, 17, 2, 2)), keyM = new THREE.InstancedMesh(keyG, beigeL, keys.length), dm = new THREE.Object3D();
  keys.forEach(([x, z, w], i) => { dm.position.set(x, 26, z); dm.scale.set(w / 17, 1, w === 15 ? 0.7 : 1); dm.updateMatrix(); keyM.setMatrixAt(i, dm.matrix); });
  keyM.castShadow = true; keyM.receiveShadow = true; kbody.add(keyM);
  box(112, 8, 17, -90, 26, 47.2, beigeL, kbody, 2); // space bar

  // ── mouse, pad and cable
  box(230, 3, 196, 250, 1.5, 305, mat('#1a2550', 0.85), world, 2).castShadow = false;
  const mouse = new THREE.Group(); mouse.position.set(240, 3, 310); mouse.rotation.y = -0.25; world.add(mouse);
  box(60, 30, 102, 0, 15, 0, beige, mouse, 14); box(1.2, 4, 44, 0, 28.6, -28, beigeD, mouse, 0.4).castShadow = false; box(56, 1.2, 1.2, 0, 27, -6, beigeD, mouse, 0.4).castShadow = false;
  const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(228, 12, 262), new THREE.Vector3(205, 3, 190), new THREE.Vector3(150, 3, 110), new THREE.Vector3(170, 3, 10), new THREE.Vector3(215, 3, -120)]);
  world.add(shadowed(new THREE.Mesh(k(new THREE.TubeGeometry(cable, 48, 1.8, 8)), beigeD)));

  // ── the disk box, lid open, and the loose floppies
  const dbox = buildBox(Math.max(6, items.length), Math.max(6, items.length)); dbox.g.position.set(-520, 0, 60); dbox.g.rotation.y = 0.55; dbox.lid.rotation.x = -1.9;
  dbox.g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = true; } }); world.add(dbox.g);
  const shared = {}, loose = [];
  const SPOTS = [ // x, y (stacking), z, turn; the last one sits on the tower
    [-470, 1.75, 330, 0.35], [-430, 5.2, 350, -0.3], [-610, 1.75, 300, -0.7], [70, 1.75, 440, 0.18], [470, 1.75, 180, -0.5],
  ];
  const TINTS = [{ shell: '#10100E', tint: '#c83a2a' }, { shell: '#2F6BFF', tint: '#e8b42a' }, { shell: '#8F8D87', tint: '#2a7a4a' }, { shell: '#10100E', tint: '#2f6bff' }, { shell: '#c9382c', tint: '#10100e' }];
  games.slice(0, SPOTS.length).forEach((gm, i) => {
    const api = createFloppy({ n: String(i + 1).padStart(3, '0'), title: gm.title, en: gm.title, kind: '', year: '' }, { shared, maxAnisotropy: renderer.capabilities.getMaxAnisotropy(), labelScale: 0.5, shell: TINTS[i % TINTS.length].shell });
    api.setLabelImage(hand(gm.title, gm.sub || '', TINTS[i % TINTS.length].tint)).then(wake).catch(() => {});
    const g = new THREE.Group(), [x, y, z, a] = SPOTS[i]; g.position.set(x, y, z); g.rotation.set(-Math.PI / 2, 0, a); g.add(api.group); api.update(0, true);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); world.add(g); loose.push(api);
  });

  // ── the photo frame (the photo itself is still to come)
  const frame = new THREE.Group(); frame.position.set(-600, 0, -210); frame.rotation.set(-0.2, 0.55, 0, 'YXZ'); world.add(frame);
  box(136, 176, 9, 0, 92, 0, mat('#2c2018', 0.5), frame, 2);
  plate(112, 152, (x, W, H) => {
    x.fillStyle = '#e9e3d2'; x.fillRect(0, 0, W, H); x.strokeStyle = '#8f8a7a'; x.setLineDash([14, 10]); x.lineWidth = 4; x.strokeRect(34, 34, W - 68, H - 68);
    x.fillStyle = '#6b665a'; x.font = '500 30px "Sometype Mono", ui-monospace, monospace'; x.textAlign = 'center'; (strings.photo || 'PHOTO · PENDING').split('\n').forEach((l, i) => x.fillText(l, W / 2, H / 2 + i * 44));
  }, 0, 92, 4.8, frame);

  // ── the screen
  const list = items.length ? items : [{ n: '001', name: 'Lab', kind: '' }];
  const mono = (px, w = 500) => `${w} ${px}px "Sometype Mono", ui-monospace, Menlo, monospace`;
  const bevel = (x0, y0, w, h, inset = false) => {
    sx.fillStyle = '#c6c3ba'; sx.fillRect(x0, y0, w, h);
    sx.fillStyle = inset ? '#5d5a52' : '#f6f4ec'; sx.fillRect(x0, y0, w, 2); sx.fillRect(x0, y0, 2, h);
    sx.fillStyle = inset ? '#f6f4ec' : '#5d5a52'; sx.fillRect(x0, y0 + h - 2, w, 2); sx.fillRect(x0 + w - 2, y0, 2, h);
  };
  const BIOS = ['FRESNO BIOS v1.998 — VALENCIA', '', 'CPU ....... CURIOSITY 233 MHz', 'MEMORY .... ', 'DRIVE A: .. 3.5 IN · 1.44 MB', 'DRIVE C: .. ' + String(list.length).padStart(3, '0') + ' EXPERIMENTS FOUND', '', 'C:\\> LAB.EXE'];
  let sel = -1;
  function drawScreen(t) {
    sx.textBaseline = 'alphabetic'; sx.textAlign = 'left';
    if (t < BOOT) { // BIOS: one line every 0.42 s, the memory counts up, the last line is typed
      sx.fillStyle = '#050607'; sx.fillRect(0, 0, SW, SH); sx.fillStyle = '#d9f2d0'; sx.font = mono(19);
      const n = Math.floor((t - 0.4) / 0.42);
      for (let i = 0; i <= Math.min(n, BIOS.length - 1); i++) {
        let l = BIOS[i];
        if (i === 3) l += Math.min(65536, Math.floor(((t - 0.4 - 3 * 0.42) / 0.8) * 65536 / 512) * 512) + 'K' + (t > 0.4 + 3 * 0.42 + 0.8 ? ' OK' : '');
        if (i === BIOS.length - 1) l = l.slice(0, 5 + Math.floor((t - 0.4 - i * 0.42) / 0.07)) + (Math.floor(t * 4) % 2 ? '█' : '');
        sx.fillText(l, 34, 62 + i * 30);
      }
    } else {
      const d = t - BOOT, n = list.length, cur = Math.floor(d / 2.6) % n;
      sel = cur;
      sx.fillStyle = '#0f6f73'; sx.fillRect(0, 0, SW, SH);
      // desktop icons
      sx.font = mono(13);
      [[strings.icons?.[0] || 'My desk', '#f6f4ec'], [strings.icons?.[1] || 'Lab', '#003dff'], [strings.icons?.[2] || 'Games', '#ffcf3a'], [strings.icons?.[3] || 'Bin', '#c6c3ba']].forEach(([l, c], i) => {
        const y = 26 + i * 78; sx.fillStyle = '#10100e'; sx.fillRect(34, y, 36, 30); sx.fillStyle = c; sx.fillRect(37, y + 3, 30, 24); sx.fillStyle = '#10100e'; sx.fillRect(43, y + 9, 8, 8);
        sx.fillStyle = '#ffffff'; sx.textAlign = 'center'; sx.fillText(l, 52, y + 48); sx.textAlign = 'left';
      });
      // note window, behind
      bevel(330, 34, 268, 132); sx.fillStyle = '#7b786f'; sx.fillRect(334, 38, 260, 22); sx.fillStyle = '#e9e6dc'; sx.font = mono(13); sx.fillText('NOTE.TXT', 342, 54);
      sx.fillStyle = '#ffffff'; sx.fillRect(336, 62, 256, 98); sx.fillStyle = '#10100e'; sx.font = mono(13, 400);
      (strings.note || 'This is where I started\nimagining everything.').split('\n').forEach((l, i) => sx.fillText(l, 346, 86 + i * 20));
      // the Lab window
      const wx = 118, wy = 118, ww = 430, wh = 286; bevel(wx, wy, ww, wh);
      sx.fillStyle = '#003dff'; sx.fillRect(wx + 4, wy + 4, ww - 8, 24); sx.fillStyle = '#ffffff'; sx.font = mono(14); sx.fillText('LAB.EXE', wx + 12, wy + 21);
      bevel(wx + ww - 26, wy + 7, 18, 18); sx.fillStyle = '#10100e'; sx.font = mono(13); sx.fillText('×', wx + ww - 21, wy + 21);
      sx.fillStyle = '#10100e'; sx.font = mono(12, 400); sx.fillText(strings.menu || 'File   Edit   View   Help', wx + 12, wy + 46);
      bevel(wx + 8, wy + 54, ww - 16, wh - 88, true); sx.fillStyle = '#ffffff'; sx.fillRect(wx + 10, wy + 56, ww - 20, wh - 92);
      list.slice(0, 7).forEach((it, i) => {
        const y = wy + 62 + i * 27, on = i === cur;
        if (on) { sx.fillStyle = '#003dff'; sx.fillRect(wx + 12, y, ww - 24, 25); }
        sx.fillStyle = on ? '#ffffff' : '#10100e'; sx.font = mono(15); sx.fillText(it.n, wx + 22, y + 18); sx.fillText(it.name, wx + 78, y + 18);
        sx.font = mono(11, 400); sx.textAlign = 'right'; sx.fillText(String(it.kind || '').toUpperCase(), wx + ww - 24, y + 17); sx.textAlign = 'left';
      });
      sx.fillStyle = '#10100e'; sx.font = mono(12, 400); sx.fillText(`${n} ${strings.objects || 'object(s)'}`, wx + 12, wy + wh - 12);
      // taskbar and clock
      bevel(0, SH - 34, SW, 34); bevel(5, SH - 29, 92, 24); sx.fillStyle = '#003dff'; sx.fillRect(12, SH - 23, 12, 12); sx.fillStyle = '#10100e'; sx.font = mono(14); sx.fillText('Fresno', 31, SH - 12);
      bevel(104, SH - 29, 130, 24, true); sx.font = mono(12, 400); sx.fillText('LAB.EXE', 114, SH - 12);
      bevel(SW - 78, SH - 29, 72, 24, true);
      let hm = '00:00'; try { hm = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }).format(new Date()); } catch {}
      sx.fillText(hm, SW - 64, SH - 12);
      // the pointer travels to the selected row
      const f = Math.min(1, ((d / 2.6) % 1) / 0.35), e = 1 - (1 - f) * (1 - f), prev = (cur - 1 + n) % n;
      const px = wx + 250 + Math.sin(cur * 2.1) * 60, py0 = wy + 76 + prev * 27, py1 = wy + 76 + cur * 27, py = d < 2.6 ? py1 : py0 + (py1 - py0) * e;
      sx.fillStyle = '#ffffff'; sx.strokeStyle = '#10100e'; sx.lineWidth = 1.5; sx.beginPath(); sx.moveTo(px, py); sx.lineTo(px, py + 17); sx.lineTo(px + 4.5, py + 13); sx.lineTo(px + 8, py + 20); sx.lineTo(px + 11, py + 18.5); sx.lineTo(px + 7.5, py + 12); sx.lineTo(px + 13, py + 12); sx.closePath(); sx.fill(); sx.stroke();
    }
    sx.fillStyle = 'rgba(0, 0, 0, 0.16)'; for (let y = 0; y < SH; y += 3) sx.fillRect(0, y, SW, 1); // scan lines
    const v = sx.createRadialGradient(SW / 2, SH / 2, SH * 0.35, SW / 2, SH / 2, SH * 0.82); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.42)'); sx.fillStyle = v; sx.fillRect(0, 0, SW, SH);
    screenT.needsUpdate = true;
  }

  // ── camera: three-quarter view from the chair, a little from the left; the pointer moves it slightly
  const small = matchMedia('(max-width: 768px)');
  const target = new THREE.Vector3(), ptr = { x: 0, y: 0, cx: 0, cy: 0, t: -1e9 };
  let W = 1, H = 1;
  function fit() {
    W = Math.max(1, host.clientWidth); H = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix(); wake();
  }
  function aim() {
    const m = small.matches, rw = m ? 470 : 900, rh = m ? 330 : 430; // half extents that must stay in view
    const dist = Math.max(rw / (TAN * camera.aspect), rh / TAN) * 1.04;
    const az = (m ? -0.3 : -0.3) + ptr.cx * 0.1, el = (m ? 0.3 : 0.34) - ptr.cy * 0.05;
    target.set(m ? 70 : -30, m ? 190 : 120, m ? 60 : 110);
    camera.position.set(target.x + dist * Math.sin(az) * Math.cos(el), target.y + dist * Math.sin(el), target.z + dist * Math.cos(az) * Math.cos(el));
    camera.lookAt(target);
  }
  const onMove = (e) => { const r = host.getBoundingClientRect(); ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.y = ((e.clientY - r.top) / r.height) * 2 - 1; ptr.t = performance.now(); wake(); };
  const onLeave = () => { ptr.x = ptr.y = 0; ptr.t = performance.now(); wake(); };
  host.addEventListener('pointermove', onMove); host.addEventListener('pointerleave', onLeave);

  // ── loop: full rate while something moves, about 10 fps when only the screen changes
  let raf = 0, last = 0, clock = 0, drawn = -1, shown = -1, visible = !document.hidden, onScreen = false, started = reduced.matches, dead = false;
  function wake() { if (!raf && visible && onScreen && !dead) { last = 0; raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0; if (dead) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (started) clock += dt;
    const rm = reduced.matches, t = rm ? BOOT + 1 : clock;
    const kx = rm ? 0 : ptr.x, ky = rm ? 0 : ptr.y, a = 1 - Math.exp(-dt * 5);
    ptr.cx += (kx - ptr.cx) * a; ptr.cy += (ky - ptr.cy) * a;
    const moving = Math.abs(kx - ptr.cx) + Math.abs(ky - ptr.cy) > 0.002;
    const step = Math.floor(t * 10);
    if (step !== drawn || moving || shown < 0) {
      if (step !== drawn) {
        drawn = step; drawScreen(t);
        const on = t > 0.3 ? 1 : 0, flick = t < BOOT ? 0.5 : 1;
        tube.material.color.setScalar(on); glow.intensity = on * flick * 26000;
        driveLed.material.color.set(t < BOOT && t > 2 && Math.floor(t * 9) % 2 ? '#7dff5a' : '#2a3a1a');
        hdd.material.color.set(Math.floor(t * 7 + Math.sin(t * 3) * 2) % 3 ? '#3a2a10' : '#ffb02e');
      }
      aim(); glow.position.copy(mon.localToWorld(new THREE.Vector3(0, MY, 190)));
      renderer.render(scene, camera); shown = step;
    }
    if (!rm || shown < 0) raf = requestAnimationFrame(tick);
  }
  const onVis = () => { visible = !document.hidden; if (visible) wake(); else { cancelAnimationFrame(raf); raf = 0; } };
  document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) wake(); else { cancelAnimationFrame(raf); raf = 0; } }, { rootMargin: '120px' });
  io.observe(host);
  const ioIn = new IntersectionObserver(([e]) => { if (e.isIntersecting) { ioIn.disconnect(); started = true; wake(); } }, { threshold: 0.4 }); // the PC boots when you get there
  ioIn.observe(host);
  const ro = new ResizeObserver(fit); ro.observe(host);
  const onMedia = () => { shown = -1; wake(); };
  small.addEventListener?.('change', onMedia); reduced.addEventListener?.('change', onMedia);
  fit();

  return {
    get clock() { return clock; }, get selected() { return sel; }, renderer, scene, camera,
    renderNow(skip = 0) { onScreen = true; started = true; clock += skip; shown = -1; cancelAnimationFrame(raf); raf = 0; tick(performance.now()); },
    dispose() {
      dead = true; cancelAnimationFrame(raf); io.disconnect(); ioIn.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave);
      small.removeEventListener?.('change', onMedia); reduced.removeEventListener?.('change', onMedia);
      loose.forEach((a) => a.dispose()); dbox.dispose(); keyM.dispose(); keep.forEach((o) => o.dispose?.()); renderer.dispose();
    },
  };
}
