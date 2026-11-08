/* Fresno Lab · 003 · Galleries — https://juancfresno.com/lab/galerias
   fresnoGalleries(root?) wires every [data-fg] demo inside root and returns a cleanup function.
   Eight gallery layouts over one list of images, no dependencies:
   01 arc · 02 endless canvas · 03 slats · 04 strip · 05 deck · 06 zoom grid · 07 bars · 08 runway.
   Images: data-fg-src="items.json" ([{ t, d: 'MM/YYYY', src, th, w, h, url }]) or, without it,
   generated placeholders. Auto-runs on load unless the script tag has data-manual. MIT. */
(function (global) {
  var doc = document;
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/';
  var EASE = 'cubic-bezier(0.19, 1, 0.22, 1)';

  var VIEWS = [
    { id: 'arco', n: '01', name: 'Arc', star: 'Home', note: 'The pieces on a drum that turns with scroll and drag, with inertia, and always stops on one. At rest the centre one is in colour; in motion everything turns to dither. Idea from mathiasadolfsson.dev.' },
    { id: 'canvas', n: '02', name: 'Infinite canvas', star: 'Feed', note: 'A borderless plane that repeats both ways: drag, use the wheel or the arrow keys. Capped inertia, a minimap (also draggable) and “Grid” to go back to a still grid. Juan’s idea.' },
    { id: 'laminas', n: '03', name: 'Plates', note: 'An open grid with gaps and [001] numbering. Each image is cut into 8 slats: they come in staggered on scroll and shift with the cursor. Idea from Eva Sánchez’s playground.' },
    { id: 'tira', n: '04', name: 'Strip', note: 'A row that moves sideways with vertical scroll. Speed tilts and shrinks the pieces; when it stops they settle back.' },
    { id: 'mazo', n: '05', name: 'Deck', note: 'A deck of cards: drag the top one aside, or use ← →. The next three peek out and it loops at the end.' },
    { id: 'rejilla', n: '06', name: 'Zoom grid', note: 'A dense grid, one piece per column. Click and the piece grows from its place until it is whole (FLIP); Esc, a click outside or dragging it down sends it back.' },
    { id: 'barras', n: '07', name: 'Bars', note: 'The whole archive at once, in bands ordered by date. The cursor (or a finger) opens a loupe and the years run underneath. My own proposal.' },
    { id: 'pasarela', n: '08', name: 'Runway', note: 'The pieces stand on a floor in perspective with the 12-column grid. Scroll and drag take you along the row; go fast and the pieces fold like paper. Idea from jesperlandberg.com.' }
  ];
  var COUNTS = [60, 120, 200];
  var NOTE_REDUCE = 'Reduced motion is on: every gallery shows as a still grid.';

  /* ─── Utilities ──────────────────────────────────────────────────────── */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mod(n, m) { return ((n % m) + m) % m; }
  function pad3(n) { return String(n).padStart(3, '0'); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function h(tag, cls, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    return e;
  }
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function on(el, ev, fn, opt, offs) { el.addEventListener(ev, fn, opt); offs.push(function () { el.removeEventListener(ev, fn, opt); }); }

  // One rAF loop per view; step() returns true while it still has work, so idle views cost nothing.
  function makeLoop(step) {
    var raf = 0;
    function tick(t) { raf = 0; if (step(t)) raf = requestAnimationFrame(tick); }
    return { wake: function () { if (!raf) raf = requestAnimationFrame(tick); }, stop: function () { cancelAnimationFrame(raf); raf = 0; } };
  }

  // Pointer drag with a 6 px threshold, velocity (px/ms) and click suppression after a drag.
  function drag(el, o, offs) {
    var id = null, sx, sy, lx, ly, hist, moved, justDragged = false;
    function down(e) {
      if (e.button > 0 || id !== null) return;
      if (o.filter && !o.filter(e)) return;
      id = e.pointerId; sx = lx = e.clientX; sy = ly = e.clientY; moved = false;
      hist = [{ x: lx, y: ly, t: e.timeStamp }];
      if (o.start) o.start(e);
    }
    function move(e) {
      if (e.pointerId !== id) return;
      var dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      if (!moved && Math.hypot(lx - sx, ly - sy) > 6) {
        moved = true; dx = lx - sx; dy = ly - sy;
        try { el.setPointerCapture(id); } catch (_) {}
        el.classList.add('is-dragging');
      }
      if (!moved) return;
      hist.push({ x: lx, y: ly, t: e.timeStamp }); if (hist.length > 6) hist.shift();
      o.move(dx, dy, e);
    }
    function up(e, cancel) {
      if (e.pointerId !== id) return;
      id = null; el.classList.remove('is-dragging');
      if (!moved) { if (!cancel && o.tap) o.tap(e); return; }
      var a = hist[0], b = hist[hist.length - 1], dt = Math.max(16, b.t - a.t);
      var still = e.timeStamp - b.t > 90;
      o.end(still ? 0 : (b.x - a.x) / dt, still ? 0 : (b.y - a.y) / dt, e);
      justDragged = true; setTimeout(function () { justDragged = false; }, 0);
    }
    on(el, 'pointerdown', down, false, offs);
    on(el, 'pointermove', move, false, offs);
    on(el, 'pointerup', function (e) { up(e, false); }, false, offs);
    on(el, 'pointercancel', function (e) { up(e, true); }, false, offs);
    on(el, 'click', function (e) { if (justDragged) { e.preventDefault(); e.stopPropagation(); } }, true, offs);
    on(el, 'dragstart', function (e) { e.preventDefault(); }, false, offs);
  }

  function scramble(node, text, reduce) {
    if (node._t === text) return;
    node._t = text;
    cancelAnimationFrame(node._raf);
    if (reduce) { node.textContent = text; return; }
    var t0 = performance.now(), dur = 280;
    (function f(now) {
      var p = Math.min(1, (now - t0) / dur), n = Math.floor(p * text.length), s = text.slice(0, n);
      for (var i = n; i < text.length; i++) s += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      node.textContent = s;
      if (p < 1) node._raf = requestAnimationFrame(f);
    })(t0);
  }

  function tags(it) {
    var t = h('span', 'fg__tags');
    t.appendChild(h('span', 'fg__tag fg__tag--t', { text: it.t }));
    t.appendChild(h('span', 'fg__tag', { text: it.d }));
    return t;
  }
  function setSrc(img, src) {
    if (img.getAttribute('src') === src) return;
    img.classList.remove('is-in');
    img.src = src;
    if (img.complete && img.naturalWidth) img.classList.add('is-in');
  }
  function pic(it, big, lazy) {
    var i = h('img', 'fg__img', { alt: '', draggable: 'false', decoding: 'async' });
    if (lazy !== false) i.loading = 'lazy';
    i.onload = function () { i.classList.add('is-in'); };
    setSrc(i, big ? it.src : it.th);
    return i;
  }
  // Cover-fit an image of w×h into a box, sliced into n vertical strips (CSS background per strip).
  function cover(it, W, H) {
    var ar = it.w / it.h, bw, bh;
    if (ar > W / H) { bh = H; bw = H * ar; } else { bw = W; bh = W / ar; }
    return { bw: bw, bh: bh, ox: (bw - W) / 2, oy: (bh - H) / 2 };
  }
  function sliceBg(node, it, W, H, k, n, big) {
    var c = cover(it, W, H);
    node.style.backgroundImage = 'url("' + (big ? it.src : it.th) + '")';
    node.style.backgroundSize = c.bw + 'px ' + c.bh + 'px';
    node.style.backgroundPosition = (-(k * W / n) - c.ox) + 'px ' + (-c.oy) + 'px';
  }
  function unionRect(nodes) {
    var r = null;
    nodes.forEach(function (n) {
      var b = n.getBoundingClientRect();
      if (!r) r = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
      else { r.left = Math.min(r.left, b.left); r.top = Math.min(r.top, b.top); r.right = Math.max(r.right, b.right); r.bottom = Math.max(r.bottom, b.bottom); }
    });
    return r ? { left: r.left, top: r.top, width: r.right - r.left, height: r.bottom - r.top } : null;
  }

  // Placeholders for the public repo: gradients with a number, no real images.
  function placeholders(n) {
    var out = [], y = 2026, m = 2;
    for (var i = 0; i < n; i++) {
      var land = i % 3 === 1, w = 900, hh = land ? 675 : 1125, hue = (i * 37) % 360, num = pad3(i + 1);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + hh + '" viewBox="0 0 ' + w + ' ' + hh + '">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(' + hue + ',30%,20%)"/>' +
        '<stop offset="1" stop-color="hsl(' + ((hue + 50) % 360) + ',55%,58%)"/></linearGradient></defs>' +
        '<rect width="100%" height="100%" fill="url(#g)"/>' +
        '<text x="50%" y="' + (hh / 2 + 80) + '" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="240" fill="rgba(255,255,255,0.85)">' + num + '</text></svg>';
      var src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      out.push({ id: 'p' + num, t: 'Piece ' + num, d: String(m).padStart(2, '0') + '/' + y, src: src, th: src, w: w, h: hh, url: '' });
      if (i % 2) { m--; if (m < 1) { m = 12; y--; } }
    }
    return out;
  }

  function metrics(stage) {
    var W = stage.clientWidth, g = parseFloat(getComputedStyle(stage).getPropertyValue('--fg-gutter')) || 16;
    var cols = W <= 720 ? 4 : 12, col = (W - (cols - 1) * g) / cols;
    return { W: W, H: stage.clientHeight, g: g, cols: cols, col: col, small: cols === 4, span: function (n) { return n * col + (n - 1) * g; } };
  }

  // Pinned section: a tall wrapper whose sticky child stays in view while page scroll drives it.
  function makePin(stage, extra) {
    var wrap = h('div', 'fg-pin'), inner = h('div', 'fg-pin__in');
    wrap.appendChild(inner); stage.appendChild(wrap);
    var top = 0;
    return {
      inner: inner,
      size: function () { wrap.style.height = 'calc(var(--fg-pin-h) + ' + Math.round(extra()) + 'px)'; top = parseFloat(getComputedStyle(inner).top) || 0; },
      progress: function () { var r = wrap.getBoundingClientRect(), span = r.height - inner.offsetHeight; return span > 0 ? clamp((top - r.top) / span, 0, 1) : 0; },
      scrollBy: function (px) { global.scrollBy({ top: px, behavior: 'smooth' }); },
      span: function () { return wrap.offsetHeight - inner.offsetHeight; }
    };
  }

  function readout(parent) {
    var r = h('p', 'fg__read', { 'aria-live': 'polite' });
    var n = h('span', 'fg__read-n'), t = h('span', 'fg__read-t'), d = h('span', 'fg__read-d');
    r.appendChild(n); r.appendChild(t); r.appendChild(d); parent.appendChild(r);
    return function (it, i, N, reduce) {
      n.textContent = pad3(i + 1) + ' / ' + pad3(N);
      scramble(t, it.t, reduce); d.textContent = it.d;
    };
  }

  /* ─── Zoom (shared lightbox with FLIP) ───────────────────────────────── */
  function makeZoom(root) {
    var z = null;
    function vars() {
      var cs = getComputedStyle(root), s = '';
      ['--fg-bg', '--fg-bg-2', '--fg-fg', '--fg-mid', '--fg-muted', '--fg-line', '--fg-mono', '--fg-overlay', '--fg-accent'].forEach(function (k) { s += k + ':' + cs.getPropertyValue(k) + ';'; });
      return s;
    }
    function target(it) {
      var vw = innerWidth, vh = innerHeight, p = vw <= 720 ? 16 : 64, bar = 72;
      var aw = vw - p * 2, ah = vh - p - bar, r = it.w / it.h, w = aw, hh = w / r;
      if (hh > ah) { hh = ah; w = hh * r; }
      return { x: (vw - w) / 2, y: p + (ah - hh) / 2, w: w, h: hh };
    }
    // Transform + clip that make the full image look like the (cover-cropped) source rect.
    function from(rect, t) {
      var s = Math.max(rect.width / t.w, rect.height / t.h);
      var tx = rect.left + rect.width / 2 - t.x - t.w * s / 2, ty = rect.top + rect.height / 2 - t.y - t.h * s / 2;
      var ix = Math.max(0, (t.w - rect.width / s) / 2), iy = Math.max(0, (t.h - rect.height / s) / 2);
      return { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')', clipPath: 'inset(' + iy + 'px ' + ix + 'px)' };
    }
    function rectOf(el) {
      if (!el) return null;
      var r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r || r.width < 2 || r.bottom < 0 || r.top > innerHeight) return null;
      return r;
    }
    function place(it) {
      var t = target(it);
      z.img.style.left = t.x + 'px'; z.img.style.top = t.y + 'px'; z.img.style.width = t.w + 'px'; z.img.style.height = t.h + 'px';
      return t;
    }
    function show(i) {
      var it = z.list[i]; z.i = i;
      setSrc(z.pic, it.th);
      if (it.src !== it.th) { var big = new Image(); big.onload = function () { if (z && z.i === i) setSrc(z.pic, it.src); }; big.src = it.src; }
      z.pic.alt = it.t;
      z.t.textContent = it.t; z.d.textContent = it.d; z.n.textContent = pad3(i + 1) + ' / ' + pad3(z.list.length);
      if (it.url) { z.link.href = it.url; z.link.hidden = false; } else z.link.hidden = true;
      return place(it);
    }
    function close() {
      if (!z || z.closing) return;
      var cur = z, reduce = cur.reduce; cur.closing = true;
      var el = cur.getEl ? cur.getEl(cur.i) : null, r = rectOf(el), it = cur.list[cur.i];
      var done = function () {
        cur.offs.forEach(function (f) { f(); });
        cur.wrap.remove(); doc.documentElement.classList.remove('fg-lock');
        var back = (el && el.focus ? el : null) || cur.opener;
        if (back && back.focus) try { back.focus({ preventScroll: true }); } catch (_) {}
      };
      z = null;
      if (reduce) return done();
      cur.wrap.classList.remove('is-open');
      var t = target(it), start = cur.img.style.transform || 'none';
      var a = r ? from(r, t) : { transform: start + ' scale(0.9)', clipPath: 'inset(0px 0px)' };
      var anim = cur.img.animate([{ transform: start, clipPath: 'inset(0px 0px)', opacity: 1 }, { transform: a.transform, clipPath: a.clipPath, opacity: r ? 1 : 0 }], { duration: 420, easing: EASE, fill: 'forwards' });
      anim.onfinish = done;
    }
    function nav(d) { if (!z) return; z.img.style.transform = ''; var i = mod(z.i + d, z.list.length); show(i); if (!z.reduce) z.img.animate([{ opacity: 0, transform: 'translateX(' + (d * 24) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE }); }
    function open(list, i, getEl, reduce) {
      if (z) return;
      var opener = doc.activeElement, offs = [];
      var wrap = h('div', 'fg-zoom', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Enlarged piece', style: vars() });
      var back = h('div', 'fg-zoom__back');
      var img = h('div', 'fg-zoom__img'), p = h('img', '', { alt: '', draggable: 'false' });
      p.onload = function () { p.classList.add('is-in'); };
      img.appendChild(p);
      var bar = h('div', 'fg-zoom__bar'), info = h('p', 'fg-zoom__info');
      var n = h('span', 'fg-zoom__n'), t = h('span', 'fg-zoom__t'), d = h('span', 'fg-zoom__d');
      info.appendChild(n); info.appendChild(t); info.appendChild(d);
      var btns = h('div', 'fg-zoom__btns');
      var prev = h('button', 'fg-zoom__btn', { type: 'button', 'aria-label': 'Previous', text: '←' });
      var next = h('button', 'fg-zoom__btn', { type: 'button', 'aria-label': 'Next', text: '→' });
      var link = h('a', 'fg-zoom__btn fg-zoom__link', { target: '_blank', rel: 'noreferrer', 'data-no-transition': '', text: 'Original ↗' });
      var x = h('button', 'fg-zoom__btn', { type: 'button', 'aria-label': 'Close (Esc)', text: 'Close ✕' });
      [prev, next, link, x].forEach(function (b) { btns.appendChild(b); });
      bar.appendChild(info); bar.appendChild(btns);
      wrap.appendChild(back); wrap.appendChild(img); wrap.appendChild(bar);
      doc.body.appendChild(wrap);
      doc.documentElement.classList.add('fg-lock');
      z = { wrap: wrap, img: img, pic: p, t: t, d: d, n: n, link: link, list: list, getEl: getEl, reduce: reduce, opener: opener, offs: offs };
      var tr = show(i);
      var el = getEl ? getEl(i) : null, r = rectOf(el);
      if (!reduce) {
        var a = r ? from(r, tr) : { transform: 'scale(0.92)', clipPath: 'inset(0px 0px)' };
        img.animate([{ transform: a.transform, clipPath: a.clipPath, opacity: r ? 1 : 0 }, { transform: 'none', clipPath: 'inset(0px 0px)', opacity: 1 }], { duration: 520, easing: EASE });
      }
      requestAnimationFrame(function () { wrap.classList.add('is-open'); });
      x.focus({ preventScroll: true });
      on(back, 'click', close, false, offs);
      on(x, 'click', close, false, offs);
      on(prev, 'click', function () { nav(-1); }, false, offs);
      on(next, 'click', function () { nav(1); }, false, offs);
      on(wrap, 'keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); nav(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); nav(1); }
        else if (e.key === 'Tab') {
          var f = [prev, next, link, x].filter(function (b) { return !b.hidden; }), k = f.indexOf(doc.activeElement);
          e.preventDefault(); f[mod(k + (e.shiftKey ? -1 : 1), f.length)].focus();
        }
      }, false, offs);
      on(global, 'resize', function () { if (z) place(z.list[z.i]); }, false, offs);
      // Drag the image to close: it follows the pointer and the backdrop fades with the distance.
      var dx = 0, dy = 0;
      drag(img, {
        move: function (mx, my) { dx += mx; dy += my; img.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + (1 - Math.min(Math.abs(dy) / 1600, 0.2)) + ')'; back.style.opacity = String(1 - Math.min(Math.abs(dy) / 400, 0.7)); },
        end: function (vx, vy) {
          if (Math.abs(dy) > 120 || Math.abs(vy) > 0.6) { close(); }
          else {
            img.animate([{ transform: img.style.transform }, { transform: 'none' }], { duration: 300, easing: EASE });
            img.style.transform = ''; back.style.opacity = '';
          }
          dx = dy = 0;
        },
        tap: function () {}
      }, offs);
    }
    return { open: open, close: close, isOpen: function () { return !!z; } };
  }

  /* ─── Static grid (reduced motion and the canvas "Rejilla" toggle) ───── */
  function staticGrid(parent, ctx) {
    var g = h('div', 'fg-sg');
    ctx.list.forEach(function (it, i) {
      var b = h('button', 'fg-sg__i fg-tile', { type: 'button', 'aria-label': it.t + ' · ' + it.d });
      var m = h('span', 'fg-tile__m'); m.style.aspectRatio = it.w + ' / ' + it.h;
      m.appendChild(pic(it)); b.appendChild(m); b.appendChild(tags(it));
      b.addEventListener('click', function () { ctx.zoom.open(ctx.list, i, function (j) { return g.children[j] && g.children[j].firstChild; }, ctx.reduce); });
      g.appendChild(b);
    });
    parent.appendChild(g);
    return g;
  }

  /* ─── 01 · Arco ──────────────────────────────────────────────────────── */
  function viewArco(ctx) {
    var list = ctx.list, N = list.length, offs = [], S = 8, RANGE = Math.min(N, 30) - 1, PX = 150;
    var pin = makePin(ctx.stage, function () { return RANGE * PX; });
    var view = h('div', 'fg-arc', { tabindex: '0', 'aria-label': 'Arc: drag, scroll or use ← → · Enter enlarges' });
    var ring = h('div', 'fg-arc__ring'), hud = h('div', 'fg-arc__hud');
    var arc = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arc.setAttribute('viewBox', '0 0 120 34'); arc.setAttribute('class', 'fg-arc__dial'); arc.setAttribute('aria-hidden', 'true');
    arc.innerHTML = '<path d="M6 30 A60 60 0 0 1 114 30" fill="none" stroke="currentColor" stroke-opacity="0.25"/><path class="fg-arc__dial-on" d="M6 30 A60 60 0 0 1 114 30" fill="none" stroke="currentColor" pathLength="1" stroke-dasharray="0.05 1"/>';
    var dialOn = arc.querySelector('.fg-arc__dial-on');
    view.appendChild(ring); pin.inner.appendChild(view); hud.appendChild(arc); pin.inner.appendChild(hud);
    var read = readout(hud);
    var G, pool = [], r = 0, prevR = 0, offset = 0, lastInput = 0, cur = -1;

    function geo() {
      var W = pin.inner.clientWidth, H = pin.inner.clientHeight, small = W <= 720, g = ctx.m.g * (small ? 2 : 4);
      var AR = small ? 0.8 : 1.25, CW = small ? W * 0.72 : W * 0.5, CH = CW / AR;
      if (CH > H * 0.62) { CH = H * 0.62; CW = CH * AR; }
      var R = CW * (small ? 1.5 : 1.9), K = Math.max(8, Math.floor(2 * Math.PI * R / (CW + g))), dTh = 2 * Math.PI / K;
      var cardArc = CW / R, st = cardArc / S, sw = 2 * R * Math.sin(st / 2) + 0.6;
      var HALF = Math.ceil((Math.PI * 0.55) / dTh);
      G = { W: W, H: H, CW: CW, CH: CH, R: R, dTh: dTh, st: st, sw: sw, HALF: HALF, g: g };
      view.style.perspective = Math.round(CW * (small ? 1.8 : 2.2)) + 'px';
      ring.textContent = ''; pool = [];
      for (var p = 0; p < HALF * 2 + 2; p++) {
        var card = h('div', 'fg-arc__card'), strips = [];
        for (var k = 0; k < S; k++) {
          var s = h('span', 'fg-arc__s');
          s.style.width = sw + 'px'; s.style.height = CH + 'px'; s.style.left = (-sw / 2) + 'px'; s.style.top = (-CH / 2) + 'px';
          s.style.transform = 'rotateY(' + ((k - (S - 1) / 2) * st) + 'rad) translateZ(' + R + 'px)';
          card.appendChild(s); strips.push(s);
        }
        ring.appendChild(card); pool.push({ el: card, strips: strips, i: null, mono: null, vis: null });
      }
    }
    function assign(c, i) {
      c.i = i; var it = list[mod(i, N)];
      c.strips.forEach(function (s, k) { sliceBg(s, it, G.CW, G.CH, k, S, true); });
    }
    function target() {
      var raw = pin.progress() * RANGE + offset;
      return performance.now() - lastInput > 160 ? Math.round(raw) : raw;
    }
    var loop = makeLoop(function () {
      var t = target();
      r += (t - r) * 0.1;
      if (Math.abs(t - r) < 0.0005) r = t;
      var v = r - prevR; prevR = r;
      var base = Math.floor(r), moving = Math.abs(v) > 0.004;
      for (var i = base - G.HALF; i <= base + G.HALF + 1; i++) {
        var c = pool[mod(i, pool.length)];
        if (c.i !== i) assign(c, i);
        var a = (i - r) * G.dTh, vis = Math.abs(a) < Math.PI * 0.55;
        if (vis !== c.vis) { c.vis = vis; c.el.style.visibility = vis ? '' : 'hidden'; }
        if (!vis) continue;
        c.el.style.transform = 'translateZ(' + (-G.R) + 'px) rotateY(' + a + 'rad)';
        var mono = moving || Math.abs(i - r) > 0.5;
        if (mono !== c.mono) { c.mono = mono; c.el.classList.toggle('is-mono', mono); }
      }
      var ci = Math.round(r);
      if (ci !== cur) { cur = ci; read(list[mod(ci, N)], mod(ci, N), N, false); }
      dialOn.setAttribute('stroke-dasharray', '0.04 1'); dialOn.setAttribute('stroke-dashoffset', String(-mod(r, N) / N * 0.96));
      return r !== t || performance.now() - lastInput < 400;
    });
    function bump(d) { lastInput = performance.now(); offset += d; loop.wake(); }
    drag(view, {
      move: function (dx) { lastInput = performance.now(); offset -= dx / (G.CW + G.g); loop.wake(); },
      end: function (vx) { offset += clamp(-vx * 1.2, -4, 4); lastInput = performance.now(); loop.wake(); },
      tap: function (e) {
        var card = e.target.closest && e.target.closest('.fg-arc__card');
        var c = card && pool.filter(function (p) { return p.el === card; })[0];
        if (!c) return;
        if (c.i === Math.round(r)) ctx.zoom.open(list, mod(c.i, N), getEl, false);
        else { offset += c.i - Math.round(r); lastInput = 0; loop.wake(); }
      }
    }, offs);
    function getEl(j) {
      var c = pool.filter(function (p) { return p.i !== null && mod(p.i, N) === j && p.vis; })[0];
      if (!c) return null;
      return { getBoundingClientRect: function () { return unionRect(c.strips); }, focus: function (o) { view.focus(o); } };
    }
    on(view, 'keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); offset = Math.round(offset); bump(1); lastInput = 0; }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); offset = Math.round(offset); bump(-1); lastInput = 0; }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.zoom.open(list, mod(Math.round(r), N), getEl, false); }
    }, false, offs);
    on(global, 'scroll', loop.wake, { passive: true }, offs);
    pin.size(); geo(); r = prevR = target(); loop.wake();
    return function () { loop.stop(); offs.forEach(function (f) { f(); }); };
  }

  /* ─── 02 · Canvas infinito ───────────────────────────────────────────── */
  function viewCanvas(ctx) {
    var list = ctx.list, N = list.length, offs = [], m = ctx.m, grid = false;
    var box = h('div', 'fg-cv', { tabindex: '0', 'aria-label': 'Infinite canvas: drag, wheel or arrow keys · Enter enlarges the centre piece' });
    var plane = h('div', 'fg-cv__plane'), hud = h('div', 'fg-cv__hud');
    var mini = h('canvas', 'fg-cv__mini', { 'aria-hidden': 'true' }), coords = h('span', 'fg-cv__xy');
    var cross = h('span', 'fg-cv__cross', { 'aria-hidden': 'true' });
    box.appendChild(plane); box.appendChild(cross); hud.appendChild(coords); hud.appendChild(mini); box.appendChild(hud);
    ctx.stage.appendChild(box);
    var gridBox = h('div', 'fg-cv__grid'); gridBox.hidden = true; ctx.stage.appendChild(gridBox);
    var toggle = h('button', 'fg__chip', { type: 'button', 'aria-pressed': 'false', text: 'Grid' });
    ctx.vtools.appendChild(toggle);

    // World: C columns of tw px; each column a loop of its pieces, all with the same period H,
    // so the plane is a true 2D tile (blockW × H) that wraps both ways.
    var tw = m.span(2), g = m.g, pitch = tw + g;
    var C = Math.max(6, Math.ceil(1.6 * m.W / pitch)), cols = [], hs = [], rand = rng(7);
    for (var c = 0; c < C; c++) { cols.push([]); hs.push(0); }
    list.forEach(function (it, i) {
      var k = hs.indexOf(Math.min.apply(null, hs)), hh = Math.round(tw * it.h / it.w);
      cols[k].push({ it: it, i: i, h: hh }); hs[k] += hh + g;
    });
    var BH = Math.max.apply(null, hs), BW = C * pitch;
    cols.forEach(function (col, k) {
      var extra = (BH - hs[k]) / Math.max(1, col.length), y = Math.round(rand() * BH);
      col.forEach(function (p) { p.y = mod(y, BH); y += p.h + g + extra; });
    });
    var tx = Math.round(BW * 0.37), ty = Math.round(BH * 0.41), cx = tx, cy = ty, live = new Map(), poolEls = [];
    var MAXV = 1.8; // px/ms cap for the release inertia

    var ms = 140 / BW, mw = 140, mh = Math.min(110, Math.max(48, BH * ms));
    var msy = mh / BH;
    mini.width = mw * 2; mini.height = mh * 2; mini.style.width = mw + 'px'; mini.style.height = mh + 'px';
    var mctx = mini.getContext('2d'), map = doc.createElement('canvas');
    map.width = mini.width; map.height = mini.height;
    function drawMap() {
      var x = map.getContext('2d'), cs = getComputedStyle(ctx.root);
      x.clearRect(0, 0, map.width, map.height);
      x.fillStyle = cs.getPropertyValue('--fg-muted') || 'rgba(255,255,255,0.35)';
      cols.forEach(function (col, k) {
        col.forEach(function (p) {
          [p.y, p.y - BH].forEach(function (yy) { x.fillRect(k * pitch * ms * 2, yy * msy * 2, Math.max(1, tw * ms * 2), Math.max(1, p.h * msy * 2)); });
        });
      });
      mctx.strokeStyle = cs.getPropertyValue('--fg-accent') || '#ff5c1e';
    }
    function drawMini() {
      mctx.clearRect(0, 0, mini.width, mini.height);
      mctx.drawImage(map, 0, 0);
      var vx = mod(cx, BW) * ms * 2, vy = mod(cy, BH) * msy * 2, vw = m.W * ms * 2, vh = box.clientHeight * msy * 2;
      mctx.lineWidth = 2;
      [[0, 0], [-mini.width, 0], [0, -mini.height], [-mini.width, -mini.height]].forEach(function (o) { mctx.strokeRect(vx + o[0], vy + o[1], vw, vh); });
    }
    function tile(p, key) {
      var el = poolEls.pop();
      if (!el) {
        el = h('button', 'fg-cv__t fg-tile', { type: 'button' });
        var mm = h('span', 'fg-tile__m'); mm.appendChild(pic(p.it)); el.appendChild(mm); el.appendChild(tags(p.it));
        plane.appendChild(el);
      } else {
        el.hidden = false;
        setSrc(el.querySelector('img'), p.it.th);
        el.replaceChild(tags(p.it), el.lastChild);
      }
      el.setAttribute('aria-label', p.it.t + ' · ' + p.it.d);
      el.style.width = tw + 'px'; el.style.height = p.h + 'px';
      el._i = p.i; el._key = key;
      return el;
    }
    function render() {
      var W = m.W, H = box.clientHeight, need = new Set();
      var j0 = Math.floor(cx / pitch) - 1, j1 = Math.floor((cx + W) / pitch) + 1;
      for (var j = j0; j <= j1; j++) {
        var col = cols[mod(j, C)], x = Math.round(j * pitch - cx);
        var k0 = Math.floor((cy - BH) / BH), k1 = Math.floor((cy + H) / BH) + 1;
        for (var k = k0; k <= k1; k++) {
          for (var q = 0; q < col.length; q++) {
            var p = col[q], y = Math.round(p.y + k * BH - cy);
            if (y + p.h < -40 || y > H + 40) continue;
            var key = j + ':' + k + ':' + q; need.add(key);
            var el = live.get(key);
            if (!el) { el = tile(p, key); live.set(key, el); }
            el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
          }
        }
      }
      live.forEach(function (el, key) { if (!need.has(key)) { el.hidden = true; poolEls.push(el); live.delete(key); } });
      coords.textContent = 'X ' + (cx >= 0 ? '+' : '−') + pad3(Math.abs(Math.round(cx / 10))) + ' · Y ' + (cy >= 0 ? '+' : '−') + pad3(Math.abs(Math.round(cy / 10)));
      drawMini();
    }
    var loop = makeLoop(function () {
      cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14;
      var done = Math.abs(tx - cx) < 0.3 && Math.abs(ty - cy) < 0.3;
      if (done) { cx = tx; cy = ty; }
      render();
      return !done;
    });
    drag(box, {
      filter: function (e) { return e.target !== mini; },
      move: function (dx, dy) { tx -= dx; ty -= dy; cx -= dx; cy -= dy; loop.wake(); },
      end: function (vx, vy) {
        tx -= clamp(vx, -MAXV, MAXV) * 260; ty -= clamp(vy, -MAXV, MAXV) * 260; loop.wake();
      },
      tap: function (e) { var t = e.target.closest && e.target.closest('.fg-cv__t'); if (t) openAt(t); }
    }, offs);
    function openAt(el) {
      ctx.zoom.open(list, el._i, function (j) {
        var best = null; live.forEach(function (x) { if (!best && x._i === j && !x.hidden) best = x.firstChild; });
        return best;
      }, false);
    }
    on(box, 'wheel', function (e) {
      if (grid) return;
      e.preventDefault();
      var f = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? m.W : 1;
      tx += e.deltaX * f; ty += e.deltaY * f; loop.wake();
    }, { passive: false }, offs);
    on(box, 'keydown', function (e) {
      var s = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (s) { e.preventDefault(); tx += s[0] * pitch; ty += s[1] * pitch * 1.2; loop.wake(); }
      else if (e.key === 'Enter') {
        // The tile under the crosshair.
        var b = box.getBoundingClientRect(), hit = doc.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        var t = hit && hit.closest && hit.closest('.fg-cv__t'); if (t) { e.preventDefault(); openAt(t); }
      }
    }, false, offs);
    // Minimap: click or drag to move the view inside the current block.
    var miniDown = false;
    function miniMove(e) {
      var b = mini.getBoundingClientRect();
      var wx = (e.clientX - b.left) / ms, wy = (e.clientY - b.top) / msy;
      tx = Math.floor(cx / BW) * BW + wx - m.W / 2; ty = Math.floor(cy / BH) * BH + wy - box.clientHeight / 2; loop.wake();
    }
    on(mini, 'pointerdown', function (e) { e.stopPropagation(); miniDown = true; try { mini.setPointerCapture(e.pointerId); } catch (_) {} miniMove(e); }, false, offs);
    on(mini, 'pointermove', function (e) { if (miniDown) miniMove(e); }, false, offs);
    on(mini, 'pointerup', function () { miniDown = false; }, false, offs);
    on(toggle, 'click', function () {
      grid = !grid; toggle.setAttribute('aria-pressed', String(grid));
      box.hidden = grid; gridBox.hidden = !grid;
      if (grid && !gridBox.firstChild) staticGrid(gridBox, ctx);
      if (!grid) loop.wake();
    }, false, offs);
    drawMap(); render();
    return function () { loop.stop(); offs.forEach(function (f) { f(); }); };
  }

  /* ─── 03 · Láminas (Eva-style slats) ─────────────────────────────────── */
  function viewLaminas(ctx) {
    var list = ctx.list, offs = [], m = ctx.m, S = 8, rand = rng(3);
    var wrap = h('div', 'fg-lm'), lines = h('div', 'fg-lm__lines', { 'aria-hidden': 'true' }), body = h('div', 'fg-lm__grid');
    for (var c = 0; c < m.cols; c++) lines.appendChild(h('span'));
    wrap.appendChild(lines); wrap.appendChild(body); ctx.stage.appendChild(wrap);
    var span = m.small ? 2 : 3, starts = m.small ? [0, 2] : [0, 3, 6, 9], row = 0, i = 0, last = '';
    var tiles = [];
    while (i < list.length) {
      var n = m.small ? (rand() < 0.4 ? 1 : 2) : 1 + Math.floor(rand() * 3), pick = starts.slice();
      while (pick.length > n) pick.splice(Math.floor(rand() * pick.length), 1);
      if (pick.join() === last && n < starts.length) { pick = starts.filter(function (s) { return pick.indexOf(s) < 0; }).slice(0, n); }
      last = pick.join();
      for (var k = 0; k < pick.length && i < list.length; k++, i++) {
        var it = list[i], b = h('button', 'fg-lm__t fg-tile', { type: 'button', 'aria-label': it.t + ' · ' + it.d });
        b.style.gridColumn = (pick[k] + 1) + ' / span ' + span; b.style.gridRow = String(row + 1);
        b.appendChild(h('span', 'fg-lm__n', { text: '[' + pad3(i + 1) + ']' }));
        var med = h('span', 'fg-lm__m'); med.style.aspectRatio = it.w + ' / ' + it.h; b.appendChild(med);
        var cap = h('span', 'fg-lm__cap'); cap.appendChild(h('span', '', { text: it.t })); cap.appendChild(h('span', '', { text: it.d })); b.appendChild(cap);
        body.appendChild(b);
        tiles.push({ el: b, med: med, it: it, i: i, built: false, imgs: [], m: 0, mt: 0, last: '' });
      }
      row++;
    }
    var visible = new Set();
    function build(t) {
      t.built = true;
      for (var k = 0; k < S; k++) {
        var s = h('span', 'fg-lm__s'), im = h('img', 'fg-lm__img', { alt: '', draggable: 'false', decoding: 'async' });
        s.style.left = (k * 100 / S) + '%'; s.style.width = (100 / S + 0.2) + '%';
        im.style.width = (S * 100) + '%'; im.style.left = (-k * 100) + '%';
        im.src = t.it.th; s.appendChild(im); t.med.appendChild(s); t.imgs.push(im);
      }
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var t = e.target._t;
        if (e.isIntersecting) { if (!t.built) build(t); visible.add(t); } else visible.delete(t);
      });
      loop.wake();
    }, { rootMargin: '200px 0px' });
    tiles.forEach(function (t) { t.el._t = t; io.observe(t.el); });
    var loop = makeLoop(function () {
      var vh = innerHeight, busy = false, reads = [];
      visible.forEach(function (t) { reads.push([t, t.med.getBoundingClientRect()]); });
      reads.forEach(function (x) {
        var t = x[0], r = x[1], sw = r.width / S;
        var p = clamp((vh - r.top) / (vh * 0.55), 0, 1);
        t.m += (t.mt - t.m) * 0.08; if (Math.abs(t.mt - t.m) < 0.001) t.m = t.mt; else busy = true;
        var key = p.toFixed(3) + t.m.toFixed(3) + sw.toFixed(1);
        if (key === t.last) return;
        t.last = key;
        for (var k = 0; k < S; k++) {
          var e = easeOut(clamp(p * 1.7 - k * 0.09, 0, 1));
          var off = -(1 - e) * sw * (1 + k * 0.7) + t.m * (k - (S - 1) / 2) * sw * 0.32;
          t.imgs[k].style.transform = 'translate3d(' + off.toFixed(2) + 'px,0,0)';
        }
      });
      return busy;
    });
    on(global, 'scroll', loop.wake, { passive: true }, offs);
    tiles.forEach(function (t) {
      on(t.med, 'pointermove', function (e) { if (e.pointerType !== 'mouse') return; var r = t.med.getBoundingClientRect(); t.mt = (e.clientX - r.left) / r.width - 0.5; loop.wake(); }, false, offs);
      on(t.med, 'pointerleave', function () { t.mt = 0; loop.wake(); }, false, offs);
      on(t.el, 'click', function () { ctx.zoom.open(list, t.i, function (j) { return tiles[j] && tiles[j].med; }, false); }, false, offs);
    });
    loop.wake();
    return function () { io.disconnect(); loop.stop(); offs.forEach(function (f) { f(); }); };
  }

  /* ─── 04 · Tira horizontal ───────────────────────────────────────────── */
  function viewTira(ctx) {
    var list = ctx.list, N = list.length, offs = [], m = ctx.m;
    var travel = 0, H, xs = [], ws = [], items = [], cur = 0, prev = 0, skew = 0, sc = 1, ci = -1;
    var pin = makePin(ctx.stage, function () { return Math.min(travel, innerHeight * 6); });
    var box = h('div', 'fg-tr', { tabindex: '0', 'aria-label': 'Strip: scroll or use ← →' });
    var track = h('div', 'fg-tr__track'), hud = h('div', 'fg-tr__hud'), bar = h('span', 'fg-tr__bar'), fill = h('span', 'fg-tr__fill');
    bar.appendChild(fill); hud.appendChild(bar);
    box.appendChild(track); pin.inner.appendChild(box); pin.inner.appendChild(hud);
    var read = readout(hud);
    function layout() {
      var W = pin.inner.clientWidth; H = Math.round(pin.inner.clientHeight * (m.small ? 0.5 : 0.58));
      var x = m.small ? m.g : m.span(1) + m.g; track.textContent = ''; items = []; xs = []; ws = [];
      list.forEach(function (it, i) {
        var w = Math.round(H * it.w / it.h), el = h('button', 'fg-tr__i fg-tile', { type: 'button', 'aria-label': it.t + ' · ' + it.d });
        el.style.width = w + 'px';
        var med = h('span', 'fg-tile__m'); med.style.height = H + 'px';
        var im = h('img', 'fg__img', { alt: '', draggable: 'false', decoding: 'async' }); im.onload = function () { im.classList.add('is-in'); };
        med.appendChild(im); el.appendChild(med);
        var cap = h('span', 'fg-tr__cap'); cap.appendChild(h('span', '', { text: pad3(i + 1) })); cap.appendChild(h('span', '', { text: it.t })); cap.appendChild(h('span', '', { text: it.d }));
        el.appendChild(cap); el.style.visibility = 'hidden';
        on(el, 'click', function () { ctx.zoom.open(list, i, function (j) { return items[j] && items[j].med; }, false); }, false, offs);
        track.appendChild(el); items.push({ el: el, med: med, im: im, vis: false, loaded: false });
        xs.push(x); ws.push(w); x += w + m.g * (m.small ? 1 : 2);
      });
      travel = Math.max(0, x - W + m.span(1));
      pin.size();
    }
    var loop = makeLoop(function () {
      var W = pin.inner.clientWidth, t = pin.progress() * travel;
      cur += (t - cur) * 0.1; if (Math.abs(t - cur) < 0.2) cur = t;
      var v = cur - prev; prev = cur;
      skew += (clamp(-v * 0.12, -12, 12) - skew) * 0.2; sc += ((1 - Math.min(Math.abs(v) / 1200, 0.08)) - sc) * 0.2;
      if (Math.abs(skew) < 0.01) skew = 0;
      for (var i = 0; i < N; i++) {
        var x = xs[i] - cur, it = items[i], vis = x + ws[i] > -60 && x < W + 60;
        if (!it.loaded && x < W * 2.5 && x + ws[i] > -W) { it.loaded = true; it.im.src = list[i].src; }
        if (vis !== it.vis) { it.vis = vis; it.el.style.visibility = vis ? '' : 'hidden'; }
        if (vis) it.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) skewX(' + skew.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
      }
      fill.style.transform = 'scaleX(' + (travel ? cur / travel : 0) + ')';
      var c = 0; while (c < N - 1 && xs[c + 1] - cur < W / 2) c++;
      if (c !== ci) { ci = c; read(list[c], c, N, false); }
      return cur !== t || skew !== 0;
    });
    on(global, 'scroll', loop.wake, { passive: true }, offs);
    on(box, 'keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var step = (ws[ci] || 300) + m.g * 2;
      pin.scrollBy(d * step * pin.span() / Math.max(1, travel));
    }, false, offs);
    layout(); cur = prev = pin.progress() * travel; loop.wake();
    return function () { loop.stop(); offs.forEach(function (f) { f(); }); };
  }

  /* ─── 05 · Mazo ──────────────────────────────────────────────────────── */
  function viewMazo(ctx) {
    var list = ctx.list, N = list.length, offs = [], m = ctx.m, i = 0, cards = new Map(), wheelAcc = 0, wheelLock = 0;
    var box = h('div', 'fg-mz', { tabindex: '0', 'aria-label': 'Deck: drag the card or use ← → · Enter enlarges' });
    var deck = h('div', 'fg-mz__deck'), hud = h('div', 'fg-mz__hud');
    box.appendChild(deck); box.appendChild(hud); ctx.stage.appendChild(box);
    var read = readout(hud);
    var H = box.clientHeight, CH = Math.min(H * 0.7, 640), CW = CH * 0.8;
    if (CW > m.W * 0.8) { CW = m.W * 0.8; CH = CW / 0.8; }
    deck.style.width = CW + 'px'; deck.style.height = CH + 'px';
    var ROT = [0, -2.5, 2, -1.5];
    function card(idx) {
      var c = cards.get(idx);
      if (c) return c;
      var it = list[mod(idx, N)];
      c = h('div', 'fg-mz__c fg-tile');
      var med = h('span', 'fg-tile__m'); med.appendChild(pic(it, true, false)); c.appendChild(med); c.appendChild(tags(it));
      c.appendChild(h('span', 'fg-mz__n', { text: pad3(mod(idx, N) + 1) }));
      c._idx = idx; cards.set(idx, c);
      return c;
    }
    function pos(d, dir) {
      if (d < 0) return { t: 'translate(' + (dir * m.W * 0.7) + 'px,-24px) rotate(' + (dir * 18) + 'deg)', o: 0 };
      var dd = Math.min(d, 3);
      return { t: 'translate(0,' + (-dd * 18) + 'px) scale(' + (1 - dd * 0.06) + ') rotate(' + ROT[dd] + 'deg)', o: d > 3 ? 0 : 1 };
    }
    function layout() {
      for (var idx = i - 1; idx <= i + 4; idx++) {
        var fresh = !cards.has(idx), c = card(idx), d = idx - i;
        if (fresh) {
          var p0 = d < 0 ? pos(-1, -1) : pos(4);
          c.classList.add('is-drag'); c.style.transform = p0.t; c.style.opacity = String(p0.o);
          deck.appendChild(c); c.getBoundingClientRect(); c.classList.remove('is-drag');
        }
        var p = pos(d, Number(c.dataset.dir || 1));
        c.style.transform = p.t; c.style.opacity = String(p.o); c.style.zIndex = String(10 - d);
        c.classList.toggle('is-top', d === 0); c.classList.toggle('is-mono', d !== 0);
        c.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
      }
      cards.forEach(function (c, idx) { if (idx < i - 2 || idx > i + 4) { c.remove(); cards.delete(idx); } });
      read(list[mod(i, N)], mod(i, N), N, false);
    }
    function next(dir) { var t = cards.get(i); if (t) t.dataset.dir = String(dir || 1); i++; layout(); }
    function prev() { var c = cards.get(i - 1); if (c) c.dataset.dir = c.dataset.dir || '-1'; i--; layout(); }
    var dx = 0, dy = 0;
    drag(box, {
      filter: function (e) { return !!(e.target.closest && e.target.closest('.fg-mz__c.is-top')); },
      start: function () { dx = dy = 0; },
      move: function (mx, my) {
        var t = cards.get(i); if (!t) return;
        dx += mx; dy += my; t.classList.add('is-drag');
        t.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.05) + 'deg)';
      },
      end: function (vx) {
        var t = cards.get(i); if (!t) return;
        t.classList.remove('is-drag');
        if (Math.abs(dx) > CW * 0.3 || Math.abs(vx) > 0.5) next(Math.sign(dx || vx)); else layout();
      },
      tap: function (e) {
        var c = e.target.closest && e.target.closest('.fg-mz__c');
        if (c && c._idx === i) ctx.zoom.open(list, mod(i, N), function () { var t = cards.get(i); return t && t.firstChild; }, false);
      }
    }, offs);
    on(box, 'keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'Enter') { e.preventDefault(); ctx.zoom.open(list, mod(i, N), function () { var t = cards.get(i); return t && t.firstChild; }, false); }
    }, false, offs);
    on(box, 'wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      var now = performance.now(); if (now < wheelLock) return;
      wheelAcc += e.deltaX;
      if (Math.abs(wheelAcc) > 60) { if (wheelAcc > 0) next(1); else prev(); wheelAcc = 0; wheelLock = now + 350; }
    }, { passive: false }, offs);
    layout();
    return function () { offs.forEach(function (f) { f(); }); };
  }

  /* ─── 06 · Rejilla con zoom ──────────────────────────────────────────── */
  function viewRejilla(ctx) {
    var list = ctx.list, N = list.length, offs = [], focus = 0;
    var wrap = h('div', 'fg-rj'), head = h('div', 'fg-rj__head'), grid = h('div', 'fg-rj__grid', { role: 'grid', 'aria-label': 'Grid: arrow keys to move · Enter enlarges' });
    wrap.appendChild(head); wrap.appendChild(grid); ctx.stage.appendChild(wrap);
    var read = readout(head);
    list.forEach(function (it, i) {
      var b = h('button', 'fg-rj__i fg-tile', { type: 'button', tabindex: i === 0 ? '0' : '-1', 'aria-label': it.t + ' · ' + it.d });
      var med = h('span', 'fg-tile__m'); med.appendChild(pic(it)); b.appendChild(med);
      b._i = i; grid.appendChild(b);
    });
    function show(i) { read(list[i], i, N, false); }
    on(grid, 'pointerover', function (e) { var b = e.target.closest && e.target.closest('.fg-rj__i'); if (b) show(b._i); }, false, offs);
    on(grid, 'focusin', function (e) { var b = e.target.closest && e.target.closest('.fg-rj__i'); if (b) show(b._i); }, false, offs);
    on(grid, 'click', function (e) {
      var b = e.target.closest && e.target.closest('.fg-rj__i'); if (!b) return;
      move(b._i, false);
      ctx.zoom.open(list, b._i, function (j) { return grid.children[j] && grid.children[j].firstChild; }, false);
    }, false, offs);
    function move(i, f) {
      grid.children[focus].tabIndex = -1; focus = clamp(i, 0, N - 1);
      var b = grid.children[focus]; b.tabIndex = 0; if (f) b.focus();
    }
    on(grid, 'keydown', function (e) {
      var cols = Math.round(grid.clientWidth / grid.children[0].offsetWidth) || 1;
      var d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
      if (d) { e.preventDefault(); move(focus + d, true); }
      else if (e.key === 'Home') { e.preventDefault(); move(0, true); }
      else if (e.key === 'End') { e.preventDefault(); move(N - 1, true); }
    }, false, offs);
    show(0);
    return function () { offs.forEach(function (f) { f(); }); };
  }

  /* ─── 07 · Barras (fisheye over the whole archive, by date) ─────────── */
  function viewBarras(ctx) {
    var list = ctx.list, N = list.length, offs = [], m = ctx.m;
    var box = h('div', 'fg-br', { tabindex: '0', 'aria-label': 'Bars: move the cursor or use ← → · Enter enlarges' });
    var row = h('div', 'fg-br__row'), years = h('div', 'fg-br__years', { 'aria-hidden': 'true' }), hud = h('div', 'fg-br__hud');
    box.appendChild(hud); box.appendChild(row); box.appendChild(years); ctx.stage.appendChild(box);
    var read = readout(hud);
    var W = m.W, Wf = clamp(W * (m.small ? 0.5 : 0.3), 150, 560);
    var sigma = Math.min(m.small ? 1 : 1.3, 0.85 * W / (Wf * 2.5066));
    var A = Math.max(0, (Wf * N - W) / (W - Wf * sigma * 2.5066));
    var slices = [], yl = [], f = 0, ft = 0, cur = -1, xs = new Float32Array(N), ws = new Float32Array(N);
    list.forEach(function (it, i) {
      var s = h('div', 'fg-br__s fg-tile');
      var im = pic(it); im.style.width = Wf + 'px'; s.appendChild(im);
      row.appendChild(s); slices.push({ el: s, mono: null });
      var y = it.d.slice(3);
      if (i === 0 || list[i - 1].d.slice(3) !== y) { var l = h('span', 'fg-br__y', { text: y }); years.appendChild(l); yl.push({ el: l, i: i }); }
    });
    function lay() {
      var sum = 0, i;
      for (i = 0; i < N; i++) { var d = (i - f) / sigma; ws[i] = 1 + A * Math.exp(-0.5 * d * d); sum += ws[i]; }
      var x = 0;
      for (i = 0; i < N; i++) { ws[i] = ws[i] / sum * W; xs[i] = x; x += ws[i]; }
    }
    var loop = makeLoop(function () {
      f += (ft - f) * 0.16; if (Math.abs(ft - f) < 0.002) f = ft;
      lay();
      var ci = Math.round(f);
      for (var i = 0; i < N; i++) {
        var s = slices[i];
        s.el.style.transform = 'translate3d(' + xs[i].toFixed(2) + 'px,0,0)';
        s.el.style.width = Math.max(0, ws[i] - 1).toFixed(2) + 'px';
        var mono = i !== ci;
        if (mono !== s.mono) { s.mono = mono; s.el.classList.toggle('is-mono', mono); }
      }
      var lastX = -1e9;
      yl.forEach(function (y) {
        var x = xs[y.i], show = x - lastX > 44;
        y.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
        y.el.style.visibility = show ? '' : 'hidden';
        if (show) lastX = x;
      });
      if (ci !== cur) { cur = ci; read(list[ci], ci, N, false); }
      return f !== ft;
    });
    function at(clientX) {
      var x = clientX - row.getBoundingClientRect().left, i = 0;
      while (i < N - 1 && xs[i + 1] <= x) i++;
      return i;
    }
    on(row, 'pointermove', function (e) { ft = at(e.clientX); loop.wake(); }, false, offs);
    on(row, 'pointerdown', function (e) { ft = at(e.clientX); loop.wake(); }, false, offs);
    on(row, 'click', function () { ctx.zoom.open(list, Math.round(ft), function (j) { return slices[j] && slices[j].el; }, false); }, false, offs);
    on(box, 'keydown', function (e) {
      var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (d) { e.preventDefault(); ft = clamp(Math.round(ft) + d, 0, N - 1); loop.wake(); }
      else if (e.key === 'Home') { e.preventDefault(); ft = 0; loop.wake(); }
      else if (e.key === 'End') { e.preventDefault(); ft = N - 1; loop.wake(); }
      else if (e.key === 'Enter') { e.preventDefault(); ctx.zoom.open(list, Math.round(ft), function (j) { return slices[j] && slices[j].el; }, false); }
    }, false, offs);
    loop.wake();
    return function () { loop.stop(); offs.forEach(function (f2) { f2(); }); };
  }

  /* ─── 08 · Pasarela (Jesper Landberg-style runway) ───────────────────── */
  function viewPasarela(ctx) {
    var list = ctx.list, N = list.length, offs = [], m = ctx.m, S2 = 4, RANGE = Math.min(N, 30) - 1, PX = 130;
    var pin = makePin(ctx.stage, function () { return RANGE * PX; });
    var world = h('div', 'fg-pw', { tabindex: '0', 'aria-label': 'Runway: scroll, drag or use ← → · Enter enlarges' });
    var floor = h('div', 'fg-pw__floor', { 'aria-hidden': 'true' }), cardsBox = h('div', 'fg-pw__cards'), hud = h('div', 'fg-pw__hud');
    world.appendChild(floor); world.appendChild(cardsBox); pin.inner.appendChild(world); pin.inner.appendChild(hud);
    var read = readout(hud);
    var G, pool = [], cur = 0, prev = 0, offset = 0, bend = 0, lastInput = 0, ci = -1;
    function geo() {
      var W = pin.inner.clientWidth, H = pin.inner.clientHeight, small = m.small;
      var AR = small ? 0.8 : 1.25, CW = small ? Math.min(W * 0.62, H * 0.42 * AR) : Math.min(W * 0.3, H * 0.5 * AR), CH = CW / AR, gap = small ? m.g * 2 : m.span(1);
      var fy = H * 0.7, sw = CW / (S2 * 2), pitch = CW + gap;
      G = { W: W, H: H, CW: CW, CH: CH, fy: fy, sw: sw, pitch: pitch, n: Math.ceil(W / pitch) + 4 };
      world.style.perspective = Math.round(W * (small ? 1.1 : 0.9)) + 'px';
      world.style.perspectiveOrigin = '50% ' + Math.round(fy - CH * 1.25) + 'px';
      floor.style.top = fy + 'px';
      var colPitch = m.col + m.g;
      floor.style.backgroundSize = colPitch + 'px ' + colPitch + 'px';
      G.colPitch = colPitch;
      cardsBox.textContent = ''; pool = [];
      for (var p = 0; p < G.n; p++) {
        var card = h('div', 'fg-pw__c'), faces = [];
        card.style.top = (fy - CH / 2) + 'px'; card.style.setProperty('--sw', sw + 'px');
        [1, -1].forEach(function (side) {
          var parent = card;
          for (var j = 0; j < S2; j++) {
            var node = h('div', 'fg-pw__n ' + (side > 0 ? 'fg-pw__r' : 'fg-pw__l') + (j === 0 ? '0' : ''));
            var face = h('span', 'fg-pw__f');
            face.style.width = (sw + 0.6) + 'px'; face.style.height = CH + 'px'; face.style.top = (-CH / 2) + 'px';
            face.style.left = side > 0 ? '0px' : (-sw - 0.6) + 'px';
            face._k = side > 0 ? S2 + j : S2 - 1 - j;
            node.appendChild(face); parent.appendChild(node); parent = node; faces.push(face);
          }
        });
        var lb = h('span', 'fg-pw__lb'); lb.style.top = (CH / 2 + 10) + 'px'; card.appendChild(lb);
        cardsBox.appendChild(card); pool.push({ el: card, faces: faces, lb: lb, i: null, mono: null });
      }
    }
    function assign(c, i) {
      c.i = i; var it = list[mod(i, N)];
      c.faces.forEach(function (f) { sliceBg(f, it, G.CW, G.CH, f._k, S2 * 2, true); });
      c.lb.textContent = pad3(mod(i, N) + 1) + '  ' + it.t + '  ' + it.d;
    }
    function target() {
      var raw = pin.progress() * RANGE + offset;
      return (performance.now() - lastInput > 160 ? Math.round(raw) : raw) * G.pitch;
    }
    var loop = makeLoop(function () {
      var t = target();
      cur += (t - cur) * 0.09; if (Math.abs(t - cur) < 0.2) cur = t;
      var v = cur - prev; prev = cur;
      bend += (clamp(v * 0.45, -16, 16) - bend) * 0.15; if (Math.abs(bend) < 0.01) bend = 0;
      floor.style.transform = 'translate3d(' + (-(cur % G.colPitch)).toFixed(1) + 'px,0,0) rotateX(-90deg)';
      var first = Math.floor(cur / G.pitch) - Math.ceil(G.n / 2) + 1;
      for (var i = first; i < first + G.n; i++) {
        var c = pool[mod(i, G.n)];
        if (c.i !== i) assign(c, i);
        var x = i * G.pitch - cur, ry = clamp(-x / G.W * 24, -30, 30);
        c.el.style.transform = 'translate3d(' + (G.W / 2 + x).toFixed(1) + 'px,0,0) rotateY(' + ry.toFixed(2) + 'deg)';
        c.el.style.setProperty('--b', bend.toFixed(2) + 'deg');
        var mono = Math.abs(v) > 1.5 || Math.abs(x) > G.pitch / 2;
        if (mono !== c.mono) { c.mono = mono; c.el.classList.toggle('is-mono', mono); }
      }
      var k = Math.round(cur / G.pitch);
      if (k !== ci) { ci = k; read(list[mod(k, N)], mod(k, N), N, false); }
      return cur !== t || bend !== 0 || performance.now() - lastInput < 400;
    });
    function getEl(j) {
      var c = pool.filter(function (p) { return p.i === ci && mod(p.i, N) === j; })[0];
      return c ? { getBoundingClientRect: function () { return unionRect(c.faces); }, focus: function (o) { world.focus(o); } } : null;
    }
    drag(world, {
      move: function (dx) { lastInput = performance.now(); offset -= dx / G.pitch; loop.wake(); },
      end: function (vx) { offset += clamp(-vx * 1.4, -5, 5); lastInput = performance.now(); loop.wake(); },
      tap: function (e) {
        var card = e.target.closest && e.target.closest('.fg-pw__c');
        var c = card && pool.filter(function (p) { return p.el === card; })[0];
        if (!c) return;
        if (c.i === ci) ctx.zoom.open(list, mod(c.i, N), getEl, false);
        else { offset += c.i - ci; lastInput = 0; loop.wake(); }
      }
    }, offs);
    on(world, 'keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); offset = Math.round(offset) + d; lastInput = 0; loop.wake(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.zoom.open(list, mod(ci, N), getEl, false); }
    }, false, offs);
    on(global, 'scroll', loop.wake, { passive: true }, offs);
    pin.size(); geo(); cur = prev = target(); loop.wake();
    return function () { loop.stop(); offs.forEach(function (f) { f(); }); };
  }

  var FN = { arco: viewArco, canvas: viewCanvas, laminas: viewLaminas, tira: viewTira, mazo: viewMazo, rejilla: viewRejilla, barras: viewBarras, pasarela: viewPasarela };
  function info(id) { return VIEWS.filter(function (v) { return v.id === id; })[0]; }

  /* ─── Wiring ─────────────────────────────────────────────────────────── */
  function wire(root) {
    var stage = root.querySelector('[data-fg-stage]'), picker = root.querySelector('[data-fg-picker]');
    var note = root.querySelector('[data-fg-note]'), counts = root.querySelector('[data-fg-counts]'), vtools = root.querySelector('[data-fg-vtools]');
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var offs = [], items = null, destroy = null, lastW = 0, alive = true, uid = Math.random().toString(36).slice(2, 7);
    var view = root.getAttribute('data-fg-view') || 'arco', count = Number(root.getAttribute('data-fg-count')) || 120;
    try { var sv = localStorage.getItem('fg:view'); if (sv && info(sv)) view = sv; var sc = Number(localStorage.getItem('fg:count')); if (COUNTS.indexOf(sc) >= 0) count = sc; } catch (_) {}
    var zoom = makeZoom(root);

    var opts = h('div', 'fg__opts');
    VIEWS.forEach(function (v) {
      var l = h('label', 'fg__opt'), inp = h('input', '', { type: 'radio', name: 'fg-view-' + uid, value: v.id });
      if (v.id === view) inp.checked = true;
      l.appendChild(inp); l.appendChild(h('span', 'fg__n', { text: v.n })); l.appendChild(h('span', 'fg__name', { text: v.name }));
      if (v.star) l.appendChild(h('span', 'fg__star', { text: '★ ' + v.star }));
      opts.appendChild(l);
    });
    picker.appendChild(opts);
    on(picker, 'change', function (e) {
      if (!e.target.value) return;
      view = e.target.value;
      try { localStorage.setItem('fg:view', view); } catch (_) {}
      render();
    }, false, offs);

    if (counts) {
      counts.appendChild(h('span', 'fg__label', { text: 'Pieces' }));
      COUNTS.forEach(function (n) {
        var b = h('button', 'fg__chip', { type: 'button', 'aria-pressed': String(n === count), text: String(n) });
        on(b, 'click', function () {
          count = n; counts.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          try { localStorage.setItem('fg:count', String(n)); } catch (_) {}
          render();
        }, false, offs);
        counts.appendChild(b);
      });
    }

    function render() {
      if (!items || !alive) return;
      if (zoom.isOpen()) zoom.close();
      if (destroy) destroy();
      destroy = null; stage.textContent = ''; if (vtools) vtools.textContent = '';
      var v = info(view), reduce = mq.matches;
      stage.className = 'fg__stage fg__stage--' + (reduce ? 'static' : view);
      lastW = stage.clientWidth;
      var ctx = { root: root, stage: stage, vtools: vtools || h('div'), list: items.slice(0, Math.min(count, items.length)), zoom: zoom, reduce: reduce, m: metrics(stage) };
      if (note) {
        note.textContent = '';
        var s = h('strong', '', { text: v.n + ' · ' + v.name + (v.star ? '  ★ ' + v.star : '') });
        note.appendChild(s); note.appendChild(doc.createTextNode(' — ' + (reduce ? NOTE_REDUCE : v.note)));
      }
      if (reduce) staticGrid(stage, ctx);
      else destroy = FN[view](ctx);
    }
    var t = 0;
    var ro = global.ResizeObserver ? new ResizeObserver(function () {
      if (Math.abs(stage.clientWidth - lastW) < 2) return;
      clearTimeout(t); t = setTimeout(render, 160);
    }) : null;
    if (ro) ro.observe(root);
    var mqf = function () { render(); };
    if (mq.addEventListener) { mq.addEventListener('change', mqf); offs.push(function () { mq.removeEventListener('change', mqf); }); }

    var src = root.getAttribute('data-fg-src');
    (src ? fetch(src).then(function (r) { return r.json(); }) : Promise.resolve(placeholders(200)))
      .then(function (d) { items = d; render(); })
      .catch(function () { items = placeholders(200); render(); });

    return function () {
      alive = false; clearTimeout(t);
      if (zoom.isOpen()) zoom.close();
      if (destroy) destroy();
      if (ro) ro.disconnect();
      offs.forEach(function (f) { f(); });
      stage.textContent = ''; opts.remove(); if (counts) counts.textContent = ''; if (vtools) vtools.textContent = '';
    };
  }

  function fresnoGalleries(root) {
    root = root || doc;
    var list = [];
    if (root.matches && root.matches('[data-fg]')) list.push(root);
    root.querySelectorAll('[data-fg]').forEach(function (b) { list.push(b); });
    var cleanups = list.map(wire);
    return function () { cleanups.forEach(function (f) { f(); }); };
  }

  fresnoGalleries.views = VIEWS;
  global.fresnoGalleries = fresnoGalleries;
  var me = doc.currentScript;
  if (!(me && me.hasAttribute('data-manual'))) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { fresnoGalleries(); });
    else fresnoGalleries();
  }
})(window);
