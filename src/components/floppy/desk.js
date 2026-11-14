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

const ORDER = ['dos', 'pc', 'big', 'touch', 'now']; // the timeline, oldest first

export function createDesk(host, canvas, { items = [], games = [], strings = {}, start = 'pc' } = {}) {
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

  const base = new THREE.Group(); scene.add(base); // the table stays; `world` = the group the next objects go into
  let world = base;

  // ── desk
  const woodT = k(new THREE.CanvasTexture(woodCanvas())); woodT.colorSpace = THREE.SRGBColorSpace; woodT.wrapS = woodT.wrapT = THREE.RepeatWrapping; woodT.repeat.set(1.4, 1.2); woodT.anisotropy = 8;
  const desk = box(1560, 36, 900, 0, -18, 40, k(new THREE.MeshPhysicalMaterial({ map: woodT, roughness: 0.58, clearcoat: 0.25, clearcoatRoughness: 0.5 })), world, 6);
  desk.castShadow = false;

  // ══ 2002 · my own PC, at sixteen, in my room
  const pcG = new THREE.Group(); pcG.visible = false; base.add(pcG); world = pcG;

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
  function drawPc(t) {
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
    tube.material.color.setScalar(t > 0.3 ? 1 : 0);
    driveLed.material.color.set(t < BOOT && t > 2 && Math.floor(t * 9) % 2 ? '#7dff5a' : '#2a3a1a');
    hdd.material.color.set(Math.floor(t * 7 + Math.sin(t * 3) * 2) % 3 ? '#3a2a10' : '#ffb02e');
  }

  // ══ the other desks. Same table, another time: each era is a group of objects, a screen and a framing.
  const al = (c, r = 0.36) => mat(c, r, { metalness: 0.88 });
  const white = mat('#f2f1ec', 0.4);
  const flat = (w, h, cw, ch, parent, x, y, z) => { // a lit screen: plane + its own 2D canvas
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const t = k(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const m = new THREE.Mesh(k(new THREE.PlaneGeometry(w, h)), k(new THREE.MeshBasicMaterial({ map: t, toneMapped: false })));
    m.position.set(x, y, z); parent.add(m); return { x: c.getContext('2d'), t, m, W: cw, H: ch };
  };
  const keyGrid = (parent, m, cols, rows, x0, z0, pitch, w, h, y) => {
    const g = k(new RoundedBoxGeometry(w, h, w, 2, Math.min(1.4, h / 2.4))), im = new THREE.InstancedMesh(g, m, cols * rows), o = new THREE.Object3D();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { o.position.set(x0 + c * pitch, y, z0 + r * pitch); o.updateMatrix(); im.setMatrixAt(r * cols + c, o.matrix); }
    im.castShadow = false; im.receiveShadow = true; parent.add(im); keep.push(im); return im;
  };
  function laptop(parent, { x, z, y = 0, ry = 0, color, bar = false }) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
    const body = al(color);
    box(312, 9, 218, 0, 4.5, 0, body, g, 4);
    box(284, 0.8, 106, 0, 9.1, -36, black, g, 0.3).castShadow = false;
    keyGrid(g, mat('#17171a', 0.6), 14, bar ? 4 : 5, -124, bar ? -62 : -80, 19.05, 16.5, 1.6, 9.9);
    box(128, 0.6, 78, 0, 9.1, 62, al(color, 0.28), g, 0.2).castShadow = false;
    const lid = new THREE.Group(); lid.position.set(0, 9, -109); lid.rotation.x = -1.92; g.add(lid);
    box(312, 5, 218, 0, 2.5, 109, body, lid, 3); box(308, 1, 214, 0, -0.3, 109, black, lid, 0.4).castShadow = false;
    const s = flat(292, 182.5, 800, 500, lid, 0, -1, 109); s.m.rotation.x = Math.PI / 2;
    const tb = bar ? flat(276, 10, 828, 30, g, 0, 9.7, -81.5) : null; if (tb) tb.m.rotation.x = -Math.PI / 2;
    return { g, s, tb };
  }
  const ERAS = [];
  const era = (key, cam) => { const g = new THREE.Group(); g.visible = false; base.add(g); const e = { key, g, cam, draw() {}, glow: [0, 200, 200], glowC: '#7fd6ff', glowK: 1, t0: 0, tint: '#ffffff' }; ERAS.push(e); return e; };
  const tx = (s) => { s.x.textBaseline = 'alphabetic'; s.x.textAlign = 'left'; };
  ERAS.push({ key: 'pc', g: pcG, cam: { rw: 900, rh: 430, t: [-30, 120, 110], az: -0.3, el: 0.34, m: { rw: 470, rh: 330, t: [70, 190, 60] } }, draw: drawPc, glow: [-110, 212, 120], glowC: '#7fd6ff', glowK: 1, t0: 0, tint: '#ffffff' });

  // ── 1990 · MS-DOS, my father's computer: a flat case under a small green-phosphor monitor, 5.25" disks
  const dos = era('dos', { rw: 760, rh: 380, t: [-10, 120, 90], az: -0.3, el: 0.34, m: { rw: 430, rh: 320, t: [0, 170, 40] } });
  {
    world = dos.g;
    const grey = mat('#c9c3b2', 0.7), greyD = mat('#aaa391', 0.72);
    const pc = new THREE.Group(); pc.position.set(-40, 0, -70); pc.rotation.y = 0.1; world.add(pc);
    box(470, 150, 420, 0, 75, 0, grey, pc, 5); box(466, 146, 6, 0, 75, 211, mat('#d6d1c2', 0.6), pc, 3);
    for (const dx of [40, 0]) { // two 5.25" drives, one over the other
      const y = 104 - dx; box(160, 36, 4, 130, y, 215, dark, pc, 1.5); box(140, 3, 2, 130, y, 217.6, black, pc, 0.5).castShadow = false; box(22, 7, 7, 130, y + 8, 218, greyD, pc, 1);
    }
    box(26, 14, 8, -200, 40, 216, mat('#c8402e', 0.5), pc, 2); plate(64, 14, badge, -150, 112, 214.4, pc);
    for (let i = 0; i < 9; i++) box(4, 60, 2, -196 + i * 11, 78, 214.6, greyD, pc, 0.5).castShadow = false;
    const mY = 150 + 20 + 150;
    cyl(90, 20, 0, 160, -20, greyD, pc); box(360, 300, 100, 0, mY, 10, grey, pc, 10); box(310, 256, 240, 0, mY - 4, -150, grey, pc, 16); box(292, 228, 6, 0, mY + 14, 58, greyD, pc, 4);
    const sc = flat(264, 198, 640, 480, pc, 0, mY + 14, 62); cyl(8, 5, 150, mY - 126, 60, greyD, pc, Math.PI / 2);
    const kbd = new THREE.Group(); kbd.position.set(-60, 0, 280); kbd.rotation.set(0, 0.05, 0); world.add(kbd);
    const kin = new THREE.Group(); kin.rotation.x = 0.1; kbd.add(kin); box(480, 34, 190, 0, 19, 0, grey, kin, 5);
    keyGrid(kin, mat('#e6e2d6', 0.6), 15, 5, -190, -56, 19.05, 17, 10, 39); keyGrid(kin, greyD, 4, 5, 124, -56, 19.05, 17, 10, 39);
    const vinyl = mat('#161615', 0.55), lab = ['PRINCE', 'DOS 3.3', 'JUEGOS'];
    [[320, 1, 300, 0.3], [356, 2.8, 330, -0.25], [-430, 1, 250, 0.5]].forEach(([x, y, z, a], i) => { // 5.25" floppies
      const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = a; world.add(f);
      box(133, 1.6, 133, 0, 0, 0, vinyl, f, 0.4);
      const l = plate(96, 26, (c, W, H) => { c.fillStyle = '#efe9d6'; c.fillRect(0, 0, W, H); c.fillStyle = '#1b2a6b'; c.font = `italic ${H * 0.6}px "Bradley Hand", "Marker Felt", "Segoe Print", cursive`; c.fillText(lab[i], 22, H * 0.7); }, -8, 0.95, -44, f); l.rotation.x = -Math.PI / 2;
      const hole = cyl(14, 0.4, 0, 0.9, 6, mat('#3a3935', 0.4), f); hole.castShadow = false;
    });
    box(142, 3, 142, -470, 4, 300, mat('#e8e2cf', 0.9), world, 0.6).rotation.y = -0.2; // a paper sleeve
    const LINES = ['C:\\>dir', '', ' Volume in drive C is FRESNO', '', 'PRINCE   EXE    123.335', 'SHINOBI  EXE     98.112', 'MONKEY   EXE    301.774', 'PAPA     TXT        512', '        4 file(s)', '', 'C:\\>prince'];
    dos.draw = (t) => {
      const x = sc.x; tx(sc); x.fillStyle = '#020503'; x.fillRect(0, 0, 640, 480);
      if (t > 0.35) {
        x.fillStyle = '#58f08a'; x.font = mono(22); x.shadowColor = '#58f08a'; x.shadowBlur = 6;
        const tt = (t - 0.35) % 14, typed = Math.floor(tt / 0.12);
        LINES.forEach((l, i) => {
          if (i === 0) x.fillText(l.slice(0, 4 + typed), 28, 50);
          else if (i < LINES.length - 1) { if (tt > 1.2 + i * 0.12) x.fillText(l, 28, 50 + i * 34); }
          else if (tt > 3.4) x.fillText(l.slice(0, 4 + Math.floor((tt - 4.2) / 0.16)) + (Math.floor(t * 3) % 2 ? '_' : ''), 28, 50 + i * 34);
        });
        x.shadowBlur = 0;
      }
      x.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < 480; y += 3) x.fillRect(0, y, 640, 1);
      sc.t.needsUpdate = true;
    };
    dos.glow = [-40, 300, 160]; dos.glowC = '#58f08a'; dos.glowK = 0.5; dos.tint = '#b89a78';
  }

  // ── 2011 · the big screen: an aluminium all-in-one, low keyboard, white mouse
  const big = era('big', { rw: 700, rh: 400, t: [0, 190, 80], az: -0.26, el: 0.3, m: { rw: 420, rh: 330, t: [0, 230, 40] } });
  {
    world = big.g; const silver = al('#c9cbcd');
    const im = new THREE.Group(); im.position.set(0, 0, -90); im.rotation.y = 0.1; world.add(im);
    box(220, 5, 190, 0, 2.5, -30, silver, im, 2);
    const neck = box(160, 330, 9, 0, 160, -74, silver, im, 3); neck.rotation.x = -0.16;
    const head = new THREE.Group(); head.position.set(0, 105, -30); head.rotation.x = -0.07; im.add(head);
    box(652, 96, 18, 0, 48, 0, silver, head, 7); box(652, 374, 18, 0, 96 + 187, 0, silver, head, 7); box(650, 372, 2, 0, 283, 9.4, black, head, 3).castShadow = false;
    const sc = flat(604, 340, 960, 540, head, 0, 283, 10.6);
    const dot = cyl(9, 1, 0, 48, 9.4, al('#aeb0b2'), head, Math.PI / 2); dot.castShadow = false;
    const kbd = new THREE.Group(); kbd.position.set(-40, 0, 250); kbd.rotation.y = 0.04; world.add(kbd);
    const kin = new THREE.Group(); kin.rotation.x = 0.05; kbd.add(kin); box(284, 6, 118, 0, 5, 0, silver, kin, 3); keyGrid(kin, white, 14, 5, -124, -40, 19.05, 16.5, 2, 9);
    box(58, 22, 112, 210, 11, 262, white, world, 11);
    const mug = new THREE.Group(); mug.position.set(-440, 0, 150); world.add(mug); cyl(42, 96, 0, 48, 0, mat('#1d2a6b', 0.35), mug); cyl(36, 2, 0, 95.5, 0, mat('#2a1a10', 0.3), mug).castShadow = false;
    box(210, 16, 290, 430, 8, 120, mat('#10100e', 0.8), world, 3).rotation.y = -0.25; // a sketchbook
    big.draw = (t) => {
      const x = sc.x, W = 960, H = 540; tx(sc);
      x.fillStyle = '#2a2b2e'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#e9e9e6'; x.fillRect(0, 0, W, 24); x.fillStyle = '#10100e'; x.font = mono(13); x.fillText('■ Fresno   File   Edit   Object   Type   View', 14, 17);
      x.fillStyle = '#3a3b3f'; x.fillRect(0, 24, 46, H - 24); for (let i = 0; i < 9; i++) { x.fillStyle = i === Math.floor(t / 3) % 9 ? '#003dff' : '#5a5b60'; x.fillRect(12, 40 + i * 34, 22, 22); }
      x.fillStyle = '#3a3b3f'; x.fillRect(W - 190, 24, 190, H - 24); x.font = mono(11, 400);
      ['Layers', 'Headline', 'Grid 12', 'Photo', 'Footer', 'Background'].forEach((l, i) => { if (i === 1 + Math.floor(t / 2.2) % 5) { x.fillStyle = '#003dff'; x.fillRect(W - 186, 36 + i * 26, 182, 22); } x.fillStyle = i ? '#d8d8d4' : '#8e8f93'; x.fillText(l, W - 174, 52 + i * 26); });
      // the artboard: a poster being laid out
      const ax = 250, ay = 60, aw = 300, ah = 424; x.fillStyle = '#fcfcf7'; x.fillRect(ax, ay, aw, ah);
      x.fillStyle = '#003dff'; x.fillRect(ax + 22, ay + 22, aw - 44, 150 + Math.sin(t * 0.8) * 16);
      x.fillStyle = '#10100e'; x.font = `500 62px "Switzer", sans-serif`; x.fillText('Lab', ax + 22, ay + 262); x.font = mono(11, 400);
      for (let i = 0; i < 5; i++) x.fillRect(ax + 22, ay + 290 + i * 16, (aw - 44) * (i === 4 ? 0.5 : 0.92), 5);
      x.strokeStyle = 'rgba(0,61,255,0.5)'; x.lineWidth = 1; for (let i = 0; i <= 6; i++) { const gx = ax + 22 + ((aw - 44) / 6) * i; x.beginPath(); x.moveTo(gx, ay); x.lineTo(gx, ay + ah); x.stroke(); }
      x.fillStyle = 'rgba(233,233,230,0.85)'; x.fillRect(W / 2 - 150, H - 46, 300, 38); ['#003dff', '#ff7a1a', '#58c08a', '#10100e', '#c83a2a', '#e8b42a', '#8f8d87'].forEach((c, i) => { x.fillStyle = c; x.fillRect(W / 2 - 136 + i * 40, H - 40, 26, 26); });
      sc.t.needsUpdate = true;
    };
    big.glow = [0, 330, 200]; big.glowC = '#cfd8ff'; big.glowK = 0.7; big.tint = '#e6dccb';
  }

  // ── 2017 · the laptop with the little screen on the keyboard
  const code = (s, t, bar) => { // an editor on the left, what it builds on the right
    const x = s.x, W = s.W, H = s.H; tx(s);
    x.fillStyle = '#17181b'; x.fillRect(0, 0, W, H); x.fillStyle = '#0f1012'; x.fillRect(0, 0, 150, H);
    x.font = mono(12, 400); ['lab/', '  floppy/', '    core.js', '    stage.js', '    desk.js', '  page.tsx'].forEach((l, i) => { x.fillStyle = i === 4 ? '#ffffff' : '#7d7f86'; x.fillText(l, 14, 34 + i * 22); });
    const cols = ['#c792ea', '#82aaff', '#c3e88d', '#f78c6c', '#89ddff'], n = Math.floor((t * 3) % 22) + 3;
    for (let i = 0; i < Math.min(n, 20); i++) { let cx = 170 + ((i * 7) % 3) * 18; for (let j = 0; j < 2 + ((i * 5) % 4); j++) { const w = 24 + ((i * 13 + j * 29) % 70); x.fillStyle = cols[(i + j * 2) % 5]; x.fillRect(cx, 22 + i * 21, w, 8); cx += w + 8; } }
    if (Math.floor(t * 2) % 2) { x.fillStyle = '#ffffff'; x.fillRect(170, 22 + Math.min(n, 20) * 21, 8, 12); }
    const px = W * 0.56; x.fillStyle = '#10100e'; x.fillRect(px, 0, W - px, H); x.fillStyle = '#26272b'; x.fillRect(px, 0, W - px, 26); x.fillStyle = '#9a9ca3'; x.fillText('localhost:3000/lab', px + 14, 18);
    x.fillStyle = '#ddedff'; x.font = `400 26px "Switzer", sans-serif`; x.fillText('L — B', px + 20, 70); x.fillRect(px + 20, 82, W - px - 40, 1);
    for (let i = 0; i < 3; i++) { const yy = 120 + i * 120 + Math.sin(t * 0.9 + i) * 10, xx = px + 40 + (i % 2) * 130; x.fillStyle = ['#8f8d87', '#003dff', '#ff7a1a'][i]; x.fillRect(xx, yy, 84, 88); x.fillStyle = '#fcfcf7'; x.fillRect(xx + 10, yy + 34, 64, 46); x.fillStyle = '#c6c6c2'; x.fillRect(xx + 22, yy, 40, 24); }
    s.t.needsUpdate = true;
    if (bar) { const b = bar.x; b.fillStyle = '#050505'; b.fillRect(0, 0, 828, 30); b.fillStyle = '#3a3b40'; b.fillRect(8, 5, 60, 20); ['#003dff', '#ff7a1a', '#58c08a', '#e8b42a', '#c83a2a'].forEach((c, i) => { b.fillStyle = c; b.fillRect(90 + i * 46, 5, 36, 20); }); b.fillStyle = '#3a3b40'; b.fillRect(360, 5, 300, 20); b.fillStyle = '#ffffff'; b.fillRect(360, 5, 300 * ((t * 0.12) % 1), 20); for (let i = 0; i < 4; i++) { b.fillStyle = '#5a5b60'; b.fillRect(690 + i * 34, 5, 26, 20); } bar.t.needsUpdate = true; }
  };
  const tb = era('touch', { rw: 480, rh: 260, t: [0, 90, 60], az: -0.34, el: 0.42, m: { rw: 300, rh: 230, t: [0, 100, 20] } });
  {
    world = tb.g;
    const lp = laptop(world, { x: -20, z: 40, ry: 0.12, color: '#7f8286', bar: true });
    const note = new THREE.Group(); note.position.set(-330, 0, 110); note.rotation.y = 0.3; world.add(note); box(150, 12, 210, 0, 6, 0, mat('#e8e2cf', 0.9), note, 2); box(150, 1, 210, 0, 12.4, 0, mat('#10100e', 0.7), note, 1);
    const pen = cyl(4, 140, -210, 4, 200, mat('#10100e', 0.4), world, Math.PI / 2); pen.rotation.z = 0.6;
    box(72, 8, 148, 280, 4, 130, black, world, 6).rotation.y = -0.3; // a phone
    const cup = new THREE.Group(); cup.position.set(330, 0, -90); world.add(cup); cyl(38, 110, 0, 55, 0, mat('#f2f1ec', 0.6), cup); cyl(40, 6, 0, 112, 0, mat('#10100e', 0.5), cup);
    tb.draw = (t) => code(lp.s, t, lp.tb);
    tb.glow = [-20, 150, 140]; tb.glowC = '#b8c8ff'; tb.glowK = 0.45; tb.tint = '#d9d2c6';
  }

  // ── 2026 · now. A placeholder desk until the photo of the real one arrives
  const now = era('now', { rw: 700, rh: 380, t: [20, 170, 60], az: -0.3, el: 0.32, m: { rw: 420, rh: 320, t: [0, 210, 30] } });
  {
    world = now.g; const sg = '#55575b';
    box(900, 3, 400, 0, 1.5, 150, mat('#1b1b19', 0.92), world, 4).castShadow = false; // desk mat
    const mn = new THREE.Group(); mn.position.set(110, 0, -110); mn.rotation.y = -0.06; world.add(mn);
    box(240, 6, 180, 0, 3, 0, al('#2c2d30'), mn, 3); box(60, 250, 14, 0, 125, -30, al('#2c2d30'), mn, 3); box(690, 400, 16, 0, 320, -10, al('#2c2d30'), mn, 6); box(684, 394, 2, 0, 320, -1.4, black, mn, 2).castShadow = false;
    const big2 = flat(672, 378, 960, 540, mn, 0, 320, -0.2);
    const riser = new THREE.Group(); riser.position.set(-400, 0, 0); riser.rotation.y = 0.42; world.add(riser);
    box(250, 6, 220, 0, 3, 0, al('#bfc1c4'), riser, 3); box(250, 110, 6, 0, 58, -80, al('#bfc1c4'), riser, 3).rotation.x = 0.5; box(250, 6, 230, 0, 112, 10, al('#bfc1c4'), riser, 3).rotation.x = 0.12;
    const lp = laptop(riser, { x: 0, z: 10, y: 116, color: sg }); lp.g.rotation.x = 0.12;
    const kbd = new THREE.Group(); kbd.position.set(60, 3, 250); world.add(kbd); box(290, 8, 118, 0, 5, 0, al('#2c2d30'), kbd, 3); keyGrid(kbd, mat('#17171a', 0.6), 14, 5, -124, -40, 19.05, 16.5, 2.4, 10);
    box(132, 8, 116, 300, 7, 252, al('#2c2d30', 0.25), world, 4);
    const pot = new THREE.Group(); pot.position.set(540, 0, -60); world.add(pot); cyl(48, 86, 0, 43, 0, mat('#f2f1ec', 0.7), pot);
    for (let i = 0; i < 7; i++) { const leaf = box(16, 150 + (i % 3) * 30, 3, 0, 150, 0, mat('#2e6b45', 0.6), pot, 6); leaf.rotation.set(0.25 + (i % 2) * 0.2, 0, 0); const h = new THREE.Group(); h.rotation.y = i * 0.9; pot.add(h); h.add(leaf); }
    now.draw = (t) => {
      const x = big2.x, W = 960, H = 540; tx(big2);
      x.fillStyle = '#10100e'; x.fillRect(0, 0, W, H); x.fillStyle = '#ddedff'; x.font = `400 26px "Switzer", sans-serif`; x.fillText('L — B', 40, 64); x.textAlign = 'right'; x.fillText('/ Lab', W - 40, 64); x.textAlign = 'left'; x.fillStyle = '#3c3c3a'; x.fillRect(40, 78, W - 80, 1);
      const cs = ['#8f8d87', '#003dff', '#ff7a1a', '#2f6bff', '#10100e'];
      for (let i = 0; i < 5; i++) { const yy = ((i * 170 - t * 46) % 700 + 700) % 700 - 60, xx = 150 + (i % 2) * 300 + Math.sin(t * 0.5 + i) * 30, s = 0.8 + (i % 3) * 0.25; x.save(); x.translate(xx, yy + 90); x.rotate(Math.sin(t * 0.4 + i * 2) * 0.25); x.fillStyle = cs[i]; x.fillRect(-45 * s, -47 * s, 90 * s, 94 * s); x.fillStyle = '#fcfcf7'; x.fillRect(-35 * s, -8 * s, 70 * s, 50 * s); x.fillStyle = '#c6c6c2'; x.fillRect(-20 * s, -47 * s, 44 * s, 28 * s); x.restore(); }
      x.fillStyle = 'rgba(16,16,14,0.9)'; x.fillRect(620, 300, 310, 200); x.strokeStyle = '#3c3c3a'; x.strokeRect(620.5, 300.5, 310, 200); x.font = mono(12, 400);
      const L = ['$ lab --build desk', '› 5 desks, 1 table', '› 1990 … 2026', '› no libraries added', '✓ ready'], n = Math.floor((t % 9) / 1.1);
      L.slice(0, n + 1).forEach((l, i) => { x.fillStyle = i === 4 ? '#58f08a' : '#d8d8d4'; x.fillText(l, 636, 328 + i * 22); });
      big2.t.needsUpdate = true; code(lp.s, t + 4, null);
    };
    now.glow = [110, 320, 200]; now.glowC = '#c9d6ff'; now.glowK = 0.7; now.tint = '#3a3835';
  }
  ERAS.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  for (const e of ERAS) e.g.children.forEach((c) => { c.userData.b = { y: c.position.y, s: c.scale.x }; });

  // ── camera: three-quarter view from the chair, a little from the left; the pointer moves it slightly
  const small = matchMedia('(max-width: 768px)');
  const target = new THREE.Vector3(), ptr = { x: 0, y: 0, cx: 0, cy: 0, t: -1e9 }, cam = { rw: 0, rh: 0, tx: 0, ty: 0, tz: 0, az: 0, el: 0, on: false };
  let W = 1, H = 1, cur = Math.max(0, ORDER.indexOf(start)), prev = -1, tr = 0, booted = false;
  ERAS[cur].g.visible = true;
  function fit() {
    W = Math.max(1, host.clientWidth); H = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix(); cam.on = false; shown = -1; wake();
  }
  function aim(dt) {
    const c = ERAS[cur].cam, m = small.matches, w = m ? c.m : c, a = cam.on && dt ? 1 - Math.exp(-dt * 4.5) : 1;
    const to = { rw: w.rw, rh: w.rh, tx: w.t[0], ty: w.t[1], tz: w.t[2], az: c.az, el: m ? c.el - 0.03 : c.el };
    let moving = false; for (const key in to) { const d = to[key] - cam[key]; if (Math.abs(d) > 1e-3) moving = true; cam[key] += d * a; } cam.on = true;
    const dist = Math.max(cam.rw / (TAN * camera.aspect), cam.rh / TAN) * 1.04, az = cam.az + ptr.cx * 0.1, el = cam.el - ptr.cy * 0.05;
    target.set(cam.tx, cam.ty, cam.tz);
    camera.position.set(target.x + dist * Math.sin(az) * Math.cos(el), target.y + dist * Math.sin(el), target.z + dist * Math.cos(az) * Math.cos(el));
    camera.lookAt(target); return moving;
  }
  const onMove = (e) => { const r = host.getBoundingClientRect(); ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.y = ((e.clientY - r.top) / r.height) * 2 - 1; ptr.t = performance.now(); wake(); };
  const onLeave = () => { ptr.x = ptr.y = 0; ptr.t = performance.now(); wake(); };
  host.addEventListener('pointermove', onMove); host.addEventListener('pointerleave', onLeave);

  // changing desk: the old things shrink away in a quick stagger, the new ones drop in one by one
  const c01 = (v) => Math.max(0, Math.min(1, v)), back = (q) => 1 + 2.2 * Math.pow(q - 1, 3) + 1.2 * Math.pow(q - 1, 2), OUT = 0.3;
  function pose(e, f) { e.g.children.forEach((c, i) => { const b = c.userData.b; if (!b) return; const v = f(i, e.g.children.length); c.scale.setScalar(Math.max(1e-3, b.s * v.s)); c.position.y = b.y + v.y; }); }
  function stageEras(rm) {
    if (rm) tr = 9;
    if (prev >= 0) { const P = ERAS[prev]; if (tr >= OUT + 0.02 * P.g.children.length) { P.g.visible = false; pose(P, () => ({ s: 1, y: 0 })); prev = -1; } else pose(P, (i) => { const p = c01((tr - i * 0.012) / 0.22), q = p * p; return { s: 1 - q, y: -18 * q }; }); }
    const E = ERAS[cur], n = E.g.children.length, end = OUT + 0.05 * n + 0.6;
    pose(E, (i) => { const q = c01((tr - (prev >= 0 || tr < end ? OUT : 0) - i * 0.05) / 0.6); return tr >= end ? { s: 1, y: 0 } : { s: q <= 0 ? 0 : back(q), y: (1 - Math.min(1, q * 1.4)) * 70 }; });
    return tr < end;
  }
  function setEra(i) {
    i = Math.max(0, Math.min(ERAS.length - 1, i)); if (i === cur) return;
    if (prev >= 0) { ERAS[prev].g.visible = false; pose(ERAS[prev], () => ({ s: 1, y: 0 })); }
    prev = cur; cur = i; tr = 0; ERAS[cur].g.visible = true; ERAS[cur].t0 = ERAS[cur].key === 'pc' && booted ? clock - BOOT - 0.5 : clock; drawn = -1; wake();
  }

  // ── loop: full rate while something moves, about 10 fps when only the screen changes
  let raf = 0, last = 0, clock = 0, drawn = -1, shown = -1, visible = !document.hidden, onScreen = false, started = reduced.matches, dead = false;
  const gp = new THREE.Vector3(), tintC = new THREE.Color();
  function wake() { if (!raf && visible && onScreen && !dead) { last = 0; raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0; if (dead) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (started) clock += dt;
    if (started) tr += dt;
    if (ERAS[cur].key === 'pc' && clock - ERAS[cur].t0 > BOOT) booted = true;
    const rm = reduced.matches, E = ERAS[cur], t = rm ? 60 : Math.max(0, clock - E.t0);
    const kx = rm ? 0 : ptr.x, ky = rm ? 0 : ptr.y, a = 1 - Math.exp(-dt * 5);
    ptr.cx += (kx - ptr.cx) * a; ptr.cy += (ky - ptr.cy) * a;
    let moving = Math.abs(kx - ptr.cx) + Math.abs(ky - ptr.cy) > 0.002;
    if (stageEras(rm)) moving = true;
    if (aim(rm ? 0 : dt)) moving = true;
    const step = Math.floor(t * 10);
    if (step !== drawn) { drawn = step; E.draw(t); }
    if (step !== shown || moving || shown < 0) {
      const on = t > 0.3 ? 1 : 0, tc = desk.material.color;
      tintC.set(E.tint); if (rm || shown < 0) tc.copy(tintC); else tc.lerp(tintC, 1 - Math.exp(-dt * 6));
      if (Math.abs(tc.r - tintC.r) + Math.abs(tc.g - tintC.g) > 0.004) moving = true;
      glow.color.set(E.glowC); glow.intensity = on * E.glowK * 26000 * c01((tr - 0.4) / 0.5 + (prev < 0 && tr > 2 ? 1 : 0));
      gp.set(E.glow[0], E.glow[1], E.glow[2]); glow.position.copy(gp);
      renderer.render(scene, camera); shown = step;
    }
    if (!rm || shown < 0 || moving) raf = requestAnimationFrame(tick);
  }
  const onVis = () => { visible = !document.hidden; if (visible) wake(); else { cancelAnimationFrame(raf); raf = 0; } };
  document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) wake(); else { cancelAnimationFrame(raf); raf = 0; } }, { rootMargin: '120px' });
  io.observe(host);
  const ioIn = new IntersectionObserver(([e]) => { if (e.isIntersecting) { ioIn.disconnect(); started = true; wake(); } }, { threshold: 0.4 }); // the PC boots when you get there
  ioIn.observe(host);
  const ro = new ResizeObserver(fit); ro.observe(host);
  const onMedia = () => { shown = -1; cam.on = false; wake(); };
  small.addEventListener?.('change', onMedia); reduced.addEventListener?.('change', onMedia);
  fit();

  return {
    get clock() { return clock; }, get selected() { return sel; }, renderer, scene, camera,
    setEra, get era() { return cur; }, get eras() { return ERAS.map((e) => e.key); },
    renderNow(skip = 0) { onScreen = true; started = true; clock += skip; shown = -1; cancelAnimationFrame(raf); raf = 0; tick(performance.now()); },
    dispose() {
      dead = true; cancelAnimationFrame(raf); io.disconnect(); ioIn.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave);
      small.removeEventListener?.('change', onMedia); reduced.removeEventListener?.('change', onMedia);
      loose.forEach((a) => a.dispose()); dbox.dispose(); keyM.dispose(); keep.forEach((o) => o.dispose?.()); renderer.dispose();
    },
  };
}
