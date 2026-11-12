/* Fresno Lab · 005 · Cursors — https://juancfresno.com/lab/cursores
   Seven custom cursors that change with what they are over, side by side.
   Context is declared in the markup:
     data-cursor="link | view | drag | play | copy | text"   (anything else = base)
     data-cursor-label="View case"                           (optional text override)
   fresnoCursors(root?) wires every [data-fc] demo inside root and returns a cleanup.
   Auto-runs on load unless the script tag has data-manual.
   One requestAnimationFrame loop for every panel (it sleeps when nothing moves);
   per frame only transform and opacity change. Touch / coarse pointers never lose
   their native cursor (a tap previews the state); reduced motion = no lag, no trails,
   no scramble. Attributes on [data-fc]: data-fc-img (card image), data-fc-video
   (video path without extension: .mp4 + .jpg poster), data-fc-email. MIT. */
(function (global) {
  'use strict';

  // ─── Variants ─────────────────────────────────────────────────────────────
  var VARIANTS = [
    { n: '01', key: 'ring', name: 'Dot + ring', tag: 'Spring · pill morph',
      text: 'A dot on the pointer and a ring on a spring. Over something it morphs into a pill with the action; over text it becomes a caret. Calm and readable: the safe one.' },
    { n: '02', key: 'pixel', name: 'Pixel', tag: 'Bitmap · 3 px cells · Bayer dissolve',
      text: 'The cursor is a bitmap on 3 px cells and moves in whole cells. Each state is redrawn in a 3×5 pixel font and dissolves in through a 4×4 Bayer pattern, the front flashing in blue.' },
    { n: '03', key: 'cross', name: 'Crosshair', tag: '24-col grid · snaps to boxes',
      text: 'Two hairlines across the panel over the 24-column grid, with coordinates and column in mono. Over an element, four brackets snap to its box and label it like the site transition does.' },
    { n: '04', key: 'blend', name: 'Negative', tag: 'mix-blend-mode: difference',
      text: 'A blob in difference mode that inverts whatever is under it, like the fixed FRESNO wordmark. A dot on the page, a lens on images, a thin bar on text.' },
    { n: '05', key: 'speed', name: 'Velocity', tag: 'RGB split · stretch',
      text: 'Speed splits it into red and blue along the movement and stretches it. At rest it is one clean dot; the labels split too.' },
    { n: '06', key: 'label', name: 'Label only', tag: 'Mono · inertia · scramble',
      text: 'No dot. A small mono label drifts behind the pointer with inertia, tilts with its speed and retypes itself with the site’s scramble when the context changes.' },
    { n: '07', key: 'neg', name: 'Label negative', tag: 'Difference box · knocked-out text',
      text: 'The same drifting label, but its box is a white difference layer: it inverts whatever is under it and the text is knocked out, so the words show the page itself through the inverted box.' }
  ];

  // Default label per state (data-cursor-label overrides it).
  var LABELS = { base: '', link: 'Open ↗', view: 'View more', drag: 'Drag ↔', play: 'Play', copy: 'Copy', text: '' };
  var STATES = ['link', 'view', 'drag', 'play', 'copy', 'text'];
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/';

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function el(tag, cls, attrs, kids) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (kids) kids.forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  // Frame-rate independent approach: cur → tgt at `rate` per second.
  function app(cur, tgt, dt, rate, snap) { return snap ? tgt : cur + (tgt - cur) * (1 - Math.exp(-dt * rate)); }
  function tf(e, x, y, sx, sy, rot) {
    e.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)' +
      (rot ? ' rotate(' + rot.toFixed(2) + 'deg)' : '') +
      (sx !== undefined ? ' scale(' + sx.toFixed(4) + ',' + (sy === undefined ? sx : sy).toFixed(4) + ')' : '');
  }
  function op(e, o) { var v = o < 0.002 ? '0' : o > 0.998 ? '1' : o.toFixed(3); if (e.style.opacity !== v) e.style.opacity = v; }
  function mq(q) { return global.matchMedia ? global.matchMedia(q) : { matches: false, addEventListener: function () {} }; }

  // ─── 3×5 pixel font (variant 02) ──────────────────────────────────────────
  var FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
    '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
    '9': '111101111001110', '.': '000000000000010', '@': '010101111100011', '-': '000000111000000', ' ': '000000000000000'
  };
  // Wider sprites: rows of '0'/'1'.
  var SPR = {
    '↗': ['01111', '00011', '00101', '01001', '10000'],
    '↔': ['0010100', '0100010', '1111111', '0100010', '0010100'],
    '←': ['00100', '01000', '11111', '01000', '00100'],
    '→': ['00100', '00010', '11111', '00010', '00100'],
    '▶': ['100', '110', '111', '110', '100']
  };
  // Base arrow: 1 = outline (page colour), 2 = fill (text colour). Hotspot = its tip.
  var ARROW = [
    '1', '11', '121', '1221', '12221', '122221', '1222221', '12222221', '122222221', '1222222221',
    '12222211111', '1221221', '121 1221', '11  1221', '1    1221', '     1221', '      11'
  ];
  var IBEAM = ['2222 2222', '    2', '    2', '    2', '    2', '    2', '    2', '    2', '    2', '    2', '    2', '2222 2222'];
  var MINI = ['2', '22', '222', '2222', '22'];

  // ─── Wire one demo ────────────────────────────────────────────────────────
  function wire(root) {
    if (root.__fc) return root.__fc.destroy;
    var reduceQ = mq('(prefers-reduced-motion: reduce)');
    var fineQ = mq('(hover: hover) and (pointer: fine)');
    var opts = { lag: 0.4, size: 1, hide: true };
    var reduce = reduceQ.matches;
    var panels = [];
    var raf = 0, last = 0, alive = true;
    var listeners = [];
    function on(t, ev, fn, o) { t.addEventListener(ev, fn, o); listeners.push(function () { t.removeEventListener(ev, fn, o); }); }

    var imgSrc = root.getAttribute('data-fc-img');
    var vidSrc = root.getAttribute('data-fc-video');
    var email = root.getAttribute('data-fc-email') || 'hello@juancfresno.com';

    // ── Head: controls ──
    var app0 = root.querySelector('[data-fc-app]') || root;
    var lagIn = el('input', '', { type: 'range', min: '0', max: '100', value: '40', 'aria-label': 'Lag' });
    var lagV = el('span', 'fc__v', null, ['40']);
    var sizeIn = el('input', '', { type: 'range', min: '75', max: '150', value: '100', step: '5', 'aria-label': 'Size' });
    var sizeV = el('span', 'fc__v', null, ['100%']);
    var hideB = el('button', 'fc__chip', { type: 'button', 'aria-pressed': 'true' }, ['Hidden']);
    var showB = el('button', 'fc__chip', { type: 'button', 'aria-pressed': 'false' }, ['Visible']);
    var note = el('p', 'fc__note');
    var head = el('div', 'fc__head', null, [
      el('div', 'fc__bar', null, [
        el('fieldset', 'fc__set', null, [el('legend', '', null, ['Lag · spring']), el('div', 'fc__range', null, [lagIn, lagV])]),
        el('fieldset', 'fc__set', null, [el('legend', '', null, ['Size']), el('div', 'fc__range', null, [sizeIn, sizeV])]),
        el('fieldset', 'fc__set', null, [el('legend', '', null, ['Native cursor']), el('div', 'fc__seg', null, [hideB, showB])])
      ]),
      note
    ]);
    var grid = el('div', 'fc__panels');
    app0.appendChild(head);
    app0.appendChild(grid);

    function setNote() {
      var t = [];
      if (!fineQ.matches) t.push('Touch: your native cursor is never replaced. Tap an element to preview its state.');
      if (reduce) t.push('Reduced motion is on: the cursors snap, with no lag, trails or scramble.');
      note.textContent = t.join(' ');
    }
    setNote();

    on(lagIn, 'input', function () { opts.lag = lagIn.value / 100; lagV.textContent = lagIn.value; });
    on(sizeIn, 'input', function () {
      opts.size = sizeIn.value / 100; sizeV.textContent = sizeIn.value + '%';
      panels.forEach(function (P) { P.changed = true; });
    });
    function setHide(h) {
      opts.hide = h;
      hideB.setAttribute('aria-pressed', String(h)); showB.setAttribute('aria-pressed', String(!h));
      panels.forEach(function (P) { if (h) P.stage.setAttribute('data-hide', ''); else P.stage.removeAttribute('data-hide'); });
    }
    on(hideB, 'click', function () { setHide(true); });
    on(showB, 'click', function () { setHide(false); });

    // Light theme? (variant 05 switches to CMY multiply)
    function checkTheme() {
      var c = getComputedStyle(root).getPropertyValue('--fc-bg').trim();
      var probe = document.createElement('span'); probe.style.color = c; root.appendChild(probe);
      var m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g); probe.remove();
      var lum = m ? (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 : 0;
      if (lum > 0.5) root.setAttribute('data-fc-light', ''); else root.removeAttribute('data-fc-light');
      panels.forEach(function (P) { P.changed = true; });
    }
    var mo = global.MutationObserver ? new MutationObserver(checkTheme) : null;
    if (mo) mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    var darkQ = mq('(prefers-color-scheme: dark)');
    if (darkQ.addEventListener) { darkQ.addEventListener('change', checkTheme); listeners.push(function () { darkQ.removeEventListener('change', checkTheme); }); }

    // ── Mock page (one per panel) ──
    function mock() {
      var card = el('a', 'fc__card', { href: '#', 'data-no-transition': '', 'data-cursor': 'view', 'aria-label': 'Card: Shoeciety' });
      if (imgSrc) card.appendChild(el('img', '', { src: imgSrc, alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' }));
      else card.appendChild(el('span', 'fc__ph'));
      card.appendChild(el('span', 'fc__cap', null, ['01 · Shoeciety · 2025']));

      var video = el('button', 'fc__video', { type: 'button', 'data-cursor': 'play', 'aria-label': 'Play video', 'aria-pressed': 'false' });
      var vEl = null;
      if (vidSrc) {
        vEl = el('video', '', { muted: '', loop: '', playsinline: '', preload: 'none', poster: vidSrc + '.jpg', 'aria-hidden': 'true' });
        vEl.muted = true;
        vEl.appendChild(el('source', '', { src: vidSrc + '.mp4', type: 'video/mp4' }));
        video.appendChild(vEl);
      } else video.appendChild(el('span', 'fc__ph'));
      video.appendChild(el('span', 'fc__cap', null, ['Reel · 0:05']));
      video.appendChild(el('span', 'fc__bar0'));

      var mail = el('button', 'fc__mail', { type: 'button', 'data-cursor': 'copy' }, [email]);
      var track = el('div', 'fc__track');
      for (var i = 1; i <= 12; i++) track.appendChild(el('div', 'fc__tile', null, [el('span', '', null, [String(i).padStart(2, '0')])]));
      var strip = el('div', 'fc__strip', { 'data-cursor': 'drag', 'aria-label': 'Draggable strip' }, [track]);

      var m = el('div', 'fc__mock', null, [
        el('div', 'fc__nav', null, [
          el('span', 'fc__brand', null, ['Mock page']),
          el('span', 'fc__links', null, [
            el('a', 'fc__link', { href: '#', 'data-no-transition': '', 'data-cursor': 'link' }, ['Work ↗']),
            el('a', 'fc__link', { href: '#', 'data-no-transition': '', 'data-cursor': 'link', 'data-cursor-label': 'About ↗' }, ['About ↗'])
          ])
        ]),
        card,
        video,
        el('p', 'fc__copy', { 'data-cursor': 'text' }, ['Independent art director and interactive designer in Valencia. Select this text: the cursor turns into a caret.']),
        el('div', 'fc__mailRow', null, [el('span', 'fc__brand', null, ['Email']), mail]),
        strip
      ]);
      return { root: m, video: video, vEl: vEl, mail: mail, strip: strip, track: track };
    }

    // ── Panels ──
    VARIANTS.forEach(function (V, i) {
      var stateEl = el('span', 'fc__state', { 'aria-hidden': 'true' }, ['State · ', el('b', '', null, ['base'])]);
      var stage = el('div', 'fc__stage', { 'data-v': String(i + 1) });
      var M = mock();
      stage.appendChild(M.root);
      var layer = el('div', 'fc__layer', { 'aria-hidden': 'true' });
      stage.appendChild(layer);
      if (opts.hide) stage.setAttribute('data-hide', '');
      var panel = el('section', 'fc__panel', { 'aria-label': V.n + ' ' + V.name }, [
        el('div', 'fc__panelHead', null, [
          el('span', 'fc__n', null, [V.n]),
          el('div', 'fc__titles', null, [el('h3', 'fc__name', null, [V.name]), el('p', 'fc__tag', null, [V.tag])]),
          stateEl
        ]),
        stage,
        el('p', 'fc__text', null, [V.text])
      ]);
      grid.appendChild(panel);

      var P = {
        i: i, v: IMPL[V.key], stage: stage, layer: layer, M: M, stateEl: stateEl.lastChild,
        cx: 0, cy: 0, tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0, sp: 0, svx: 0, svy: 0,
        w: 0, h: 0, inside: false, vis: 0, press: 0, pressed: false,
        state: 'base', label: '', target: null, rect: null, changed: true, touchUntil: 0,
        stripX: 0, stripV: 0, drag: null, override: null, overrideUntil: 0, size: 1
      };
      P.els = P.v.build(P, layer);
      panels.push(P);

      function locate(cx, cy) {
        var r = stage.getBoundingClientRect();
        P.w = r.width; P.h = r.height; P.ox = r.left; P.oy = r.top;
        P.tx = cx - r.left; P.ty = cy - r.top;
      }
      function resolve(target) {
        var t = target && target.closest ? target.closest('[data-cursor]') : null;
        if (t && !stage.contains(t)) t = null;
        var s = t ? t.getAttribute('data-cursor') : 'base';
        if (STATES.indexOf(s) < 0) s = 'base';
        var lbl = t ? (t.getAttribute('data-cursor-label') || LABELS[s]) : '';
        if (t === M.video && M.video.getAttribute('aria-pressed') === 'true') lbl = 'Pause';
        if (P.override && t === P.override.el && performance.now() < P.overrideUntil) lbl = P.override.label;
        if (s !== P.state || lbl !== P.label || t !== P.target) {
          P.state = s; P.label = lbl; P.target = t; P.changed = true;
          P.stateEl.textContent = s + (lbl && lbl.toLowerCase() !== s ? ' · ' + lbl : '');
        }
      }
      function enter(e) {
        locate(e.clientX, e.clientY);
        if (!P.inside) { P.x = P.tx; P.y = P.ty; P.vx = P.vy = 0; P.px = P.x; P.py = P.y; }
        P.inside = true; stage.setAttribute('data-on', '');
        resolve(e.target); kick();
      }
      on(stage, 'pointerenter', function (e) { if (e.pointerType === 'mouse' || fineQ.matches) enter(e); });
      on(stage, 'pointermove', function (e) {
        P.cx = e.clientX; P.cy = e.clientY;
        if (e.pointerType === 'touch') { if (!P.drag) return; }
        else if (!P.inside) enter(e);
        locate(e.clientX, e.clientY);
        if (P.drag) {
          var dx = e.clientX - P.drag.x0, now = performance.now();
          var nx = P.drag.s0 + dx;
          P.stripV = (nx - P.stripX) / Math.max(1, now - P.drag.t) * 16; P.drag.t = now;
          P.stripX = nx;
        } else resolve(e.target);
        kick();
      });
      on(stage, 'pointerleave', function (e) {
        if (e.pointerType === 'touch') return;
        P.inside = false; stage.removeAttribute('data-on'); kick();
      });
      on(stage, 'pointerdown', function (e) {
        P.pressed = true;
        if (e.pointerType !== 'mouse' && !fineQ.matches) {
          // Touch: preview the state where the finger lands, never hide anything.
          locate(e.clientX, e.clientY);
          P.x = P.tx; P.y = P.ty; P.vx = P.vy = 0; P.px = P.x; P.py = P.y;
          P.inside = false; P.touchUntil = performance.now() + 1400;
          resolve(e.target);
        }
        var s = e.target.closest && e.target.closest('.fc__strip');
        if (s && stage.contains(s) && e.button === 0) {
          P.drag = { x0: e.clientX, s0: P.stripX, t: performance.now(), id: e.pointerId };
          try { stage.setPointerCapture(e.pointerId); } catch (_) {}
          e.preventDefault();
        }
        kick();
      });
      function up(e) {
        P.pressed = false;
        if (P.drag) { try { stage.releasePointerCapture(P.drag.id); } catch (_) {} P.drag = null; }
        if (e && e.pointerType === 'mouse') resolve(document.elementFromPoint(e.clientX, e.clientY));
        kick();
      }
      on(stage, 'pointerup', up);
      on(stage, 'pointercancel', up);
      on(stage, 'click', function (e) {
        var a = e.target.closest('a[href="#"]');
        if (a) e.preventDefault();
        if (e.target.closest('.fc__video')) {
          var playing = M.video.getAttribute('aria-pressed') !== 'true';
          M.video.setAttribute('aria-pressed', String(playing));
          M.video.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
          if (playing) M.video.setAttribute('data-playing', ''); else M.video.removeAttribute('data-playing');
          if (M.vEl) { try { playing ? M.vEl.play().catch(function () {}) : M.vEl.pause(); } catch (_) {} }
          resolve(M.video); kick();
        }
        if (e.target.closest('.fc__mail')) {
          try { navigator.clipboard && navigator.clipboard.writeText(email).catch(function () {}); } catch (_) {}
          P.override = { el: M.mail, label: 'Copied' }; P.overrideUntil = performance.now() + 1200;
          resolve(M.mail); kick();
          setTimeout(function () { if (alive && P.target === M.mail) { resolve(M.mail); kick(); } }, 1250);
        }
      });
      // Keep the cursor glued while the page scrolls under a still mouse.
      on(global, 'scroll', function () { if (P.inside) { locate(P.cx, P.cy); resolve(document.elementFromPoint(P.cx, P.cy)); kick(); } }, { passive: true });
    });

    function onReduce() { reduce = reduceQ.matches; setNote(); panels.forEach(function (P) { P.changed = true; }); kick(); }
    if (reduceQ.addEventListener) { reduceQ.addEventListener('change', onReduce); listeners.push(function () { reduceQ.removeEventListener('change', onReduce); }); }
    if (fineQ.addEventListener) { fineQ.addEventListener('change', setNote); listeners.push(function () { fineQ.removeEventListener('change', setNote); }); }
    checkTheme();

    // ── One loop for every panel ──
    function kick() { if (!raf && alive) { last = 0; raf = requestAnimationFrame(tick); } }
    function tick(now) {
      raf = 0;
      var dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
      last = now;
      var busy = false;
      for (var k = 0; k < panels.length; k++) if (step(panels[k], dt, now)) busy = true;
      if (busy) raf = requestAnimationFrame(tick);
    }

    function step(P, dt, now) {
      var touching = now < P.touchUntil;
      var show = P.inside || touching;
      var snap = reduce;
      P.size = opts.size;
      P.reduce = reduce;
      // Spring: stiffness from the lag control (0 = glued), damping ratio 0.75.
      var lag = P.v.lagScale ? Math.min(1, opts.lag * P.v.lagScale) : opts.lag;
      if (snap || lag < 0.01 || touching) { P.x = P.tx; P.y = P.ty; P.vx = P.vy = 0; }
      else {
        var kS = 900 * Math.pow(1 - lag, 2.2) + 40, c = 2 * 0.75 * Math.sqrt(kS);
        var n = Math.ceil(dt / (1 / 240)), h = dt / n;
        for (var s = 0; s < n; s++) {
          P.vx += (kS * (P.tx - P.x) - c * P.vx) * h; P.vy += (kS * (P.ty - P.y) - c * P.vy) * h;
          P.x += P.vx * h; P.y += P.vy * h;
        }
      }
      // Measured velocity (px/s) of the drawn cursor, smoothed; 0 with reduced motion.
      var ivx = (P.x - P.px) / dt, ivy = (P.y - P.py) / dt;
      if (P.v.rawSpeed) { ivx = (P.tx - (P.ptx === undefined ? P.tx : P.ptx)) / dt; ivy = (P.ty - (P.pty === undefined ? P.ty : P.pty)) / dt; }
      P.px = P.x; P.py = P.y; P.ptx = P.tx; P.pty = P.ty;
      P.svx = snap ? 0 : app(P.svx, ivx, dt, 22); P.svy = snap ? 0 : app(P.svy, ivy, dt, 22);
      P.sp = Math.sqrt(P.svx * P.svx + P.svy * P.svy);

      P.vis = app(P.vis, show ? 1 : 0, dt, show ? 30 : 16, snap);
      P.press = app(P.press, P.pressed && show ? 1 : 0, dt, 28, snap);
      if (P.rectEl !== P.target || P.state !== 'base') {
        P.rect = null;
        if (P.target) {
          var r = P.target.getBoundingClientRect();
          P.rect = { x: r.left - P.ox, y: r.top - P.oy, w: r.width, h: r.height };
        }
        P.rectEl = P.target;
      }

      // Strip drag inertia.
      var stripBusy = false;
      if (!P.drag && Math.abs(P.stripV) > 0.05 && !snap) { P.stripX += P.stripV; P.stripV *= Math.pow(0.9, dt * 60); stripBusy = true; }
      else if (!P.drag) P.stripV = 0;
      var maxX = 0, minX = Math.min(0, P.M.strip.clientWidth - P.M.track.scrollWidth);
      var cl = clamp(P.stripX, minX, maxX);
      if (!P.drag && cl !== P.stripX) { P.stripX = app(P.stripX, cl, dt, 18, snap); if (Math.abs(P.stripX - cl) < 0.3) P.stripX = cl; stripBusy = true; }
      P.M.track.style.transform = 'translate3d(' + P.stripX.toFixed(2) + 'px,0,0)';
      if (P.drag) stripBusy = true;

      var vBusy = P.v.frame(P, dt, now, snap);
      P.changed = false;
      var moving = Math.abs(P.tx - P.x) > 0.1 || Math.abs(P.ty - P.y) > 0.1 || P.sp > 1;
      var fading = show ? P.vis < 0.999 : P.vis > 0.001;
      return show || fading || moving || stripBusy || vBusy || touching;
    }

    var api = {
      destroy: function () {
        alive = false;
        if (raf) cancelAnimationFrame(raf);
        listeners.forEach(function (f) { f(); });
        if (mo) mo.disconnect();
        panels.forEach(function (P) { if (P.M.vEl) { P.M.vEl.pause(); P.M.vEl.removeAttribute('src'); } });
        head.remove(); grid.remove();
        root.removeAttribute('data-fc-light');
        delete root.__fc;
      }
    };
    root.__fc = api;
    return api.destroy;
  }

  // ─── Variant implementations ──────────────────────────────────────────────
  // build(P, layer) → elements; frame(P, dt, now, snap) → true while animating.
  var IMPL = {};

  // 01 · Dot + ring: dot glued to the pointer, ring on the spring; the ring hands over
  // to a filled pill (two caps + a 1 px middle scaled in X) that carries the label.
  IMPL.ring = {
    build: function (P, L) {
      var E = {
        ring: el('div', 'fc1-ring'), capL: el('div', 'fc1-cap'), capR: el('div', 'fc1-cap'), mid: el('div', 'fc1-mid'),
        lbl: el('div', 'fc__lbl fc1-lbl'), dot: el('div', 'fc1-dot')
      };
      [E.ring, E.capL, E.capR, E.mid, E.lbl, E.dot].forEach(function (e) { L.appendChild(e); });
      P.m = { d: 0, ext: 0, ring: 1, ringS: 1, fill: 0, lbl: 0, dotSX: 1, dotSY: 1, dot: 1 };
      P.lw = 0;
      return E;
    },
    frame: function (P, dt, now, snap) {
      var E = P.els, m = P.m, s = P.size, st = P.state;
      if (P.changed) {
        var txt = st === 'link' ? (P.label || '↗') : st === 'play' ? (P.label || 'Play') : P.label;
        E.lbl.textContent = txt;
        E.lbl.style.fontSize = st === 'link' && txt.length <= 2 ? '1.125rem' : '';
        P.lw = txt ? E.lbl.offsetWidth : 0; P.lh = E.lbl.offsetHeight;
        // Over media the pill turns ink, so it reads on light and dark images alike.
        if (st === 'view' || st === 'play') P.layer.setAttribute('data-ink', ''); else P.layer.removeAttribute('data-ink');
      }
      var T = { d: 0, ext: 0, ring: 1, ringS: 1, fill: 0, lbl: 0, dotSX: 1, dotSY: 1, dot: 1 };
      if (st === 'link') { T.d = 44 * s; T.ext = Math.max(0, (P.lw + 20 - T.d) / 2); T.fill = 1; T.lbl = 1; T.ring = 0; T.ringS = 1.3; T.dot = 0; }
      else if (st === 'play') { T.d = 76 * s; T.fill = 1; T.lbl = 1; T.ring = 0; T.ringS = 1.8; T.dot = 0; }
      else if (st === 'text') { T.ring = 0; T.ringS = 0.4; T.dotSX = 2 / 6; T.dotSY = 22 / 6; }
      else if (st !== 'base') { T.d = 34 * s; T.ext = Math.max(0, (P.lw + 28 - T.d) / 2); T.fill = 1; T.lbl = 1; T.ring = 0; T.ringS = 1.2; T.dot = 0; }
      if (P.press > 0.01) { T.ringS *= 1 - 0.25 * P.press; T.d *= 1 - 0.1 * P.press; }
      var busy = false;
      for (var k in T) {
        var r = k === 'lbl' ? (T.lbl ? 14 : 40) : k === 'fill' ? 26 : 20;
        m[k] = app(m[k], T[k], dt, r, snap);
        if (Math.abs(m[k] - T[k]) > 0.002) busy = true;
      }
      var v = P.vis, x = P.x, y = P.y;
      tf(E.ring, x, y, m.ringS * s); op(E.ring, m.ring * v);
      var dS = Math.max(0.001, m.d / 100);
      tf(E.capL, x - m.ext, y, dS); tf(E.capR, x + m.ext, y, dS); tf(E.mid, x, y, Math.max(0.001, m.ext * 2), dS);
      op(E.capL, m.fill * v); op(E.capR, m.fill * v); op(E.mid, m.ext > 0.5 ? m.fill * v : 0);
      tf(E.lbl, x - P.lw / 2, y - P.lh / 2, 1); op(E.lbl, m.lbl * v);
      tf(E.dot, P.tx, P.ty, m.dotSX * s, m.dotSY * s); op(E.dot, Math.max(m.dot, st === 'text' ? 1 : 0) * v);
      return busy;
    }
  };

  // 02 · Pixel: the cursor is a bitmap on a cell grid; state changes dissolve
  // through a 4×4 Bayer matrix with a blue front. Drawn only while it changes.
  var BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var PCOLS = 72, PROWS = 28, HX = 6, HY = 8;
  function blank() { return new Uint8Array(PCOLS * PROWS); }
  function put(b, x, y, v) { x += HX; y += HY; if (x >= 0 && y >= 0 && x < PCOLS && y < PROWS) b[y * PCOLS + x] = v; }
  function sprite(b, rows, ox, oy, map) {
    for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) {
      var ch = rows[r][c]; if (ch === ' ' || ch === '0') continue;
      put(b, ox + c, oy + r, map ? map[ch] : +ch);
    }
  }
  function textW(t) {
    var w = 0;
    for (var i = 0; i < t.length; i++) w += (SPR[t[i]] ? SPR[t[i]][0].length : 3) + 1;
    return Math.max(0, w - 1);
  }
  function text(b, t, ox, oy, v) {
    var x = ox;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i], sp = SPR[ch];
      if (sp) { sprite(b, sp, x, oy, { '1': v }); x += sp[0].length + 1; continue; }
      var g = FONT[ch] || FONT[' '];
      for (var k = 0; k < 15; k++) if (g[k] === '1') put(b, x + (k % 3), oy + ((k / 3) | 0), v);
      x += 4;
    }
  }
  function chip(b, t, ox, oy) {
    var w = textW(t) + 4, h = 9;
    for (var y = -1; y <= h; y++) for (var x = -1; x <= w; x++) put(b, ox + x, oy + y, (y < 0 || y === h || x < 0 || x === w) ? 1 : 2);
    text(b, t, ox + 2, oy + 2, 1);
  }
  function pixelBitmap(st, label) {
    var b = blank();
    var t = (label || '').toUpperCase();
    if (st === 'base') { sprite(b, ARROW, 0, 0); return b; }
    if (st === 'text') { sprite(b, IBEAM, -4, -6); return b; }
    sprite(b, MINI, 0, 0);
    if (st === 'link') chip(b, t || '↗', 5, 5);
    else if (st === 'play') chip(b, '▶ ' + (t || 'PLAY'), 5, 5);
    else if (st === 'drag' && !label) chip(b, '← DRAG →', 5, 5);
    else chip(b, t || st.toUpperCase(), 5, 5);
    return b;
  }
  IMPL.pixel = {
    build: function (P, L) {
      var cv = el('canvas', 'fc2-cv');
      L.appendChild(cv);
      P.pa = blank(); P.pb = blank(); P.pt = 1; P.cell = 3;
      IMPL.pixel.resize(P, cv);
      return { cv: cv, g: cv.getContext('2d') };
    },
    resize: function (P, cv) {
      cv = cv || P.els.cv;
      var dpr = Math.min(2, global.devicePixelRatio || 1);
      var dev = Math.max(1, Math.round(3 * P.size * dpr));   // cell snapped to device pixels
      P.cell = dev / dpr; P.dev = dev;
      cv.width = PCOLS * dev; cv.height = PROWS * dev;
      cv.style.width = (PCOLS * P.cell) + 'px'; cv.style.height = (PROWS * P.cell) + 'px';
      P.pdirty = true;
    },
    frame: function (P, dt, now, snap) {
      var E = P.els;
      if (P.changed) {
        var next = pixelBitmap(P.state, P.label);
        // Start from what is on screen now.
        if (P.pt < 1) { var cur = blank(); for (var i = 0; i < cur.length; i++) cur[i] = bayerPick(P, i); P.pa = cur; }
        else P.pa = P.pb;
        P.pb = next; P.pt = snap ? 1 : 0; P.pdirty = true;
        if (P.size !== P.lastSize) { P.lastSize = P.size; IMPL.pixel.resize(P); }
      }
      var busy = false;
      if (P.pt < 1) { P.pt = Math.min(1, P.pt + dt / 0.2); P.pdirty = true; busy = true; }
      if (P.pdirty) { drawPixels(P, E); P.pdirty = false; }
      var c = P.cell;
      var x = Math.round(P.x / c) * c - HX * c, y = Math.round(P.y / c) * c - HY * c;
      var sc = 1 - 0.12 * P.press;
      E.cv.style.transformOrigin = (HX * c) + 'px ' + (HY * c) + 'px';
      tf(E.cv, x, y, sc); op(E.cv, P.vis > 0.5 ? 1 : 0);   // pixels pop, they don't fade
      return busy;
    }
  };
  function bayerPick(P, i) {
    var x = i % PCOLS, y = (i / PCOLS) | 0;
    var th = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
    return th < P.pt ? P.pb[i] : P.pa[i];
  }
  function drawPixels(P, E) {
    var g = E.g, d = P.dev, cs = getComputedStyle(P.layer);
    var fg = cs.getPropertyValue('--fc-fg').trim() || '#fcfcf7';
    var bg = cs.getPropertyValue('--fc-bg').trim() || '#10100e';
    var ac = cs.getPropertyValue('--fc-accent').trim() || '#003dff';
    g.clearRect(0, 0, E.cv.width, E.cv.height);
    var cols = [null, bg, fg, ac];
    for (var i = 0; i < P.pb.length; i++) {
      var x = i % PCOLS, y = (i / PCOLS) | 0;
      var th = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      var v = th < P.pt ? P.pb[i] : P.pa[i];
      if (P.pt < 1 && v && Math.abs(th - P.pt) < 0.13 && P.pa[i] !== P.pb[i]) v = 3;   // the front
      if (!v) continue;
      g.fillStyle = cols[v];
      g.fillRect(x * d, y * d, d, d);
    }
  }

  // 03 · Crosshair: hairlines over the 24-col grid, coordinates + column readout,
  // four brackets that snap to the hovered element's box with a wireframe tag.
  var KIND = { link: 'A', view: 'IMG', drag: 'ROW', play: 'VIDEO', copy: 'MAIL', text: 'P' };
  IMPL.cross = {
    rawSpeed: true,
    build: function (P, L) {
      var gridEl = el('div', 'fc3-grid', { 'aria-hidden': 'true' });
      for (var i = 0; i < 24; i++) gridEl.appendChild(el('i'));
      P.stage.insertBefore(gridEl, P.stage.firstChild);
      var E = { h: el('div', 'fc3-h'), v: el('div', 'fc3-v'), c: [], read: el('div', 'fc3-read'), tag: el('div', 'fc3-tag'), size: el('div', 'fc3-size'), pt: el('div', 'fc3-pt'), grid: gridEl };
      L.appendChild(E.h); L.appendChild(E.v);
      for (var k = 0; k < 4; k++) { var c = el('div', 'fc3-c', { 'data-c': String(k) }); E.c.push(c); L.appendChild(c); }
      L.appendChild(E.tag); L.appendChild(E.size); L.appendChild(E.read); L.appendChild(E.pt);
      P.m = { x0: 0, y0: 0, x1: 0, y1: 0, snap: 0, tag: 0 };
      P.lastRead = '';
      return E;
    },
    frame: function (P, dt, now, snap) {
      var E = P.els, m = P.m, s = P.size, v = P.vis;
      var hov = P.state !== 'base' && P.rect;
      var b = 10 * s;
      var T = hov ? { x0: P.rect.x - 4, y0: P.rect.y - 4, x1: P.rect.x + P.rect.w + 4, y1: P.rect.y + P.rect.h + 4 }
                  : { x0: P.x - b, y0: P.y - b, x1: P.x + b, y1: P.y + b };
      if (!m.init || !v) { m.x0 = T.x0; m.y0 = T.y0; m.x1 = T.x1; m.y1 = T.y1; m.init = true; }
      var rate = hov ? 20 : 34, busy = false;
      ['x0', 'y0', 'x1', 'y1'].forEach(function (k) { m[k] = app(m[k], T[k], dt, rate, snap); if (Math.abs(m[k] - T[k]) > 0.2) busy = true; });
      m.snap = app(m.snap, hov ? 1 : 0, dt, 18, snap);
      if (P.changed) {
        E.tag.textContent = hov ? KIND[P.state] + ' · ' + (P.label || P.state).toUpperCase() : '';
        if (hov) { E.size.textContent = Math.round(P.rect.w) + ' × ' + Math.round(P.rect.h); P.sw = E.size.offsetWidth; }
      }
      // Lines: across the whole stage, on the spring position.
      tf(E.h, 0, Math.round(P.y)); tf(E.v, Math.round(P.x), 0);
      E.h.style.width = P.w + 'px'; E.v.style.height = P.h + 'px';
      op(E.h, v * (1 - 0.6 * m.snap)); op(E.v, v * (1 - 0.6 * m.snap));
      tf(E.c[0], m.x0, m.y0); tf(E.c[1], m.x1, m.y0); tf(E.c[2], m.x1, m.y1); tf(E.c[3], m.x0, m.y1);
      for (var k = 0; k < 4; k++) op(E.c[k], v);
      tf(E.tag, m.x0, m.y0 - 18); op(E.tag, v * m.snap);
      tf(E.size, m.x1 - (P.sw || 0), m.y1 + 6); op(E.size, v * m.snap);
      tf(E.pt, P.tx, P.ty); op(E.pt, v);
      // Readout: x · y in px and the column under the pointer (24 cols, 16 px margins).
      var col = clamp(Math.floor((P.x - 16) / ((P.w - 32) / 24)) + 1, 1, 24);
      var read = 'X ' + String(Math.round(P.x)).padStart(4, '0') + ' · Y ' + String(Math.round(P.y)).padStart(4, '0') + ' · C ' + String(col).padStart(2, '0') + '/24';
      if (read !== P.lastRead) { E.read.textContent = read; if (!P.rw || read.length !== P.lastRead.length) P.rw = E.read.offsetWidth; P.lastRead = read; }
      var rx = P.x + 12, ry = P.y + 12;
      if (rx + P.rw + 4 > P.w) rx = P.x - 12 - P.rw;
      if (ry + 20 > P.h) ry = P.y - 26;
      tf(E.read, rx, ry); op(E.read, v * (1 - m.snap));
      return busy;
    }
  };

  // 04 · Negative: one big white disc in difference mode, scaled per state.
  IMPL.blend = {
    build: function (P, L) {
      var E = { blob: el('div', 'fc4-blob'), lbl: el('div', 'fc__lbl fc4-lbl') };
      L.appendChild(E.blob); L.appendChild(E.lbl);
      P.m = { sx: 0.125, sy: 0.125, lbl: 0 };
      P.lw = 0; P.lh = 0;
      return E;
    },
    frame: function (P, dt, now, snap) {
      var E = P.els, m = P.m, s = P.size, st = P.state;
      if (P.changed) {
        E.lbl.textContent = st === 'play' ? '▶ ' + (P.label || 'Play') : st === 'link' && !P.label ? '↗' : P.label;
        P.lw = E.lbl.offsetWidth; P.lh = E.lbl.offsetHeight;
      }
      var d = { base: 20, link: 64, view: 132, drag: 104, play: 112, copy: 88, text: 0 }[st] * s;
      var T = { sx: d / 160, sy: d / 160, lbl: st === 'base' || st === 'text' ? 0 : 1 };
      if (st === 'drag') T.sx *= 1.3;
      if (st === 'text') { T.sx = 3 * s / 160; T.sy = 30 * s / 160; }
      if (P.press > 0.01) { T.sx *= 1 - 0.15 * P.press; T.sy *= 1 - 0.15 * P.press; }
      var busy = false;
      for (var k in T) { m[k] = app(m[k], T[k], dt, k === 'lbl' ? 18 : 16, snap); if (Math.abs(m[k] - T[k]) > 0.002) busy = true; }
      tf(E.blob, P.x, P.y, Math.max(0.001, m.sx), Math.max(0.001, m.sy)); op(E.blob, P.vis);
      tf(E.lbl, P.x - P.lw / 2, P.y - P.lh / 2); op(E.lbl, P.vis * m.lbl);
      return busy;
    }
  };

  // 05 · Velocity: three channel copies (R · G · B), R ahead along the velocity and
  // B behind; the dot stretches with speed. Labels split the same way.
  IMPL.speed = {
    build: function (P, L) {
      var E = { d: [], l: [] };
      ['r', 'g', 'b'].forEach(function (c) { var e = el('div', 'fc5-dot fc5-' + c); E.d.push(e); L.appendChild(e); });
      E.chip = el('div', 'fc5-chip'); L.appendChild(E.chip);   // backing, so the split reads on images
      ['r', 'g', 'b'].forEach(function (c) { var e = el('div', 'fc__lbl fc5-lbl fc5-' + c); E.l.push(e); L.appendChild(e); });
      P.m = { dot: 1, lbl: 0, cs: 1, csy: 1 };
      P.lw = 0; P.lh = 0;
      return E;
    },
    frame: function (P, dt, now, snap) {
      var E = P.els, m = P.m, s = P.size, st = P.state;
      if (P.changed) {
        var t = st === 'link' && !P.label ? '↗' : st === 'play' ? '▶ ' + (P.label || 'Play') : st === 'text' ? '' : P.label;
        for (var i = 0; i < 3; i++) { E.l[i].textContent = t; E.l[i].style.fontSize = st === 'link' && t.length <= 2 ? '1.5rem' : ''; }
        P.lw = E.l[1].offsetWidth; P.lh = E.l[1].offsetHeight;
        E.chip.style.width = (P.lw + 24) + 'px'; E.chip.style.height = (P.lh + 16) + 'px';
      }
      var T = { dot: st === 'base' || st === 'text' ? 1 : 0, lbl: st === 'base' || st === 'text' ? 0 : 1, cs: st === 'text' ? 2 / 14 : 1, csy: st === 'text' ? 24 / 14 : 1 };
      var busy = false;
      for (var k in T) { m[k] = app(m[k], T[k], dt, 20, snap); if (Math.abs(m[k] - T[k]) > 0.002) busy = true; }
      var sp = P.sp, ang = Math.atan2(P.svy, P.svx);
      var ux = sp > 0.01 ? P.svx / sp : 0, uy = sp > 0.01 ? P.svy / sp : 0;
      var split = snap ? 0 : clamp((sp - 40) / 60, 0, 14) * s;        // px, along the movement
      var stretch = snap ? 1 : 1 + clamp(sp / 1100, 0, 2.2);
      var deg = ang * 180 / Math.PI;
      var off = [split, 0, -split];
      var press = 1 - 0.25 * P.press;
      for (var j = 0; j < 3; j++) {
        var ox = ux * off[j], oy = uy * off[j];
        if (st === 'text') tf(E.d[j], P.x + ox, P.y + oy, m.cs * s, m.csy * s);
        else tf(E.d[j], P.x + ox, P.y + oy, stretch * s * press * m.cs, (1 / Math.sqrt(stretch)) * s * press * m.csy, sp > 5 ? deg : 0);
        op(E.d[j], P.vis * m.dot);
        tf(E.l[j], P.x - P.lw / 2 + ox * 1.4, P.y - P.lh / 2 + oy * 1.4); op(E.l[j], P.vis * m.lbl);
      }
      tf(E.chip, P.x - P.lw / 2 - 12, P.y - P.lh / 2 - 8); op(E.chip, P.vis * m.lbl * 0.92);
      return busy || split > 0.05;
    }
  };

  // 06 · Label only: a mono chip that trails with extra inertia, tilts with its
  // horizontal speed and scrambles to the new text (260 ms) on every change.
  // 07 · Label negative reuses it with a different chip class (see fc7-chip).
  var BASE6 = 'Explore';
  function labelImpl(cls) { return {
    lagScale: 1.6,
    build: function (P, L) {
      var E = { chip: el('div', 'fc__lbl ' + cls, { 'data-s': 'base' }) };
      E.chip.textContent = BASE6.toUpperCase();
      L.appendChild(E.chip);
      P.sc = { from: '', to: BASE6.toUpperCase(), at: -1 };
      P.m = { rot: 0 };
      return E;
    },
    frame: function (P, dt, now, snap) {
      var E = P.els, st = P.state, sc = P.sc;
      if (P.changed) {
        var t = (st === 'base' ? BASE6 : st === 'text' ? 'Select text' : st === 'play' ? (P.label || 'Play') + ' ▶' : P.label || st).toUpperCase();
        if (t !== sc.to) { sc.from = E.chip.textContent; sc.to = t; sc.at = snap ? -1 : now; if (snap) E.chip.textContent = t; }
        E.chip.setAttribute('data-s', st);
      }
      var busy = false;
      if (sc.at >= 0) {
        var p = clamp((now - sc.at) / 260, 0, 1), to = sc.to;
        if (p >= 1) { E.chip.textContent = to; sc.at = -1; }
        else {
          var n = Math.floor(p * to.length), out = '';
          for (var i = 0; i < to.length; i++) {
            var ch = to[i];
            if (i < n || !/[A-Za-z0-9]/.test(ch)) out += ch;
            else out += i < sc.from.length && Math.random() < 0.25 ? sc.from[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }
          E.chip.textContent = out; busy = true;
        }
      }
      P.m.rot = app(P.m.rot, snap ? 0 : clamp(P.svx / 120, -6, 6), dt, 14, snap);
      var s = P.size * (1 - 0.08 * P.press);
      tf(E.chip, P.x + 14, P.y + 16, s, s, P.m.rot);
      E.chip.style.transformOrigin = '0 0';
      op(E.chip, P.vis);
      return busy || Math.abs(P.m.rot) > 0.05;
    }
  }; }
  IMPL.label = labelImpl('fc6-chip');
  IMPL.neg = labelImpl('fc7-chip');

  function fresnoCursors(root) {
    root = root || document;
    var list = Array.prototype.slice.call(root.querySelectorAll('[data-fc]'));
    if (root.matches && root.matches('[data-fc]')) list.unshift(root);
    var cleanups = list.map(wire);
    return function () { cleanups.forEach(function (f) { f(); }); };
  }

  global.fresnoCursors = fresnoCursors;
  var me = document.currentScript;
  if (!(me && me.hasAttribute('data-manual'))) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { fresnoCursors(); });
    else fresnoCursors();
  }
})(window);
