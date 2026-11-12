# Prompt for Fable 5.2 — "FLOPPY": an Awwwards-level 3D 3.5" disk with swappable Lab labels

## 1. Role & goal
You are a senior creative developer (three.js, GLSL, motion design) with an art director's eye. Build **one self-contained HTML file**: an interactive 3D 3.5" floppy disk whose **label changes per project** in the Lab of juancfresno.com. This is a signature piece of an Awwwards-calibre portfolio, not a toy and not a tech demo. Restraint, weight and material truth win over effects. Later the same object will be reused as a stack of disks in a Lab index and as a Home module, so build it as a reusable `createFloppy(data, options)` factory plus a thin demo scene.

## 2. Deliverable
- One `.html` file, inline CSS and JS, ES modules via `<script type="importmap">`.
- three.js pinned: `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js` and `.../examples/jsm/` (RoomEnvironment, EffectComposer, ShaderPass, RenderPass, OutputPass, RoundedBoxGeometry). Exact version, nothing else, no build step, no external images or fonts: generate every texture in code. Fonts: Google Fonts stylesheet only (Sometype Mono 500, Switzer substitute = "Inter Tight" or system sans), and wait for `document.fonts.ready` before drawing the label canvas.
- 60 fps on a mid laptop, 30+ on a recent phone. Touch works.

## 3. The object (procedural, real proportions)
Units: 1 = 1 mm. Cartridge **90 × 94 × 3.3 mm** (width × depth × thickness). Shell is two halves with a visible seam at mid-thickness, edges bevelled ~0.35 mm (RoundedBoxGeometry or ExtrudeGeometry with bevel), outer corner radius ~1.2 mm.
- **Shutter edge** (top, the edge that enters the drive): a recess in both halves; a **spring metal shutter** (U-shaped clip, ~24 mm wide, brushed stainless, `metalness 1, roughness 0.28`, fine anisotropic-looking horizontal brushing from a generated roughness map) that **slides ~20 mm sideways** to reveal a window (~7 × 24 mm on each face) onto a **dark magnetic disk** (85.8 mm brown-black mylar, subtle concentric sheen via a generated anisotropic ring texture, `roughness 0.55`). The disk is a separate mesh, can **spin** (angular velocity eased), and shows a faint radial sheen shift as it turns.
- **Front (label side)**: recessed label area (~0.15 mm deep, rounded rect, upper two thirds), small embossed numbers/arrows near the shutter, one **chamfered corner** (top right, label facing you, shutter up) that breaks the symmetry so it reads as a disk instantly.
- **Back**: metal **hub** (stamped steel, square-ish centre hole with drive pin hole, slight dome), the shutter's back plate, label-less recessed rectangle, **write-protect slider** (small sliding tab, toggles with a click; open/closed visible), and the **density hole** on the opposite corner.
- No floating parts, no z-fighting: use polygonOffset / real thickness, not coplanar planes.
- **Three colourways, switchable live (keys 1·2·3, with a tiny mono UI)** and animated with a colour/material cross-fade (~400 ms):
  1. **Classic**: matte black ABS (`MeshPhysicalMaterial`, roughness 0.6, fine noise bump, soft sheen), silver shutter.
  2. **90s translucent**: tinted translucent polycarbonate (`transmission 0.9, thickness ~2, ior 1.45, roughness 0.12, attenuationColor` per tint: blue, orange, smoke), inner parts (disk, hub ring, spring) visible through the shell. Handle transmission cost: render at reduced resolution on mobile.
  3. **Fresno ink**: shell `#10100E`, chamfer/hub accents and tab in `#003DFF`, shutter pearl-silver, label base `#FCFCF7`.

## 4. Label system
Label is a **CanvasTexture** (2048 × 1700, anisotropy max, sRGB, mipmaps) generated from data, never an image. Paper material: matte, faint fibre noise, very slight edge lift. Content from `{ n, title, year, kind }` plus a derived line (`LAB 004 · ENTRADAS DE PÍXEL · 2026`):
- Big `n` ("004") in Sometype Mono 500, uppercase mono micro-labels, title in a grotesk (Switzer-like) heavy weight, year; 24-column hairline grid marks with 40 px margin logic scaled to the label, register crop marks, a tiny **Bayer dither strip** and one tiny pixel glyph per project, a ruled "handwritten-looking" field (marker font optional, off by default). Accent `#003DFF` only for one element.
- **Swap**: (A, default) pixel-dissolve: old label breaks into a Bayer-ordered grid of cells (16 ms stagger from a random origin, ~420 ms) revealing the new one, with the RGB split spiking during it; (B) peel: the label curls from one corner with a vertex-displaced plane (~600 ms). Provide both, toggle with `P`. Swap must never drop frames: pre-render all 5 label canvases at load.
- Crisp at every zoom: texture resolution sized for 3× screen zoom.

## 5. Interactions
- **Drag to rotate** (pointer events): free rotation with inertia and damping (angular velocity decays ~0.92/frame at 60 fps, frame-rate independent), soft return to a resting pose after 3 s idle, **flip to the back** possible. Vertical range clamped to avoid gimbal feel. Idle: very slow breathing float (±0.6°, ±0.4 mm), only when not interacting.
- **Hover** (fine pointer): shutter eases open ~14 mm over 350 ms (springy, `easeOutBack`-ish, small overshoot), disk starts spinning; leave: closes. Touch: tap toggles.
- **← →** switch project (focus-visible on the stage; also drag-less buttons `‹ ›`). **Space** = peel/dissolve replay. **G** toggles a 24-col grid overlay (40 px margin at 1680, liquid). **1·2·3** colourways. **W** write-protect.
- **Click / Enter = "insert"**: the disk turns upright (shutter edge down), slides into a drive line at the bottom of the stage (a thin slot drawn as a pure-CSS/three line with a status LED turning `#003DFF`), a drive "chunk" easing (ease-in then a soft stop), then triggers a **wireframe-grid cover** over the viewport (grid lines drop → gutters open → columns fill, ~750 ms, in the site's language) and dispatches `window.dispatchEvent(new CustomEvent('floppy:insert', { detail: project }))`. Provide `Esc` to eject (reverse). Add a short synthetic mechanical click only if WebAudio is unlocked by a gesture and mute is default OFF-safe (muted by default, `S` toggles).
- **RGB split**: a postprocessing ShaderPass splitting R and B along the screen-space velocity vector by `min(14, (angularSpeed − 0.4) × k)` px (snapped to device pixels), zero at rest, plus a light 4×4 Bayer posterize only at high speed. At rest the image must be a single clean sample.

## 6. Lighting & materials
Studio look: `RoomEnvironment` through `PMREMGenerator` at 0.5–0.8 intensity as base, plus a large soft key (RectAreaLight-like via a bright strip in a generated env), a cool rim from behind, `ACESFilmic` or `AgX` tone mapping, `SRGBColorSpace` output. **Contact shadow** under the object (baked blurred depth, `MeshBasicMaterial` plane with soft alpha) that scales and softens with height. Subtle fake AO in the shell seams (darker vertex colours or a baked gradient). Fresnel edge lift via `onBeforeCompile` on the shell. **No bloom**, no lens flares, no vignette dominance, no particle sparkle. Dark stage `#10100E` with a very low-contrast radial lift; optional light theme (`D` toggles) using pearl `#FCFCF7` and brand blue `#C6DBF9`.

## 7. Art direction (Fresno© language)
Dark editorial, minimalist, detail-obsessed. Mono HUD in four corners, Sometype Mono 500, uppercase, 10–11 px, tracking +0.04em, e.g. `LAB 004 · ENTRADAS DE PÍXEL · 2026`, `‹ 004 / 005 ›`, `DRAG ↔ ↕  ·  HOVER SHUTTER  ·  ENTER INSERT`, live `RPM`, `YAW/PITCH` readout. Motion has **weight**: nothing linear, shell feels like 40 g of plastic, shutter like a spring. Use `{ label ↘` style section marks, hairline 1 px rules, pixel/dither textures at a tiny scale only. No gradients-as-decoration, no neon, no glassmorphism.

## 8. Performance & accessibility
`renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`; pause the loop with IntersectionObserver / `visibilitychange`; **render on demand** when nothing moves (sleep loop, grain-free). Dispose textures on resize, cap transmission resolution on mobile. `prefers-reduced-motion`: no inertia, no RGB split, no float, instant label swaps, insert = fade. Canvas has `role="img"` + live `aria-label` ("Floppy disk, Lab 004, Entradas de píxel, 2026"), real focusable buttons for prev/next/insert/colourway, visible focus ring in `#003DFF`, WebGL-failure fallback = static labelled SVG.

## 9. Data (real, from the site)
```json
[
 {"n":"001","title":"Botones","en":"Buttons","kind":"Interacción","year":"2026","what":"Cuatro botones con intención: magnético, columnas, rodillo y scramble."},
 {"n":"002","title":"Transiciones","en":"Transitions","kind":"Navegación","year":"2026","what":"22 transiciones de página para elegir antes de comprometerse. ★ 11a y 11d."},
 {"n":"003","title":"Galerías","en":"Galleries","kind":"Layout","year":"2026","what":"Ocho formas de mostrar 200 imágenes: arco, canvas infinito, láminas, tira, mazo, rejilla, barras y pasarela."},
 {"n":"004","title":"Entradas de píxel","en":"Pixel entrances","kind":"Imagen","year":"2026","what":"Placeholder: confirm with Juan."},
 {"n":"005","title":"Cursores","en":"Cursors","kind":"Interacción","year":"2026","what":"Placeholder: confirm with Juan."}
]
```

## 10. References (borrow this, not their assets)
- Cameron Rye, retro-floppy (cameronrye.github.io/retro-floppy): hover-slide metal shutter, label theming. Borrow the shutter behaviour, not the flat look.
- Codrops, Threepipe device showcase: HDR env + tone mapping + contact shadows, hover-subtle / click-big, one queued "next state" so animations never overlap, separate mobile camera framing.
- Codrops, "84—24" case study (Macintosh 128K, floppy drive carved in): wireframe-edge transition, merge meshes, minimal lights, no heavy post.
- Oryzo (oryzo.ai, Lusion): one object, real material response, eased camera.
- Aula F75 keyboard (aulaf75.julius.site): colour modes change material and atmosphere together.
- Cartier Watches & Wonders: one room per object, hidden gestures.
- Hubtown: cursor reveals lighting detail on a single centrepiece.

## 11. Quality bar (self-check before delivering)
Materials read as real plastic and metal in still frames; motion has weight and easing; no z-fighting or shimmering at grazing angles; label crisp at all zooms; typography matches the brief; RGB split invisible at rest; swap never stutters; nothing generic (no default OrbitControls feel, no stock gradients, no bloom). Test in dark and light, desktop and 390 px wide.

**Before coding, briefly state your plan; then deliver the complete file.**
