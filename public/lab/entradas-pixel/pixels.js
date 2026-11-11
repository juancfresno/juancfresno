/* Fresno Lab · 004 · Pixel entrances — https://juancfresno.com/lab/entradas-pixel
   Entry (and mirrored exit) effects for a small hover preview that plays a video clip.
   fresnoPixels(root?) wires every [data-fp] demo inside root and returns a cleanup function.
   Auto-runs on load unless the script tag has data-manual.
   One shared WebGL2 context renders every card (one fragment shader, a mode per variant)
   and each card copies its frame into its own 2D canvas. No WebGL2 = simplified 2D preview.
   Attributes on [data-fp]: data-fp-src (clip folder, default "/social/"),
   data-fp-formats (default "webm,mp4"). MIT. */
(function (global) {
  'use strict';

  // ─── Clips (same files and sizes as the site's hover preview) ─────────────
  var CLIPS = [
    { id: 'behance', label: 'Behance', w: 256, h: 160 },
    { id: 'dribbble', label: 'Dribbble', w: 256, h: 160 },
    { id: 'linkedin', label: 'LinkedIn', w: 256, h: 160 },
    { id: 'instagram', label: 'Instagram', w: 256, h: 160 },
    { id: 'x', label: 'X', w: 256, h: 160 },
    { id: 'valencia', label: 'Valencia 9:16', w: 224, h: 400 }
  ];

  // ─── Variants. mode = shader branch. px in site (CSS) px. ─────────────────
  var VARIANTS = [
    { n: '00', mode: 0, name: 'Twelve columns', tag: 'Reference · on the site today', dur: 386, exit: 239 / 386, px: null, ease: 'site',
      text: 'What the site does now: the clip drops in through the 12 grid columns, outwards from the cursor’s column (16 ms stagger, 210 ms each), with an orange scan line. The exit retracts them.' },
    { n: '01', mode: 1, name: 'Fine bitmap', tag: 'Bayer 8×8 sweep', dur: 560, exit: 0.65, px: 2, min: 1, max: 6, ease: 'cubicOut',
      text: '2 px cells, thousands at once. An 8×8 Bayer threshold sweeps down the frame and the bitmap fills in; the cells on the front flash as 1-bit before they turn into the clip.' },
    { n: '02', mode: 2, name: 'Depixelate', tag: '32 → 16 → 8 → 4 → 2 → 1', dur: 520, exit: 0.65, px: 32, min: 8, max: 64, ease: 'linear',
      text: 'Big blocks pop in, then the block size halves at every step until the clip is sharp. Each block is the mean colour of its area (mipmaps), not a single sampled pixel.' },
    { n: '03', mode: 3, name: '1-bit to colour', tag: 'Old Mac, then colour', dur: 680, exit: 0.65, px: 2, min: 1, max: 4, ease: 'quadInOut',
      text: 'Arrives as a black-and-white Bayer-dithered image, like an old Mac screen drawing itself, then the colour dithers in cell by cell.' },
    { n: '04', mode: 4, name: 'From the cursor', tag: 'Radial · dithered edge', dur: 480, exit: 0.65, px: 2, min: 1, max: 6, ease: 'expoOut',
      text: 'Pixels are born where the cursor enters and spread out in a circle; the edge is dithered and lit in the G orange. The exit collapses towards the point where you leave.' },
    { n: '05', mode: 5, name: 'CRT sweep', tag: 'Row by row', dur: 440, exit: 0.65, px: 2, min: 1, max: 6, ease: 'linear',
      text: 'Drawn row by row, left to right, like a CRT beam or a printer head: a bright leading line, a short phosphor glow and scanlines that fade once it lands.' }
  ];

  var EASES = {
    linear: function (t) { return t; },
    cubicOut: function (t) { return 1 - Math.pow(1 - t, 3); },
    expoOut: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    quadInOut: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    steps6: function (t) { return Math.min(1, Math.floor(t * 6 + 1e-6) / 6 + (t >= 1 ? 1 : 0)); }
  };
  var EASE_LABELS = { linear: 'Linear', cubicOut: 'Cubic out', expoOut: 'Expo out', quadInOut: 'Quad in-out', steps6: 'Steps (6)' };

  var HOLD = 1100, GAP = 600; // autoplay: time shown, time hidden
  var INK = [16 / 255, 16 / 255, 14 / 255], PAPER = [252 / 255, 252 / 255, 247 / 255], ACCENT = [1, 92 / 255, 30 / 255];

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  // ─── Shaders ──────────────────────────────────────────────────────────────
  var VS = '#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}';

  var FS = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uTex;',
    'uniform vec2 uTexSize, uRes, uOrigin;',   // origin in 0..1, top-left based
    'uniform float uP, uRaw, uExit, uPx, uDpr, uHasTex, uDurScale;',
    'uniform int uMode;',
    'uniform vec3 uInk, uPaper, uAccent, uLine, uSurface;',
    'out vec4 o;',
    // Cover-fit the clip in the frame; baseLod keeps minified clips from shimmering.
    'float K(){ return max(uRes.x/uTexSize.x, uRes.y/uTexSize.y); }',
    'vec2 coverUV(vec2 uv){ vec2 s=uRes/(uTexSize*K()); return 0.5+(uv-0.5)*s; }',
    'float baseLod(){ return max(0., log2(1./K())-0.5); }',
    'vec3 clipAt(vec2 uv, float lod){ if(uHasTex<0.5) return uSurface; return textureLod(uTex, coverUV(uv), lod).rgb; }',
    // 8x8 Bayer threshold, 0..1 (bit-reversed interleave of x^y and y).
    'float bayer8(vec2 c){ ivec2 p=ivec2(mod(c,8.)); int xy=p.x^p.y; int m=0; for(int b=0;b<3;b++){ m=(m<<2)|(((xy>>b)&1)<<1)|((p.y>>b)&1); } return (float(m)+.5)/64.; }',
    'float hash(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233)))*43758.5453); }',
    'float luma(vec3 c){ return dot(c, vec3(.2126,.7152,.0722)); }',
    'float expoOut(float t){ return t>=1.?1.:1.-pow(2.,-10.*t); }',
    'float quadInOut(float t){ return t<.5?2.*t*t:1.-pow(-2.*t+2.,2.)/2.; }',
    'void main(){',
    '  vec2 pos=vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);',   // device px, top-left
    '  vec2 uv=pos/uRes;',
    '  float L=baseLod();',
    '  vec3 col=vec3(0.); float a=0.;',
    '  if(uMode==0){',
    // 00 · Twelve columns: the site effect, timings scaled by the duration slider.
    '    float c=floor(uv.x*12.); float d=abs(c-clamp(uOrigin.x*12.,0.,11.));',
    '    float h;',
    '    if(uExit<0.5){ float t=uRaw*386.; h=expoOut(clamp((t-d*16.)/210.,0.,1.)); }',
    '    else { float t=uRaw*239.; h=1.-quadInOut(clamp((t-d*9.)/140.,0.,1.)); }',
    '    if(pos.y<h*uRes.y){ col=clipAt(uv,L); a=1.;',
    '      if(h<1. && pos.y>=h*uRes.y-uDpr) col=uAccent; }',
    '  } else if(uMode==1){',
    // 01 · Fine bitmap: Bayer threshold mixed with a top-down sweep; front cells as 1-bit.
    '    vec2 c=floor(pos/uPx); vec2 g=ceil(uRes/uPx); float b=bayer8(c);',
    '    float sweep=(c.y+c.x*.3)/(g.y+g.x*.3);',
    '    float fr=.07; float th=mix(b,sweep,.55)*(1.-fr);',
    '    if(uP>=th+fr){ col=clipAt(uv,L); a=1.; }',
    '    else if(uP>=th){ float l=luma(clipAt((c+.5)*uPx/uRes,L+1.)); col=l>b*.85?uPaper:uInk; a=1.; }',
    '  } else if(uMode==2){',
    // 02 · Depixelate: blocks pop in at uPx, then halve per step down to 1 device px.
    '    float n=floor(log2(max(uPx,1.)))+1.; float N=n+1.; float seg=uP*N;',
    '    float S=uPx;',
    '    if(seg<1.){ vec2 c=floor(pos/S); if(hash(c)<seg){ col=clipAt((c+.5)*S/uRes, max(L,log2(S/K()))); a=1.; } }',
    '    else { float lv=min(floor(seg-1.),n-1.); float sz=max(1.,floor(S/pow(2.,lv)+.5));',
    '      if(sz<=1.){ col=clipAt(uv,L); } else { vec2 c=floor(pos/sz); col=clipAt((c+.5)*sz/uRes, max(L,log2(sz/K()))); }',
    '      a=1.; }',
    '  } else if(uMode==3){',
    // 03 · 1-bit to colour: dithered B/W draws in (sweep + noise), then colour dithers in.
    '    vec2 c=floor(pos/uPx); float b=bayer8(c);',
    '    float A=clamp(uP/.5,0.,1.), B=clamp((uP-.5)/.5,0.,1.);',
    '    float ta=mix(hash(c),uv.y,.65)*.98;',
    '    if(A>ta){ float l=luma(clipAt((c+.5)*uPx/uRes,L+.5)); col=l>b?uPaper:uInk; a=1.;',
    '      if(B>=bayer8(c+vec2(3.,5.))) col=clipAt(uv,L); }',
    '  } else if(uMode==4){',
    // 04 · From the cursor: radial threshold from the entry point, dithered orange edge.
    '    vec2 c=floor(pos/uPx); vec2 cc=(c+.5)*uPx; vec2 o2=uOrigin*uRes;',
    '    vec2 far=max(o2, uRes-o2); float md=length(far);',
    '    float dn=length(cc-o2)/md; float b=bayer8(c);',
    '    float edge=.1, fr=.05; float th=dn*(1.-edge-fr)+b*edge;',
    '    if(uP>=th+fr){ col=clipAt(uv,L); a=1.; }',
    '    else if(uP>=th && uP>0.){ col=uAccent; a=1.; }',
    '  } else {',
    // 05 · CRT sweep: rows of uPx, each drawn left to right; glow + scanlines while moving.
    '    float R=ceil(uRes.y/uPx); float s=uP*R; float r=floor(pos.y/uPx); float cur=floor(s);',
    '    bool vis = r<cur || (r==cur && uv.x<fract(s));',
    '    if(vis){ col=clipAt(uv,L); a=1.;',
    '      float live=1.-smoothstep(.97,1.,uP);',
    '      float dist=s-(r+1.);',
    '      float glow=r==cur?1.:exp(-max(dist,0.)*uPx/(3.*uDpr));',
    '      col=mix(col, uPaper, clamp(glow*.85,0.,1.)*live);',
    '      if(mod(pos.y,2.*uDpr)<uDpr) col*=1.-.22*live;',
    '      if(r==cur && uv.x>fract(s)-uPx*2./uRes.x) col=uAccent; }',
    '  }',
    // Frame line (1 CSS px) on visible pixels, as on the site.
    '  if(a>0. && (pos.x<uDpr || pos.y<uDpr || pos.x>uRes.x-uDpr || pos.y>uRes.y-uDpr)) col=uLine;',
    '  o=vec4(col*a,a);',
    '}'
  ].join('\n');

  // Shared WebGL2 renderer (lazy, one per page).
  var R = null;
  function renderer() {
    if (R !== null) return R;
    R = false;
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2', { premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true, antialias: false });
      if (!gl) return R;
      var sh = function (type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      var p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      gl.useProgram(p);
      var u = {};
      ['uTex', 'uTexSize', 'uRes', 'uOrigin', 'uP', 'uRaw', 'uExit', 'uPx', 'uDpr', 'uHasTex', 'uDurScale', 'uMode', 'uInk', 'uPaper', 'uAccent', 'uLine', 'uSurface']
        .forEach(function (k) { u[k] = gl.getUniformLocation(p, k); });
      var vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(u.uTex, 0);
      gl.uniform3fv(u.uInk, INK);
      gl.uniform3fv(u.uPaper, PAPER);
      gl.uniform3fv(u.uAccent, ACCENT);
      R = { c: c, gl: gl, u: u, tex: tex, texW: 0, texH: 0, src: null, users: 0 };
    } catch (err) {
      if (global.console) console.warn('[fresnoPixels] WebGL2 off, 2D fallback:', err && err.message);
      R = false;
    }
    return R;
  }

  // CSS colour → [r,g,b] 0..1 (resolves var()/color-mix through a 1×1 canvas).
  var probe = null;
  function rgb(css, fallback) {
    try {
      if (!probe) { var pc = document.createElement('canvas'); pc.width = pc.height = 1; probe = pc.getContext('2d', { willReadFrequently: true }); }
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = '#000';
      probe.fillStyle = css || fallback;
      probe.fillRect(0, 0, 1, 1);
      var d = probe.getImageData(0, 0, 1, 1).data;
      return [d[0] / 255, d[1] / 255, d[2] / 255];
    } catch (e) { return [0.2, 0.2, 0.2]; }
  }

  // ─── One demo ─────────────────────────────────────────────────────────────
  function wire(root) {
    if (root.__fp) return root.__fp;
    var base = root.getAttribute('data-fp-src') || '/social/';
    var formats = (root.getAttribute('data-fp-formats') || 'webm,mp4').split(',');
    var rmq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var reduce = rmq.matches;
    var coarse = global.matchMedia ? global.matchMedia('(hover: none)').matches : false;
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var gfx = renderer();
    if (gfx) gfx.users++;
    var offs = [];
    var on = function (t, type, fn, opt) { t.addEventListener(type, fn, opt); offs.push(function () { t.removeEventListener(type, fn, opt); }); };

    var state = { clip: CLIPS[0], scale: 1, auto: false };
    var media = {}; // id → { video, poster }
    var raf = 0;

    // ── Build UI ──
    var host = root.querySelector('[data-fp-app]') || root;
    host.textContent = '';
    var head = el('div', 'fp__head');
    var bar = el('div', 'fp__bar');

    var clipSet = el('fieldset', 'fp__set');
    clipSet.appendChild(el('legend', null, 'Clip'));
    var clipOpts = el('div', 'fp__seg');
    CLIPS.forEach(function (c, i) {
      var b = el('button', 'fp__chip', c.label);
      b.type = 'button';
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      on(b, 'click', function () { setClip(c); });
      c.btn = b;
      clipOpts.appendChild(b);
    });
    clipSet.appendChild(clipOpts);

    var sizeSet = el('fieldset', 'fp__set');
    sizeSet.appendChild(el('legend', null, 'Size'));
    var sizeOpts = el('div', 'fp__seg');
    var sizeBtns = [1, 2].map(function (k) {
      var b = el('button', 'fp__chip', k === 1 ? '1× · site' : '2× · zoom');
      b.type = 'button';
      b.setAttribute('aria-pressed', k === 1 ? 'true' : 'false');
      on(b, 'click', function () { setScale(k); });
      sizeOpts.appendChild(b);
      return b;
    });
    sizeSet.appendChild(sizeOpts);

    var playSet = el('fieldset', 'fp__set');
    playSet.appendChild(el('legend', null, 'Play'));
    var playOpts = el('div', 'fp__seg');
    var autoBtn = el('button', 'fp__chip', 'Autoplay');
    autoBtn.type = 'button';
    autoBtn.setAttribute('aria-pressed', 'false');
    on(autoBtn, 'click', function () { setAuto(!state.auto); });
    var allBtn = el('button', 'fp__chip', 'Replay all ↻');
    allBtn.type = 'button';
    on(allBtn, 'click', function () { cards.forEach(function (c) { replay(c); }); });
    playOpts.appendChild(autoBtn);
    playOpts.appendChild(allBtn);
    playSet.appendChild(playOpts);

    bar.appendChild(clipSet);
    bar.appendChild(sizeSet);
    bar.appendChild(playSet);
    head.appendChild(bar);
    var note = el('p', 'fp__note');
    note.textContent = (coarse ? 'Tap a frame to play its entry, tap again for the exit.' : 'Hover a frame: entry on enter, mirrored exit on leave.') +
      ' Keyboard: Tab to a frame, Enter toggles.' + (reduce ? ' Reduced motion is on: entries are instant and clips stay still.' : '') +
      (gfx ? '' : ' WebGL2 is not available here: simplified 2D preview.');
    head.appendChild(note);
    host.appendChild(head);

    var grid = el('div', 'fp__cards');
    host.appendChild(grid);

    var cards = VARIANTS.map(function (v) {
      var card = { v: v, mode: v.mode, px: v.px, dur: v.dur, ease: v.ease, phase: 'hidden', t0: 0, origin: [0.5, 0.5], manual: false, next: 0, loop: false, drawn: false };
      var li = el('article', 'fp__card');
      li.setAttribute('data-mode', String(v.mode));
      var top = el('header', 'fp__cardHead');
      top.appendChild(el('span', 'fp__n', v.n));
      var tt = el('div', 'fp__titles');
      tt.appendChild(el('h3', 'fp__name', v.name));
      tt.appendChild(el('p', 'fp__tag' + (v.mode === 0 ? ' fp__tag--ref' : ''), v.tag));
      top.appendChild(tt);
      li.appendChild(top);

      var stage = el('div', 'fp__stage');
      var gridBg = el('div', 'fp__grid');
      gridBg.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < 12; i++) gridBg.appendChild(el('i'));
      stage.appendChild(gridBg);
      var frame = el('div', 'fp__frame');
      frame.tabIndex = 0;
      frame.setAttribute('role', 'button');
      frame.setAttribute('aria-pressed', 'false');
      frame.setAttribute('aria-label', 'Play ' + v.name + ' entry');
      var cv = el('canvas', 'fp__canvas');
      cv.setAttribute('aria-hidden', 'true');
      frame.appendChild(cv);
      var hint = el('span', 'fp__hint', coarse ? 'TAP' : 'HOVER');
      frame.appendChild(hint);
      stage.appendChild(frame);
      var read = el('p', 'fp__read', 'REST');
      read.setAttribute('aria-hidden', 'true');
      stage.appendChild(read);
      li.appendChild(stage);

      li.appendChild(el('p', 'fp__text', v.text));

      // Controls.
      var ctr = el('div', 'fp__ctrls');
      var mk = function (label, input, out) {
        var lab = el('label', 'fp__ctrl');
        lab.appendChild(el('span', 'fp__k', label));
        lab.appendChild(input);
        if (out) lab.appendChild(out);
        ctr.appendChild(lab);
      };
      if (v.px != null) {
        var pxIn = el('input');
        pxIn.type = 'range'; pxIn.min = String(v.min); pxIn.max = String(v.max); pxIn.step = '1'; pxIn.value = String(v.px);
        var pxOut = el('output', 'fp__v', v.px + ' px');
        on(pxIn, 'input', function () { card.px = +pxIn.value; pxOut.textContent = card.px + ' px'; cells(); if (card.phase === 'shown' || card.phase === 'hidden') replay(card); });
        mk(v.mode === 2 ? 'Start block' : 'Pixel', pxIn, pxOut);
      }
      var dIn = el('input');
      dIn.type = 'range'; dIn.min = '120'; dIn.max = '2000'; dIn.step = '10'; dIn.value = String(v.dur);
      var dOut = el('output', 'fp__v', v.dur + ' ms');
      on(dIn, 'input', function () { card.dur = +dIn.value; dOut.textContent = card.dur + ' ms'; });
      on(dIn, 'change', function () { replay(card); });
      mk('Duration', dIn, dOut);
      if (v.ease !== 'site') {
        var sel = el('select', 'fp__sel');
        Object.keys(EASES).forEach(function (k) {
          var o = el('option', null, EASE_LABELS[k]);
          o.value = k;
          if (k === v.ease) o.selected = true;
          sel.appendChild(o);
        });
        on(sel, 'change', function () { card.ease = sel.value; replay(card); });
        mk('Easing', sel);
      } else {
        var fixed = el('span', 'fp__v fp__v--fixed', 'Expo out in · quad in-out out');
        mk('Easing', fixed);
      }
      var rp = el('button', 'fp__chip fp__replay', 'Replay ↻');
      rp.type = 'button';
      on(rp, 'click', function () { replay(card); });
      ctr.appendChild(rp);
      li.appendChild(ctr);
      var meta = el('p', 'fp__meta');
      li.appendChild(meta);
      grid.appendChild(li);

      var cells = function () {
        var w = state.clip.w, h = state.clip.h;
        if (v.mode === 0) meta.textContent = 'EXIT ' + Math.round(card.dur * v.exit) + ' MS · 12 COLUMNS · ' + w + ' × ' + h;
        else if (v.mode === 2) meta.textContent = 'EXIT ' + Math.round(card.dur * v.exit) + ' MS · ' + steps(card.px).join(' → ') + ' PX';
        else {
          var cx = Math.ceil(w / card.px), cy = Math.ceil(h / card.px);
          meta.textContent = 'EXIT ' + Math.round(card.dur * v.exit) + ' MS · CELLS ' + cx + ' × ' + cy + ' = ' + (cx * cy).toLocaleString('en-US');
        }
      };
      on(dIn, 'input', cells);

      card.el = li; card.frame = frame; card.canvas = cv; card.ctx = cv.getContext('2d'); card.read = read; card.hint = hint; card.cells = cells;

      // Pointer: hover on fine pointers, tap on touch.
      var rel = function (e) {
        var r = cv.getBoundingClientRect();
        return [clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)];
      };
      on(frame, 'pointerenter', function (e) { if (e.pointerType !== 'mouse') return; card.manual = true; card.origin = rel(e); go(card, 'in'); });
      on(frame, 'pointerleave', function (e) {
        if (e.pointerType !== 'mouse') return;
        card.manual = false;
        if (v.mode === 4) card.origin = rel(e);
        go(card, 'out');
        if (state.auto) card.next = performance.now() + GAP;
      });
      on(frame, 'pointerup', function (e) {
        if (e.pointerType === 'mouse') return;
        card.origin = rel(e);
        go(card, card.phase === 'in' || card.phase === 'shown' ? 'out' : 'in');
      });
      on(frame, 'keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        card.origin = [0.5, 0.5];
        go(card, card.phase === 'in' || card.phase === 'shown' ? 'out' : 'in');
      });
      return card;
    });

    function steps(s) {
      var out = [];
      for (var k = s; k >= 1; k = Math.floor(k / 2)) { out.push(k); if (k === 1) break; }
      if (out[out.length - 1] !== 1) out.push(1);
      return out;
    }

    // ── Media ──
    function load(c) {
      if (media[c.id]) return media[c.id];
      var m = { video: null, poster: new Image() };
      m.poster.decoding = 'async';
      m.poster.src = base + c.id + '.jpg';
      if (!reduce) {
        var vd = document.createElement('video');
        vd.muted = true; vd.loop = true; vd.playsInline = true; vd.preload = 'auto';
        vd.setAttribute('muted', ''); vd.setAttribute('playsinline', ''); vd.setAttribute('aria-hidden', 'true');
        vd.crossOrigin = 'anonymous';
        formats.forEach(function (f) {
          var s = document.createElement('source');
          s.src = base + c.id + '.' + f.trim();
          s.type = 'video/' + f.trim();
          vd.appendChild(s);
        });
        vd.className = 'fp__pool';
        host.appendChild(vd);
        m.video = vd;
      }
      media[c.id] = m;
      return m;
    }
    function current() { return load(state.clip); }
    function anyVisible() { return cards.some(function (c) { return c.phase !== 'hidden'; }); }
    function syncPlayback() {
      var m = current();
      Object.keys(media).forEach(function (id) {
        var v = media[id].video;
        if (!v) return;
        if (media[id] === m && anyVisible()) { if (v.paused) v.play().catch(function () {}); }
        else if (!v.paused) v.pause();
      });
    }

    // ── Sizing ──
    function layout() {
      var w = state.clip.w * state.scale, h = state.clip.h * state.scale;
      cards.forEach(function (c) {
        c.canvas.style.width = w + 'px';
        c.canvas.width = Math.round(w * dpr);
        c.canvas.height = Math.round(h * dpr);
        c.drawn = false;
        c.cells();
      });
      root.style.setProperty('--fp-frame-h', h + 'px');
      root.setAttribute('data-fp-scale', String(state.scale));
      if (gfx) {
        var need = [512 * 2, 800 * 2];
        if (gfx.c.width < need[0]) gfx.c.width = need[0];
        if (gfx.c.height < need[1]) gfx.c.height = need[1];
      }
      kick();
    }
    function setClip(c) {
      state.clip = c;
      CLIPS.forEach(function (x) { if (x.btn) x.btn.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      load(c);
      layout();
      syncPlayback();
    }
    function setScale(k) {
      state.scale = k;
      sizeBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', [1, 2][i] === k ? 'true' : 'false'); });
      layout();
    }
    function setAuto(v) {
      state.auto = v;
      autoBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
      var now = performance.now();
      cards.forEach(function (c) {
        c.loop = v;
        if (v && !c.manual) { if (c.phase === 'hidden') { autoOrigin(c); go(c, 'in', now); } else c.next = now + HOLD; }
        if (!v && !c.manual && c.phase !== 'hidden') go(c, 'out', now);
      });
      kick();
    }
    function autoOrigin(c) {
      c.origin = c.mode === 4 ? [0.15 + Math.random() * 0.7, 0.2 + Math.random() * 0.6] : [Math.random(), 0.5];
    }

    // ── Timeline ──
    function dur(c, phase) { return Math.max(1, phase === 'out' ? c.dur * c.v.exit : c.dur); }
    function rawOf(c, now) { return clamp((now - c.t0) / dur(c, c.phase), 0, 1); }
    // Switching direction mid-way keeps the frame continuous (exit = entry mirrored in time).
    function go(c, to, now) {
      now = now || performance.now();
      if (to === 'in' && (c.phase === 'in' || c.phase === 'shown')) return;
      if (to === 'out' && (c.phase === 'out' || c.phase === 'hidden')) return;
      var from = c.phase === 'in' || c.phase === 'out' ? rawOf(c, now) : 1;
      c.phase = to;
      c.t0 = now - (from < 1 ? (1 - from) * dur(c, to) : 0);
      if (reduce) c.t0 = now - dur(c, to);
      c.frame.setAttribute('aria-pressed', to === 'in' ? 'true' : 'false');
      c.frame.setAttribute('aria-label', 'Play ' + c.v.name + (to === 'in' ? ' exit' : ' entry'));
      c.hint.style.opacity = '0';
      load(state.clip);
      syncPlayback();
      kick();
    }
    function replay(c) {
      var now = performance.now();
      c.phase = 'hidden';
      autoOrigin(c);
      if (c.mode === 0) c.origin = [0.5, 0.5];
      if (c.mode === 4) c.origin = [0.5, 0.5];
      c.replaying = true;
      go(c, 'in', now);
    }

    // ── Drawing ──
    var colors = { line: [0.24, 0.24, 0.23], surface: [0.1, 0.1, 0.09] };
    function readColors() {
      var cs = getComputedStyle(root);
      colors.line = rgb(cs.getPropertyValue('--fp-frame').trim(), '#3c3c3a');
      colors.surface = rgb(cs.getPropertyValue('--fp-surface').trim(), '#1a1a18');
    }

    var lastUpload = -1;
    function upload() {
      var m = current();
      var gl = gfx.gl;
      var v = m.video, src = null, w = 0, h = 0;
      if (v && v.readyState >= 2 && v.videoWidth) { src = v; w = v.videoWidth; h = v.videoHeight; }
      else if (m.poster.complete && m.poster.naturalWidth) { src = m.poster; w = m.poster.naturalWidth; h = m.poster.naturalHeight; }
      if (!src) return false;
      var stamp = src === v ? v.currentTime : -2;
      if (gfx.src === src && stamp === lastUpload && src !== v) return true;
      gl.bindTexture(gl.TEXTURE_2D, gfx.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.generateMipmap(gl.TEXTURE_2D);
      gfx.src = src; gfx.texW = w; gfx.texH = h; lastUpload = stamp;
      return true;
    }

    function drawGL(c, p, raw, now) {
      var gl = gfx.gl, u = gfx.u, cw = c.canvas.width, ch = c.canvas.height;
      gl.viewport(0, 0, cw, ch);
      gl.uniform2f(u.uRes, cw, ch);
      gl.uniform2f(u.uTexSize, gfx.texW || 1, gfx.texH || 1);
      gl.uniform1f(u.uHasTex, gfx.texW ? 1 : 0);
      gl.uniform2f(u.uOrigin, c.origin[0], c.origin[1]);
      gl.uniform1f(u.uP, p);
      gl.uniform1f(u.uRaw, raw);
      gl.uniform1f(u.uExit, c.phase === 'out' ? 1 : 0);
      gl.uniform1f(u.uPx, Math.max(1, Math.round((c.px || 1) * state.scale * dpr)));
      gl.uniform1f(u.uDpr, Math.max(1, Math.round(dpr)));
      gl.uniform1i(u.uMode, c.mode);
      gl.uniform3fv(u.uLine, colors.line);
      gl.uniform3fv(u.uSurface, colors.surface);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      c.ctx.setTransform(1, 0, 0, 1, 0, 0);
      c.ctx.clearRect(0, 0, cw, ch);
      c.ctx.drawImage(gfx.c, 0, gfx.c.height - ch, cw, ch, 0, 0, cw, ch);
    }

    // 2D fallback: columns for 00, a stepped fade for the rest.
    function draw2D(c, p, raw) {
      var g = c.ctx, cw = c.canvas.width, ch = c.canvas.height, m = current();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cw, ch);
      var src = m.video && m.video.readyState >= 2 ? m.video : m.poster;
      var iw = src.videoWidth || src.naturalWidth, ih = src.videoHeight || src.naturalHeight;
      if (!iw) return;
      var k = Math.max(cw / iw, ch / ih), sw = cw / k, sh = ch / k;
      g.save();
      if (c.mode === 0) {
        g.beginPath();
        for (var i = 0; i < 12; i++) {
          var d = Math.abs(i - clamp(c.origin[0] * 12, 0, 11));
          var h = c.phase === 'out' ? 1 - EASES.quadInOut(clamp((raw * 239 - d * 9) / 140, 0, 1)) : EASES.expoOut(clamp((raw * 386 - d * 16) / 210, 0, 1));
          if (c.phase === 'shown') h = 1;
          g.rect(Math.round(i * cw / 12), 0, Math.round(cw / 12) + 1, ch * h);
        }
        g.clip();
      } else g.globalAlpha = Math.round(p * 8) / 8;
      g.drawImage(src, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cw, ch);
      g.restore();
    }

    function tick(now) {
      raf = 0;
      var busy = false;
      var ready = gfx ? upload() : true;
      cards.forEach(function (c) {
        // Autoplay scheduling.
        if (c.loop && !c.manual && c.next && now >= c.next) {
          c.next = 0;
          if (c.phase === 'shown') go(c, 'out', now);
          else if (c.phase === 'hidden') { autoOrigin(c); go(c, 'in', now); }
        }
        if (c.phase === 'hidden') {
          if (!c.drawn) { c.ctx.setTransform(1, 0, 0, 1, 0, 0); c.ctx.clearRect(0, 0, c.canvas.width, c.canvas.height); c.drawn = true; c.read.textContent = 'REST'; c.hint.style.opacity = ''; }
          if (c.next) busy = true;
          return;
        }
        busy = true;
        c.drawn = false;
        var raw = c.phase === 'shown' ? 1 : rawOf(c, now);
        var e = c.ease === 'site' ? EASES.linear : EASES[c.ease] || EASES.linear;
        var p = c.phase === 'out' ? e(1 - raw) : c.phase === 'in' ? e(raw) : 1;
        if (c.phase === 'out' && c.mode === 0) p = 1 - raw;
        if (ready) { if (gfx) drawGL(c, p, raw, now); else draw2D(c, p, raw); }
        if (raw >= 1) {
          if (c.phase === 'in') {
            c.phase = 'shown';
            if (c.replaying) { c.replaying = false; c.next = now + HOLD; c.loopOnce = true; }
            else if (c.loop && !c.manual) c.next = now + HOLD;
          } else if (c.phase === 'out') {
            c.phase = 'hidden';
            c.frame.setAttribute('aria-label', 'Play ' + c.v.name + ' entry');
            if (c.loop && !c.manual) c.next = now + GAP;
            syncPlayback();
          }
        }
        if (c.phase !== 'hidden') {
          var D = Math.round(dur(c, c.phase));
          c.read.textContent = c.phase === 'shown' ? 'SHOWN · ' + state.clip.label.toUpperCase() :
            (c.phase === 'in' ? 'IN ' : 'OUT ') + Math.round(raw * 100).toString().padStart(3, ' ') + '% · ' + Math.round(raw * D) + ' / ' + D + ' MS';
        }
        // A replay (button) runs entry → hold → exit once, even with autoplay off.
        if (c.loopOnce && c.phase === 'shown' && c.next && now >= c.next && !c.manual) { c.loopOnce = false; c.next = 0; go(c, 'out', now); }
      });
      if (busy) raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf) { readColors(); raf = requestAnimationFrame(tick); } }

    var onRm = function () { reduce = rmq.matches; };
    if (rmq.addEventListener) rmq.addEventListener('change', onRm);
    var onVis = function () { if (document.hidden) syncPlaybackPause(); else { syncPlayback(); kick(); } };
    function syncPlaybackPause() { Object.keys(media).forEach(function (id) { if (media[id].video) media[id].video.pause(); }); }
    on(document, 'visibilitychange', onVis);
    var onTheme = new MutationObserver(function () { readColors(); cards.forEach(function (c) { c.drawn = false; }); kick(); });
    onTheme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    load(state.clip);
    layout();

    var api = function () {
      cancelAnimationFrame(raf);
      raf = 0;
      offs.forEach(function (f) { f(); });
      onTheme.disconnect();
      if (rmq.removeEventListener) rmq.removeEventListener('change', onRm);
      Object.keys(media).forEach(function (id) {
        var v = media[id].video;
        if (v) { v.pause(); v.removeAttribute('src'); while (v.firstChild) v.removeChild(v.firstChild); v.load(); v.remove(); }
      });
      if (gfx && --gfx.users <= 0) {
        var lose = gfx.gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
        R = null;
      }
      host.textContent = '';
      delete root.__fp;
    };
    root.__fp = api;
    return api;
  }

  function fresnoPixels(root) {
    root = root || document;
    var list = Array.prototype.slice.call(root.querySelectorAll('[data-fp]'));
    if (root.matches && root.matches('[data-fp]')) list.unshift(root);
    var cleanups = list.map(wire);
    return function () { cleanups.forEach(function (f) { f(); }); };
  }

  global.fresnoPixels = fresnoPixels;
  var me = document.currentScript;
  if (!(me && me.hasAttribute('data-manual'))) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { fresnoPixels(); });
    else fresnoPixels();
  }
})(window);
