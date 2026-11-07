/* Fresno Lab · 002 · Transitions — https://juancfresno.com/lab/transiciones
   fresnoTransitions(root?) wires every [data-ft] demo inside root and returns a cleanup function.
   fresnoTransitions.run(id, ctx) runs one transition on your own pages (see prompt.md).
   Auto-runs on load unless the script tag has data-manual. MIT. */
(function (global) {
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/';
  var EASE = 'cubic-bezier(0.19, 1, 0.22, 1)';
  var EASE_IO = 'cubic-bezier(0.76, 0, 0.24, 1)';
  var ORDER = { home: 0, work: 1, case: 2 };

  // Timings in ms. The totals shown in the picker are computed from these.
  var T = {
    columns: { n: 12, stagger: 30, drop: 110, backStagger: 12, back: 110 },
    scramble: { out: 100, fade: 150, decode: 450 },
    morph: { out: 200, move: 420, fadeIn: 220 },
    pixels: { cols: 12, spread: 240, step: 40 },
    glitch: { dur: 200, strips: 7 },
    curtain: { up: 300, hold: 40, off: 260 },
    zoom: { out: 220, inn: 320, scale: 0.82 },
    words: { out: 150, word: 300, stagger: 80 },
    slide: { dist: 60, out: 160, inn: 240 },
    // Grid explorations (11–16): the 12-column grid of the page is visible while
    // the old page is taken apart and the new one is put together on it.
    wireframe: { inn: 160, move: 380, out: 220 },
    modular: { snap: 120, colStagger: 20, leave: 200, setStart: 320, setStagger: 45, set: 160, out: 100, parts: 8 },
    fold: { out: 300, hold: 40, inn: 340, stagger: 8 },
    cells: { wave: 14, half: 130, maxStep: 23 },
    blueprint: { draw: 220, cover: 160, coverStagger: 8, coverDur: 140, buildStagger: 10, build: 180, out: 160, rows: 14 },
    step: { fade: 80, cols: 12, per: 45, out: 100 },
    // Wireframe variants (11a–11f). Absolute start times (…At) from the click, in ms.
    wfDrop: { drop: 120, dropStagger: 6, splitAt: 120, split: 100, fillAt: 190, fill: 110, fillStagger: 5, boxesAt: 300, boxes: 90, moveAt: 380, move: 230, moveStagger: 4, out: 110 },
    wfRise: { rise: 200, riseStagger: 10, boxesAt: 240, boxStagger: 30, box: 120, out: 120 },
    wfBoxes: { inn: 100, move: 300, out: 100 },
    wfLabels: { inn: 120, boxesAt: 60, boxes: 100, typeAt: 80, type: 240, typeStagger: 20, fillAt: 340, fillStagger: 40, fill: 140 },
    wfHold: { inn: 120, move: 300, moveStagger: 6, fill: 140, hold: 120, fade: 160 },
    wfBase: { lines: 140, lineStagger: 8, inn: 100, sinkAt: 100, sink: 140, growAt: 220, growStagger: 30, grow: 160, out: 120 }
  };
  var PARTS_MAX = 8; // elements on the busiest mock page (Work: kicker, title, 6 thumbs)
  var ROWS_MAX = 4;  // rows of elements on it (kicker, title, two rows of thumbs)
  var Wd = T.wfDrop, Wr = T.wfRise, Wb = T.wfBoxes, Wl = T.wfLabels, Wh = T.wfHold, Wa = T.wfBase;
  var W = T.wireframe, Md = T.modular, F = T.fold, Ce = T.cells, Bp = T.blueprint, St = T.step;
  var c = T.columns;

  var LIST = [
    { id: 'instant', n: '01', name: 'Sin transición', ms: 0, tag: 'chrome quieto' },
    { id: 'columns', n: '02', name: 'Barrido 12 columnas', ms: (c.n - 1) * c.stagger + c.drop + (c.n - 1) * c.backStagger + c.back },
    { id: 'scramble', n: '03', name: 'Scramble del título', ms: T.scramble.out + T.scramble.decode },
    { id: 'morph', n: '04', name: 'Morph miniatura → hero', ms: T.morph.move, tag: 'al entrar en un caso' },
    { id: 'pixels', n: '05', name: 'Disolución en píxeles', ms: 2 * (T.pixels.spread + T.pixels.step), tag: 'en prueba en la web' },
    { id: 'glitch', n: '06', name: 'Corte con glitch RGB', ms: T.glitch.dur, tag: 'descartada · ya en Biakone', out: true },
    { id: 'curtain', n: '07', name: 'Cortina con clip-path', ms: T.curtain.up + T.curtain.hold + T.curtain.off, tag: 'cliché' },
    { id: 'zoom', n: '08', name: 'Zoom de portada', ms: T.zoom.out + T.zoom.inn },
    { id: 'words', n: '09', name: 'Titular palabra a palabra', ms: '≈ 600' },
    { id: 'slide', n: '10', name: 'Slide direccional', ms: T.slide.out + T.slide.inn, tag: 'inverso al volver' },
    { id: 'wireframe', n: '11', name: 'Wireframe intermedio', ms: W.inn + W.move + W.out, tag: 'retícula · la base' },
    // Wireframe · variantes: same idea as 11 (page → its wireframe → next page), different order and rhythm.
    { id: 'wf-drop', n: '11a', group: 'wf', name: 'Cae la retícula', star: true, ms: Wd.moveAt + Wd.move + (PARTS_MAX - 1) * Wd.moveStagger + Wd.out, tag: 'idea de Juan' },
    { id: 'wf-rise', n: '11b', group: 'wf', name: 'Columnas primero', ms: Wr.boxesAt + (PARTS_MAX - 1) * Wr.boxStagger + Wr.box + Wr.out },
    { id: 'wf-boxes', n: '11c', group: 'wf', name: 'Solo cajas', ms: Wb.inn + Wb.move + Wb.out, tag: 'la más rápida' },
    { id: 'wf-labels', n: '11d', group: 'wf', name: 'Etiquetas primero', star: true, ms: Wl.fillAt + (PARTS_MAX - 1) * Wl.fillStagger + Wl.fill },
    { id: 'wf-hold', n: '11e', group: 'wf', name: 'La retícula se queda', ms: Wh.inn + Wh.move + (PARTS_MAX - 1) * Wh.moveStagger + Wh.fill + Wh.hold + Wh.fade },
    { id: 'wf-base', n: '11f', group: 'wf', name: 'Desde la línea base', ms: Wa.growAt + (ROWS_MAX - 1) * Wa.growStagger + Wa.grow + Wa.out },
    { id: 'modular', n: '12', name: 'Desmontaje modular', ms: Md.setStart + (Md.parts - 1) * Md.setStagger + Md.set + Md.out, tag: 'retícula' },
    { id: 'fold', n: '13', name: 'Retícula que se pliega', ms: F.out + F.hold + F.inn + 11 * F.stagger, tag: 'retícula' },
    { id: 'cells', n: '14', name: 'Celdas', ms: Ce.maxStep * Ce.wave + 2 * Ce.half, tag: 'retícula' },
    { id: 'blueprint', n: '15', name: 'Plano', ms: Bp.cover + (Bp.rows - 1) * Bp.coverStagger + Bp.coverDur + (Bp.rows - 1) * Bp.buildStagger + Bp.build + Bp.out, tag: 'retícula' },
    { id: 'step', n: '16', name: 'Paso de columna', ms: St.fade + St.cols * St.per + St.out, tag: 'retícula' }
  ];

  var GROUPS = { wf: { name: 'Wireframe · variantes', hint: 'La idea de la 11 con otro orden y otro ritmo. Elige una y pulsa ↻ Repetir; con ↑ ↓ saltas a la siguiente y se reproduce sola.' } };

  var NOTE_REDUCE = 'Tienes activado «reducir movimiento»: todas las transiciones caen a instantáneo.';
  var NOTE_GLITCH = 'Descartada: Biakone ya usa glitch y el portfolio tiene que diferenciarse. Se queda solo para comparar. Aviso: unos 200 ms de franjas desplazadas; con «reducir movimiento» no se reproduce nunca.';
  var NOTE_MORPH_FALLBACK = 'Sin miniatura de origen no hay morph: fundido corto. Entra en un caso desde Work para verlo.';

  // ── Engine ─────────────────────────────────────────────────────────────
  // ctx: { view, fx, from, to, swap(), back, source, target, live[] }
  // source/target: the elements to morph between (optional).
  function anim(ctx, el, frames, opts) {
    if (!el.animate) return Promise.resolve();
    var a = el.animate(frames, opts);
    ctx.live.push(a);
    return a.finished.catch(function () {});
  }
  function fadeOut(ctx, el, d) { return anim(ctx, el, [{ opacity: 1 }, { opacity: 0 }], { duration: d, easing: 'ease-out', fill: 'forwards' }); }
  function fadeIn(ctx, el, d, delay) { return anim(ctx, el, [{ opacity: 0 }, { opacity: 1 }], { duration: d, delay: delay || 0, easing: 'ease-out', fill: 'backwards' }); }
  function titleOf(page) { return page.querySelector('.ft__title'); }
  function rel(el, base) {
    var r = el.getBoundingClientRect(), b = base.getBoundingClientRect();
    return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
  }
  function el(cls, parent) { var d = document.createElement('div'); d.className = cls; parent.appendChild(d); return d; }

  function scrambleText(ctx, node, dur) {
    var text = node.getAttribute('data-ft-text') || node.textContent;
    node.setAttribute('data-ft-text', text);
    node.setAttribute('aria-label', text);
    return new Promise(function (done) {
      var start = performance.now();
      var tick = function (now) {
        var p = Math.min(1, (now - start) / dur), n = Math.floor(p * text.length);
        node.textContent = text.split('').map(function (ch, i) {
          return i < n || ch === ' ' || ch === '.' || ch === ',' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }).join('');
        if (p < 1) ctx.raf = requestAnimationFrame(tick);
        else { node.textContent = text; done(); }
      };
      ctx.raf = requestAnimationFrame(tick);
      ctx.stops.push(function () { cancelAnimationFrame(ctx.raf); node.textContent = text; done(); });
    });
  }

  // ── Grid helpers (11–16) ───────────────────────────────────────────────
  // The mock page sits on the site's 12-column grid: margin = page padding (64 at 1680),
  // gutter = .ft__grid gap (16 at 1680), both liquid with the stage width.
  function metrics(ctx) {
    var v = ctx.view.getBoundingClientRect();
    var pad = parseFloat(getComputedStyle(ctx.from).paddingLeft) || v.width * 64 / 1680;
    var grid = ctx.from.querySelector('.ft__grid');
    var gap = (grid && parseFloat(getComputedStyle(grid).columnGap)) || pad * 16 / 64, colW = (v.width - 2 * pad - 11 * gap) / 12;
    var m = { w: v.width, h: v.height, pad: pad, gap: gap, colW: colW, pitch: colW + gap };
    m.x = function (i) { return pad + i * (colW + gap); };
    // Column bands edge to edge: split at the middle of each gutter, margins go to the outer bands.
    m.edges = [0];
    for (var i = 1; i < 12; i++) m.edges.push(m.x(i) - gap / 2);
    m.edges.push(v.width);
    m.col = function (x) { return Math.max(0, Math.min(11, Math.floor((x - pad + gap / 2) / (colW + gap)))); };
    return m;
  }
  function box(cls, parent, r) {
    var d = el(cls, parent);
    d.style.left = r.x + 'px'; d.style.top = r.y + 'px'; d.style.width = r.w + 'px'; d.style.height = r.h + 'px';
    return d;
  }
  function gridFx(ctx, m, numbers) {
    var g = el('ft__gfx', ctx.fx);
    for (var i = 0; i < 12; i++) {
      var c = box('ft__gcol', g, { x: m.x(i), y: 0, w: m.colW, h: m.h });
      if (numbers) c.textContent = (i < 9 ? '0' : '') + (i + 1);
    }
    return g;
  }
  function veil(ctx, node) { node.style.visibility = 'hidden'; ctx.stops.push(function () { node.style.visibility = ''; }); }
  // Lays out a hidden page without showing it, so it can be measured and cloned.
  function ghostShow(ctx, page) {
    page.hidden = false; page.style.visibility = 'hidden';
    ctx.stops.push(function () { page.style.visibility = ''; });
  }
  // A clone of `page` seen through a window at (x, y, w, h) of the view.
  function cut(page, m, r, parent, cls) {
    var s = box(cls || 'ft__slice', parent, r), c = page.cloneNode(true);
    c.removeAttribute('data-ft-page'); c.hidden = false;
    c.style.cssText = 'inset:auto;left:' + (-r.x) + 'px;top:' + (-r.y) + 'px;width:' + m.w + 'px;height:' + m.h + 'px;visibility:visible';
    s.appendChild(c);
    return s;
  }
  function parts(ctx, page) {
    return Array.prototype.slice.call(page.querySelectorAll('.ft__kicker, .ft__title, .ft__thumb, [data-ft-hero]'))
      .map(function (n) { return { n: n, r: rel(n, ctx.view) }; })
      .filter(function (p) { return p.r.w > 0 && p.r.h > 0; });
  }
  var RATIOS = [[1, 1], [5, 4], [4, 3], [3, 2], [16, 9], [21, 9], [4, 5], [3, 4], [2, 3], [9, 16]];
  function ratio(w, h) {
    var best = RATIOS[0];
    RATIOS.forEach(function (q) { if (Math.abs(w / h - q[0] / q[1]) < Math.abs(w / h - best[0] / best[1])) best = q; });
    return best[0] + ':' + best[1];
  }
  // The label each element wears as a wireframe box: "H1 · 72/68", "P · 12", "IMG 16:9".
  function tagOf(p) {
    var n = p.n, cs = getComputedStyle(n);
    if (n.classList.contains('ft__title')) return 'H1 · ' + Math.round(parseFloat(cs.fontSize)) + '/' + Math.round(parseFloat(cs.lineHeight) || parseFloat(cs.fontSize));
    if (n.classList.contains('ft__kicker')) return 'P · ' + Math.round(parseFloat(cs.fontSize)) + ' MONO';
    var media = n.classList.contains('ft__media') ? n : n.querySelector('.ft__media'), r = media ? media.getBoundingClientRect() : p.r;
    return 'IMG ' + ratio(r.width || p.r.w, r.height || p.r.h);
  }
  function wait(ctx, ms) {
    return new Promise(function (done) { var id = setTimeout(done, ms); ctx.stops.push(function () { clearTimeout(id); done(); }); });
  }

  // ── Wireframe helpers (11, 11a–11f) ───────────────────────────────────
  function fr(r) { return { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }; }
  // Measures both pages: A = old page's elements, B = new page's, each with its label.
  function wfSetup(ctx) {
    var m = metrics(ctx), A = parts(ctx, ctx.from);
    ghostShow(ctx, ctx.to);
    var B = parts(ctx, ctx.to);
    A.forEach(function (p) { p.l = tagOf(p); });
    B.forEach(function (p) { p.l = tagOf(p); });
    return { m: m, A: A, B: B };
  }
  // One box per element pair, created at the old element's rect; extra ones are born/die at the last.
  function wfPairs(ctx, A, B, cls, labels) {
    var n = Math.max(A.length, B.length), out = [];
    for (var i = 0; i < n; i++) {
      var a = A[i] || A[A.length - 1], b = B[i] || B[B.length - 1];
      var d = box('ft__wf' + (cls ? ' ' + cls : ''), ctx.fx, a.r), lab = labels === false ? null : el('ft__wfl', d);
      if (!A[i]) d.style.opacity = '0';
      if (lab) lab.textContent = a.l;
      out.push({ d: d, lab: lab, a: a, b: b, born: !A[i], dies: !B[i] });
    }
    return out;
  }
  // FLIP-style travel from rect a to rect b. Born boxes fade in on the way, dying ones fade out.
  function wfMove(ctx, x, dur, delay) {
    var k0 = fr(x.a.r), k1 = fr(x.b.r);
    if (x.born || x.dies) { k0.opacity = x.born ? 0 : 1; k1.opacity = x.dies ? 0 : 1; }
    return anim(ctx, x.d, [k0, k1], { duration: dur, delay: delay, easing: EASE, fill: x.born ? 'both' : 'forwards' });
  }
  function relabel(ctx, boxes, at) {
    return wait(ctx, at).then(function () { boxes.forEach(function (x) { if (x.lab) x.lab.textContent = x.b.l; }); });
  }
  // Labels type in with the scramble, staggered; one rAF loop for all of them.
  function typeLabels(ctx, items, dur, stagger) {
    return new Promise(function (done) {
      var start = performance.now(), raf, over = false;
      var finish = function () { if (over) return; over = true; cancelAnimationFrame(raf); items.forEach(function (it) { it.node.textContent = it.text; }); done(); };
      var tick = function (now) {
        var all = true;
        items.forEach(function (it, i) {
          var p = Math.max(0, Math.min(1, (now - start - i * stagger) / dur)), n = Math.floor(p * it.text.length);
          if (p < 1) all = false;
          it.node.textContent = now - start < i * stagger ? '' : it.text.split('').map(function (ch, j) {
            return j < n || ch === ' ' || ch === '·' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }).join('');
        });
        if (all) finish(); else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      ctx.stops.push(finish);
    });
  }
  // Reading order: top to bottom, then left to right.
  function reading(list) { return list.slice().sort(function (p, q) { return (Math.round(p.r.y) - Math.round(q.r.y)) || (p.r.x - q.r.x); }); }
  function swapIn(ctx, d) { ctx.swap(); return Promise.all([fadeIn(ctx, ctx.to, d), fadeOut(ctx, ctx.fx, d)]); }

  var FX = {
    instant: function (ctx) { ctx.swap(); return Promise.resolve(); },

    // 12 columns drop with a 30 ms stagger, cover the page, swap, then retract downwards.
    columns: function (ctx) {
      var t = T.columns, cols = [];
      for (var i = 0; i < t.n; i++) {
        var col = el('ft__col', ctx.fx);
        col.style.left = (i * 100 / t.n) + '%';
        col.style.width = 'calc(' + (100 / t.n) + '% + 1px)';
        cols.push(col);
      }
      return Promise.all(cols.map(function (col, i) {
        return anim(ctx, col, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: t.drop, delay: i * t.stagger, easing: EASE_IO, fill: 'forwards' });
      })).then(function () {
        ctx.swap();
        return Promise.all(cols.map(function (col, i) {
          col.style.transformOrigin = 'bottom';
          return anim(ctx, col, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: t.back, delay: i * t.backStagger, easing: EASE_IO, fill: 'forwards' });
        }));
      });
    },

    // Short fade, then the title decodes letter by letter.
    scramble: function (ctx) {
      var t = T.scramble;
      return fadeOut(ctx, ctx.from, t.out).then(function () {
        ctx.swap();
        return Promise.all([fadeIn(ctx, ctx.to, t.fade), scrambleText(ctx, titleOf(ctx.to), t.decode)]);
      });
    },

    // FLIP: a ghost of the thumbnail travels to the hero rect while the pages cross-fade.
    morph: function (ctx) {
      var t = T.morph;
      if (!ctx.source) { ctx.fallback = true; return fadeOut(ctx, ctx.from, 120).then(function () { ctx.swap(); return fadeIn(ctx, ctx.to, 160); }); }
      ctx.to.hidden = false;
      var target = ctx.target(), first = rel(ctx.source, ctx.view);
      if (!target) { ctx.to.hidden = true; ctx.source = null; return FX.morph(ctx); }
      var last = rel(target, ctx.view);
      var ghost = el('ft__ghost', ctx.fx);
      ghost.style.cssText = 'left:' + last.x + 'px;top:' + last.y + 'px;width:' + last.w + 'px;height:' + last.h + 'px;background:' + getComputedStyle(ctx.source).backgroundImage;
      ctx.source.style.visibility = 'hidden';
      target.style.visibility = 'hidden';
      ctx.stops.push(function () { ctx.source.style.visibility = ''; target.style.visibility = ''; });
      var inv = 'translate(' + (first.x - last.x) + 'px,' + (first.y - last.y) + 'px) scale(' + first.w / last.w + ',' + first.h / last.h + ')';
      return Promise.all([
        anim(ctx, ghost, [{ transform: inv }, { transform: 'none' }], { duration: t.move, easing: EASE, fill: 'forwards' }),
        fadeOut(ctx, ctx.from, t.out),
        fadeIn(ctx, ctx.to, t.fadeIn, t.move - t.fadeIn)
      ]).then(function () { ctx.swap(); });
    },

    // Blocks switch on in Bayer order, swap, then switch off in the same order.
    pixels: function (ctx) {
      var t = T.pixels, v = ctx.view.getBoundingClientRect();
      var cols = t.cols, rows = Math.max(4, Math.round(cols * v.height / v.width));
      var B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      var px = [];
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var p = el('ft__px', ctx.fx);
        p.style.cssText = 'left:' + (x * 100 / cols) + '%;top:' + (y * 100 / rows) + '%;width:calc(' + (100 / cols) + '% + 1px);height:calc(' + (100 / rows) + '% + 1px)';
        px.push({ el: p, d: (B[y % 4][x % 4] + Math.random() * 0.8) / 16 * t.spread });
      }
      var step = function (a, b) {
        return Promise.all(px.map(function (p) { return anim(ctx, p.el, [{ opacity: a }, { opacity: b }], { duration: t.step, delay: p.d, easing: 'steps(1, end)', fill: 'forwards' }); }));
      };
      return step(0, 1).then(function () { ctx.swap(); return step(1, 0); });
    },

    // ~200 ms of shifted strips with split channels over the old page; the new one is already underneath.
    glitch: function (ctx) {
      var t = T.glitch, strips = [];
      for (var i = 0; i < t.strips; i++) {
        var s = el('ft__strip', ctx.fx), copy = ctx.from.cloneNode(true);
        copy.removeAttribute('data-ft-page');
        var top = i * 100 / t.strips, bottom = 100 - (i + 1) * 100 / t.strips;
        s.style.clipPath = 'inset(' + top + '% 0 ' + bottom + '% 0)';
        s.appendChild(copy);
        strips.push(s);
      }
      ctx.swap();
      var r = function () { return ((Math.random() * 2 - 1) * 6).toFixed(1) + '%'; };
      return Promise.all(strips.map(function (s) {
        return anim(ctx, s, [
          { transform: 'translateX(0)', opacity: 1, easing: 'steps(1, end)' },
          { transform: 'translateX(' + r() + ')', opacity: 1, offset: 0.25, easing: 'steps(1, end)' },
          { transform: 'translateX(' + r() + ')', opacity: 1, offset: 0.55, easing: 'steps(1, end)' },
          { transform: 'translateX(' + r() + ')', opacity: 1, offset: 0.8, easing: 'steps(1, end)' },
          { transform: 'translateX(0)', opacity: 0 }
        ], { duration: t.dur, fill: 'forwards' });
      }));
    },

    // A panel with a curved top rises, shows the destination, then lifts off with clip-path.
    curtain: function (ctx) {
      var t = T.curtain, panel = el('ft__curtain', ctx.fx);
      panel.textContent = '• ' + ctx.toName;
      return anim(ctx, panel, [
        { transform: 'translateY(100%)', borderRadius: '50% 50% 0 0 / 40% 40% 0 0' },
        { transform: 'translateY(0)', borderRadius: '0' }
      ], { duration: t.up, easing: EASE_IO, fill: 'forwards' }).then(function () {
        ctx.swap();
        return anim(ctx, panel, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: t.off, delay: t.hold, easing: EASE_IO, fill: 'forwards' });
      });
    },

    // Simplified magazine zoom: the page shrinks to a cover, the next cover zooms up to full page.
    zoom: function (ctx) {
      var t = T.zoom, cover = 'scale(' + t.scale + ')', frame = '0 0 0 1px var(--ft-line), 0 2cqi 6cqi rgba(0,0,0,0.4)';
      return anim(ctx, ctx.from, [
        { transform: 'none', opacity: 1, boxShadow: 'none' },
        { transform: cover, opacity: 0, boxShadow: frame }
      ], { duration: t.out, easing: EASE_IO, fill: 'forwards' }).then(function () {
        ctx.swap();
        return anim(ctx, ctx.to, [
          { transform: cover, opacity: 0, boxShadow: frame },
          { transform: cover, opacity: 1, boxShadow: frame, offset: 0.2 },
          { transform: 'none', opacity: 1, boxShadow: 'none' }
        ], { duration: t.inn, easing: EASE, fill: 'backwards' });
      });
    },

    // Old page fades; the new headline comes in word by word, from grey to ink.
    words: function (ctx) {
      var t = T.words;
      return fadeOut(ctx, ctx.from, t.out).then(function () {
        var h = titleOf(ctx.to), text = h.textContent;
        h.setAttribute('aria-label', text);
        h.textContent = '';
        var words = text.split(/(\s+)/).filter(Boolean).map(function (w) {
          var s = document.createElement('span'); s.className = 'ft__word'; s.textContent = w; h.appendChild(s); return s;
        }).filter(function (s) { return /\S/.test(s.textContent); });
        ctx.stops.push(function () { h.textContent = text; });
        ctx.swap();
        return Promise.all([fadeIn(ctx, ctx.to, t.out)].concat(words.map(function (w, i) {
          return anim(ctx, w, [{ opacity: 0.15 }, { opacity: 1 }], { duration: t.word, delay: i * t.stagger, easing: 'ease-out', fill: 'backwards' });
        })));
      });
    },

    // 60 px plus a fade; reversed when going back.
    slide: function (ctx) {
      var t = T.slide, d = ctx.back ? -1 : 1;
      return anim(ctx, ctx.from, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(' + (-t.dist * d) + 'px)', opacity: 0 }], { duration: t.out, easing: 'ease-in', fill: 'forwards' }).then(function () {
        ctx.swap();
        return anim(ctx, ctx.to, [{ transform: 'translateX(' + (t.dist * d) + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: t.inn, easing: EASE, fill: 'backwards' });
      });
    },

    // 11 · The page reduces to its own wireframe on the grid; the boxes travel (FLIP-style)
    // to where the new page's elements sit, then fill with the real content.
    wireframe: function (ctx) {
      var t = T.wireframe, m = metrics(ctx), g = gridFx(ctx, m);
      var A = parts(ctx, ctx.from);
      ghostShow(ctx, ctx.to);
      var B = parts(ctx, ctx.to);
      A.forEach(function (p) { p.l = tagOf(p); });
      B.forEach(function (p) { p.l = tagOf(p); });
      var n = Math.max(A.length, B.length), boxes = [];
      for (var i = 0; i < n; i++) {
        var a = A[i] || A[A.length - 1], b = B[i] || B[B.length - 1];
        var d = box('ft__wf', ctx.fx, a.r), lab = el('ft__wfl', d);
        lab.textContent = a.l;
        boxes.push({ d: d, lab: lab, a: a, b: b, born: !A[i], dies: !B[i] });
      }
      var fr = function (r) { return { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }; };
      return Promise.all([
        fadeIn(ctx, g, t.inn),
        fadeOut(ctx, ctx.from, t.inn),
        Promise.all(boxes.map(function (x) { return x.born ? null : fadeIn(ctx, x.d, t.inn); }))
      ]).then(function () {
        return Promise.all(boxes.map(function (x, i) {
          x.lab.textContent = x.b.l;
          var k0 = fr(x.a.r), k1 = fr(x.b.r);
          k0.opacity = x.born ? 0 : 1; k1.opacity = x.dies ? 0 : 1;
          return anim(ctx, x.d, [k0, k1], { duration: t.move, delay: i * 12, easing: EASE, fill: 'forwards' });
        }));
      }).then(function () {
        ctx.swap();
        return Promise.all([fadeIn(ctx, ctx.to, t.out), fadeOut(ctx, ctx.fx, t.out)]);
      });
    },

    // 11a · Juan's idea. The grid falls in first: one thin line per gutter drops, splits open
    // into the gutter, the columns fill. Then the old page turns into its wireframe, the boxes
    // travel to the new layout and fill with the content. Reversed (right to left) going back.
    'wf-drop': function (ctx) {
      var t = T.wfDrop, s = wfSetup(ctx), m = s.m, d = ctx.back ? -1 : 1, run = [];
      var ord = function (i) { return d > 0 ? i : 11 - i; };
      var g = el('ft__gfx', ctx.fx);
      for (var i = 0; i < 12; i++) {
        var f = box('ft__gfill', g, { x: m.x(i), y: 0, w: m.colW, h: m.h });
        run.push(anim(ctx, f, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: t.fill, delay: t.fillAt + ord(i) * t.fillStagger, easing: EASE, fill: 'both' }));
        // Left and right edge of column i. Inner edges start together in the middle of their gutter.
        [[m.x(i), i > 0 ? -m.gap / 2 : 0], [m.x(i) + m.colW - 1, i < 11 ? m.gap / 2 : 0]].forEach(function (q) {
          var l = box('ft__gl', g, { x: q[0], y: 0, w: 1, h: m.h }), o = 'translateX(' + q[1] + 'px)';
          l.style.transform = o;
          run.push(anim(ctx, l, [{ transform: o + ' scaleY(0)' }, { transform: o + ' scaleY(1)' }], { duration: t.drop, delay: ord(i) * t.dropStagger, easing: EASE, fill: 'backwards' }));
          if (q[1]) run.push(anim(ctx, l, [{ transform: o }, { transform: 'none' }], { duration: t.split, delay: t.splitAt + ord(i) * t.dropStagger, easing: EASE_IO, fill: 'forwards' }));
        });
      }
      var boxes = wfPairs(ctx, s.A, s.B);
      run.push(anim(ctx, ctx.from, [{ opacity: 1 }, { opacity: 0 }], { duration: t.boxes, delay: t.boxesAt, easing: 'ease-out', fill: 'forwards' }));
      boxes.forEach(function (x, i) {
        if (!x.born) run.push(fadeIn(ctx, x.d, t.boxes, t.boxesAt));
        run.push(wfMove(ctx, x, t.move, t.moveAt + i * t.moveStagger));
      });
      run.push(relabel(ctx, boxes, t.moveAt));
      var outAt = t.moveAt + t.move + (boxes.length - 1) * t.moveStagger;
      return Promise.all(run.concat(wait(ctx, outAt).then(function () { return swapIn(ctx, t.out); })));
    },

    // 11b · Column-first. The 12 columns rise from the bottom while the old page fades; the new
    // page's boxes and labels draw in, in reading order; then the content fills. No travel.
    'wf-rise': function (ctx) {
      var t = T.wfRise, s = wfSetup(ctx), m = s.m, d = ctx.back ? -1 : 1, run = [];
      var g = gridFx(ctx, m);
      Array.prototype.forEach.call(g.children, function (c, i) {
        c.style.transformOrigin = 'bottom';
        run.push(anim(ctx, c, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: t.rise, delay: (d > 0 ? i : 11 - i) * t.riseStagger, easing: EASE, fill: 'backwards' }));
      });
      run.push(fadeOut(ctx, ctx.from, t.rise));
      var B = reading(s.B);
      B.forEach(function (p, i) {
        var b = box('ft__wf', ctx.fx, p.r);
        el('ft__wfl', b).textContent = p.l;
        run.push(anim(ctx, b, [{ clipPath: 'inset(0 100% 0 0)', opacity: 0 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], { duration: t.box, delay: t.boxesAt + i * t.boxStagger, easing: EASE, fill: 'backwards' }));
      });
      var outAt = t.boxesAt + (B.length - 1) * t.boxStagger + t.box;
      return Promise.all(run.concat(wait(ctx, outAt).then(function () { return swapIn(ctx, t.out); })));
    },

    // 11c · Boxes only. No grid, no labels: outlines take over the old page, morph, fill. ~500 ms.
    'wf-boxes': function (ctx) {
      var t = T.wfBoxes, s = wfSetup(ctx), boxes = wfPairs(ctx, s.A, s.B, 'ft__wf--line', false);
      return Promise.all([fadeOut(ctx, ctx.from, t.inn)].concat(boxes.map(function (x) {
        return x.born ? null : fadeIn(ctx, x.d, t.inn);
      }), boxes.map(function (x) { return wfMove(ctx, x, t.move, t.inn); }))).then(function () { return swapIn(ctx, t.out); });
    },

    // 11d · Labels forward. The new page's boxes appear over a faint grid and their mono labels
    // ("H1 · 72/68", "IMG 16:9") type in with the scramble; then each box fills, in reading order.
    'wf-labels': function (ctx) {
      var t = T.wfLabels, s = wfSetup(ctx), m = s.m, run = [];
      var g = gridFx(ctx, m);
      run.push(anim(ctx, g, [{ opacity: 0 }, { opacity: 0.6 }], { duration: t.inn, easing: 'ease-out', fill: 'forwards' }));
      run.push(fadeOut(ctx, ctx.from, t.inn));
      var B = reading(s.B), items = [];
      var covers = B.map(function (p, i) {
        var b = box('ft__wf ft__wf--solid', ctx.fx, { x: p.r.x - 2, y: p.r.y - 2, w: p.r.w + 4, h: p.r.h + 4 });
        var lab = el('ft__wfl', b);
        items.push({ node: lab, text: p.l });
        run.push(fadeIn(ctx, b, t.boxes, t.boxesAt));
        return b;
      });
      run.push(wait(ctx, t.typeAt).then(function () { return typeLabels(ctx, items, t.type, t.typeStagger); }));
      // The covers are opaque, so the new page can go in underneath before they open.
      run.push(wait(ctx, t.boxesAt + t.boxes).then(function () { ctx.swap(); }));
      covers.forEach(function (b, i) {
        run.push(anim(ctx, b, [{ opacity: 1 }, { opacity: 0 }], { duration: t.fill, delay: t.fillAt + i * t.fillStagger, easing: 'ease-out', fill: 'forwards' }));
      });
      var end = t.fillAt + (covers.length - 1) * t.fillStagger;
      run.push(anim(ctx, g, [{ opacity: 0.6 }, { opacity: 0 }], { duration: t.fill, delay: end, easing: 'ease-out', fill: 'forwards' }));
      return Promise.all(run);
    },

    // 11e · Grid stays. Like 11, but once the new page has filled in, the grid stays on top of it
    // for a beat (as if you had pressed G) and then fades.
    'wf-hold': function (ctx) {
      var t = T.wfHold, s = wfSetup(ctx), m = s.m;
      var g = gridFx(ctx, m), boxes = wfPairs(ctx, s.A, s.B);
      return Promise.all([fadeIn(ctx, g, t.inn), fadeOut(ctx, ctx.from, t.inn)].concat(boxes.map(function (x) {
        return x.born ? null : fadeIn(ctx, x.d, t.inn);
      }))).then(function () {
        boxes.forEach(function (x) { if (x.lab) x.lab.textContent = x.b.l; });
        return Promise.all(boxes.map(function (x, i) { return wfMove(ctx, x, t.move, i * t.moveStagger); }));
      }).then(function () {
        ctx.swap();
        return Promise.all([fadeIn(ctx, ctx.to, t.fill)].concat(boxes.map(function (x) { return fadeOut(ctx, x.d, t.fill); })));
      }).then(function () {
        return anim(ctx, g, [{ opacity: 1 }, { opacity: 0 }], { duration: t.fade, delay: t.hold, easing: 'ease-in-out', fill: 'forwards' });
      });
    },

    // 11f · From the baseline. Baselines draw in from the bottom up; the old boxes sink into
    // their own baseline; the new ones grow upward from theirs, bottom row first, then fill.
    'wf-base': function (ctx) {
      var t = T.wfBase, s = wfSetup(ctx), m = s.m, run = [];
      var g = gridFx(ctx, m);
      run.push(anim(ctx, g, [{ opacity: 0 }, { opacity: 0.6 }], { duration: t.inn, easing: 'ease-out', fill: 'forwards' }));
      var step = m.pitch / 2, rows = Math.ceil(m.h / step);
      for (var i = 0; i < rows; i++) {
        var b = box('ft__base', ctx.fx, { x: 0, y: m.h - (i + 1) * step, w: m.w, h: 1 });
        run.push(anim(ctx, b, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: t.lines, delay: i * t.lineStagger, easing: EASE, fill: 'backwards' }));
      }
      run.push(fadeOut(ctx, ctx.from, t.inn));
      s.A.forEach(function (p) {
        var a = box('ft__wf', ctx.fx, p.r);
        el('ft__wfl', a).textContent = p.l;
        run.push(fadeIn(ctx, a, t.inn));
        run.push(anim(ctx, a, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(100% 0 0 0)' }], { duration: t.sink, delay: t.sinkAt, easing: EASE_IO, fill: 'forwards' }));
      });
      // Rows of the new page by their bottom edge, lowest first.
      var bottoms = [];
      s.B.forEach(function (p) { var y = Math.round(p.r.y + p.r.h); if (bottoms.indexOf(y) < 0) bottoms.push(y); });
      bottoms.sort(function (p, q) { return q - p; });
      s.B.forEach(function (p) {
        var nb = box('ft__wf', ctx.fx, p.r);
        el('ft__wfl', nb).textContent = p.l;
        run.push(anim(ctx, nb, [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: t.grow, delay: t.growAt + bottoms.indexOf(Math.round(p.r.y + p.r.h)) * t.growStagger, easing: EASE, fill: 'backwards' }));
      });
      var outAt = t.growAt + (bottoms.length - 1) * t.growStagger + t.grow;
      return Promise.all(run.concat(wait(ctx, outAt).then(function () { return swapIn(ctx, t.out); })));
    },

    // 12 · Elements snap to their grid columns with outlines, leave column by column;
    // the new modules drop into their cells in reading order, like setting type.
    modular: function (ctx) {
      var t = T.modular, m = metrics(ctx), g = gridFx(ctx, m);
      var mk = function (p) {
        var b = box('ft__mod', ctx.fx, p.r), c = p.n.cloneNode(true);
        c.style.cssText = 'width:100%;height:100%;margin:0;visibility:visible';
        b.appendChild(c);
        var c0 = m.col(p.r.x), c1 = m.col(p.r.x + p.r.w - 1);
        p.c = c0; p.b = b; p.snap = { left: m.x(c0) + 'px', width: (m.x(c1) + m.colW - m.x(c0)) + 'px' };
        return p;
      };
      var A = parts(ctx, ctx.from).map(mk);
      veil(ctx, ctx.from);
      ghostShow(ctx, ctx.to);
      var B = parts(ctx, ctx.to).map(mk).sort(function (a, b) { return (a.r.y - b.r.y) || (a.r.x - b.r.x); });
      return Promise.all([
        fadeIn(ctx, g, t.snap),
        Promise.all(A.map(function (p) {
          return anim(ctx, p.b, [{ left: p.r.x + 'px', width: p.r.w + 'px' }, p.snap], { duration: t.snap, easing: EASE_IO, fill: 'forwards' }).then(function () {
            return anim(ctx, p.b, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-2.5cqi)', opacity: 0 }], { duration: t.leave, delay: p.c * t.colStagger, easing: EASE_IO, fill: 'forwards' });
          });
        })),
        Promise.all(B.map(function (p, i) {
          return anim(ctx, p.b, [{ transform: 'translateY(-1.5cqi)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: t.set, delay: t.setStart + i * t.setStagger, easing: EASE, fill: 'both' });
        }))
      ]).then(function () { ctx.swap(); return fadeOut(ctx, ctx.fx, t.out); });
    },

    // 13 · The 12 columns fold to zero width against one edge, carrying the content;
    // the gutters stay as lines; then they unfold into the new page.
    fold: function (ctx) {
      var t = T.fold, m = metrics(ctx), d = ctx.back ? -1 : 1, edge = d > 0 ? m.pad : m.w - m.pad;
      el('ft__fill', ctx.fx);
      var band = function (i) { return { x: m.edges[i], y: 0, w: m.edges[i + 1] - m.edges[i], h: m.h }; };
      var folded = function (i) { var r = band(i); return 'translateX(' + ((d > 0 ? edge : edge - r.w) - r.x) + 'px) scaleX(0)'; };
      var strips = function (page) {
        var out = [];
        for (var i = 0; i < 12; i++) { var s = cut(page, m, band(i), ctx.fx); s.style.transformOrigin = d > 0 ? 'left' : 'right'; out.push(s); }
        return out;
      };
      var lines = [];
      for (var i = 1; i < 12; i++) { var l = box('ft__gline', ctx.fx, { x: m.edges[i], y: 0, w: 1, h: m.h }); lines.push({ l: l, x: m.edges[i] }); }
      var A = strips(ctx.from);
      veil(ctx, ctx.from);
      return Promise.all(A.map(function (s, i) {
        return anim(ctx, s, [{ transform: 'none' }, { transform: folded(i) }], { duration: t.out, easing: EASE_IO, fill: 'forwards' });
      }).concat(lines.map(function (x) {
        return anim(ctx, x.l, [{ transform: 'none' }, { transform: 'translateX(' + (edge - x.x) + 'px)' }], { duration: t.out, easing: EASE_IO, fill: 'forwards' });
      }))).then(function () { return wait(ctx, t.hold); }).then(function () {
        A.forEach(function (s) { s.remove(); });
        ghostShow(ctx, ctx.to);
        var B = strips(ctx.to);
        lines.forEach(function (x) { ctx.fx.appendChild(x.l); });
        var order = function (i) { return (d > 0 ? i : 11 - i) * t.stagger; };
        return Promise.all(B.map(function (s, i) {
          return anim(ctx, s, [{ transform: folded(i) }, { transform: 'none' }], { duration: t.inn, delay: order(i), easing: EASE, fill: 'both' });
        }).concat(lines.map(function (x, i) {
          return anim(ctx, x.l, [{ transform: 'translateX(' + (edge - x.x) + 'px)', opacity: 1 }, { transform: 'none', opacity: 1, offset: 0.8 }, { transform: 'none', opacity: 0 }], { duration: t.inn, delay: order(i + 1), easing: EASE, fill: 'both' });
        })));
      }).then(function () { ctx.swap(); });
    },

    // 14 · The page is cut into its real grid cells (column × square row); each cell turns
    // over in a reading-order wave and shows the new page on its back.
    cells: function (ctx) {
      var t = T.cells, m = metrics(ctx), rows = Math.ceil(m.h / m.pitch), all = [];
      ghostShow(ctx, ctx.to);
      for (var y = 0; y < rows; y++) for (var x = 0; x < 12; x++) {
        var r = { x: m.edges[x], y: y * m.pitch, w: m.edges[x + 1] - m.edges[x], h: Math.min(m.pitch, m.h - y * m.pitch) };
        var cell = box('ft__cell', ctx.fx, r), local = { x: 0, y: 0, w: r.w, h: r.h };
        var a = cut(ctx.from, m, r, cell, 'ft__face'), b = cut(ctx.to, m, r, cell, 'ft__face');
        a.style.cssText = b.style.cssText = 'left:0;top:0;width:' + local.w + 'px;height:' + local.h + 'px';
        all.push({ a: a, b: b, d: Math.min(t.maxStep, x + y * 2) * t.wave });
      }
      veil(ctx, ctx.from);
      return Promise.all(all.map(function (c) {
        return Promise.all([
          anim(ctx, c.a, [{ transform: 'perspective(40em) rotateY(0deg)' }, { transform: 'perspective(40em) rotateY(90deg)' }], { duration: t.half, delay: c.d, easing: 'ease-in', fill: 'forwards' }),
          anim(ctx, c.b, [{ transform: 'perspective(40em) rotateY(-90deg)' }, { transform: 'perspective(40em) rotateY(0deg)' }], { duration: t.half, delay: c.d + t.half, easing: 'ease-out', fill: 'both' })
        ]);
      })).then(function () { ctx.swap(); });
    },

    // 15 · Blueprint: columns, baselines and a measured dimension line draw in; the old
    // content sinks into the baselines, the new one rises back up from them.
    blueprint: function (ctx) {
      var t = T.blueprint, m = metrics(ctx), base = m.h / t.rows, bands = [], bases = [];
      for (var i = 0; i < t.rows; i++) {
        var b = box('ft__band', ctx.fx, { x: 0, y: i * base, w: m.w, h: base + 1 });
        bands.push(b);
      }
      var g = gridFx(ctx, m);
      for (i = 0; i < t.rows; i++) bases.push(box('ft__base', ctx.fx, { x: 0, y: (i + 1) * base - 1, w: m.w, h: 1 }));
      var dim = box('ft__dim', ctx.fx, { x: m.pad, y: m.pad * 0.45, w: m.w - 2 * m.pad, h: 1 });
      el('ft__diml', dim).textContent = 'W ' + Math.round(m.w) + ' · 12 COL · G ' + Math.round(m.gap) + ' · M ' + Math.round(m.pad) + ' · B ' + Math.round(base);
      var cols = Array.prototype.slice.call(g.children);
      var lines = cols.map(function (c, i) {
        return anim(ctx, c, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: t.draw, delay: i * 10, easing: EASE, fill: 'both' });
      }).concat(bases.map(function (b, i) {
        return anim(ctx, b, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: t.draw, delay: i * 8, easing: EASE, fill: 'both' });
      }), [fadeIn(ctx, dim, t.draw)]);
      var cover = bands.map(function (b, i) {
        b.style.transformOrigin = 'bottom';
        return anim(ctx, b, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: t.coverDur, delay: t.cover + i * t.coverStagger, easing: EASE_IO, fill: 'both' });
      });
      return Promise.all(lines.concat(cover)).then(function () {
        ctx.swap();
        return Promise.all(bands.map(function (b, i) {
          b.style.transformOrigin = 'top';
          return anim(ctx, b, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: t.build, delay: i * t.buildStagger, easing: EASE, fill: 'forwards' });
        }));
      }).then(function () { return fadeOut(ctx, ctx.fx, t.out); });
    },

    // 16 · The page ratchets sideways one grid column at a time (12 eased steps of exactly
    // one column + gutter); the new page follows on the same grid, numbered 01–12.
    step: function (ctx) {
      var t = T.step, m = metrics(ctx), d = ctx.back ? -1 : 1, dist = 12 * m.pitch;
      el('ft__fill', ctx.fx);
      var track = el('ft__track', ctx.fx);
      ghostShow(ctx, ctx.to);
      var a = cut(ctx.from, m, { x: 0, y: 0, w: m.w, h: m.h }, track), b = cut(ctx.to, m, { x: 0, y: 0, w: m.w, h: m.h }, track);
      b.style.left = (d * dist) + 'px';
      b.firstChild.style.background = 'transparent';
      a.style.overflow = b.style.overflow = 'visible';
      var g = gridFx(ctx, m, true);
      veil(ctx, ctx.from);
      var frames = [];
      for (var i = 0; i <= t.cols; i++) frames.push({ transform: 'translateX(' + (-d * i * m.pitch) + 'px)', easing: EASE_IO });
      return fadeIn(ctx, g, t.fade).then(function () {
        return anim(ctx, track, frames, { duration: t.cols * t.per, fill: 'forwards' });
      }).then(function () { ctx.swap(); return fadeOut(ctx, ctx.fx, t.out); });
    }
  };

  // Runs one transition. ctx needs view, fx, from, to; swap/back/source/target/toName are optional.
  function run(id, ctx) {
    ctx.live = ctx.live || [];
    ctx.stops = ctx.stops || [];
    if (!ctx.swap) ctx.swap = function () { ctx.from.hidden = true; ctx.to.hidden = false; };
    var once = false, swap = ctx.swap;
    ctx.swap = function () { if (!once) { once = true; swap(); if (ctx.to && ctx.to.style) ctx.to.style.visibility = ''; } };
    var fn = FX[id] || FX.instant;
    var end = function () {
      ctx.swap();
      ctx.live.forEach(function (a) { a.cancel(); });
      ctx.stops.forEach(function (f) { f(); });
      ctx.live = []; ctx.stops = [];
      if (ctx.fx) ctx.fx.textContent = '';
    };
    return fn(ctx).then(end, end);
  }

  // ── Demo wiring ────────────────────────────────────────────────────────
  var uid = 0;
  function wire(box) {
    var offs = [];
    var on = function (t, type, fn) { t.addEventListener(type, fn); offs.push(function () { t.removeEventListener(type, fn); }); };
    var q = function (s) { return box.querySelector(s); };
    var view = q('[data-ft-view]'), fx = q('[data-ft-fx]'), stage = q('[data-ft-stage]');
    var picker = q('[data-ft-picker]'), status = q('[data-ft-status]'), note = q('[data-ft-note]'), replay = q('[data-ft-replay]');
    if (!view || !fx || !stage) return function () {};
    if (fx.inert !== undefined) fx.inert = true;
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var page = function (id) { return q('[data-ft-page="' + id + '"]'); };
    var current = 'home';
    ['home', 'work', 'case'].forEach(function (id) { if (page(id) && !page(id).hidden) current = id; });
    var selected = box.getAttribute('data-transition') || 'columns';
    var slug = '01', busy = false, last = null, active = null;
    var info = function (id) { return LIST.filter(function (x) { return x.id === id; })[0] || LIST[0]; };
    var label = function (id) { var p = page(id), h = p && titleOf(p); return id === 'case' ? 'Caso ' + slug : (h ? (id === 'home' ? 'Home' : h.textContent) : id); };

    // Picker, built from LIST so names and durations live in one place.
    if (picker) {
      picker.querySelectorAll('.ft__opts').forEach(function (n) { n.remove(); });
      var opts = document.createElement('div');
      opts.className = 'ft__opts';
      var name = 'ft-' + (++uid), groupEl = null, groupId = null;
      LIST.forEach(function (x) {
        var parent = opts;
        if (x.group) {
          if (x.group !== groupId) {
            var gi = GROUPS[x.group], hid = name + '-' + x.group;
            groupEl = document.createElement('div');
            groupEl.className = 'ft__group';
            groupEl.setAttribute('role', 'group');
            groupEl.setAttribute('aria-labelledby', hid);
            groupEl.innerHTML = '<p class="ft__ghead"><span class="ft__gname" id="' + hid + '">' + gi.name + '</span><span class="ft__ghint">' + gi.hint + '</span></p>';
            opts.appendChild(groupEl);
          }
          parent = groupEl;
        }
        groupId = x.group || null;
        var l = document.createElement('label');
        l.className = 'ft__opt' + (x.out ? ' ft__opt--out' : '');
        l.innerHTML = '<input type="radio" name="' + name + '" value="' + x.id + '"' + (x.id === selected ? ' checked' : '') + '>' +
          '<span class="ft__n">' + x.n + '</span>' +
          '<span class="ft__name">' + x.name + (x.star ? ' <span aria-hidden="true">★</span><span class="ft__sr"> (recomendada)</span>' : '') + '</span>' +
          '<span class="ft__ms">' + x.ms + ' ms</span>' +
          (x.tag ? '<span class="ft__tag">' + x.tag + '</span>' : '');
        parent.appendChild(l);
      });
      picker.appendChild(opts);
      on(opts, 'change', function (e) { selected = e.target.value; render(); preview(); });
    }

    function render(msg) {
      var x = info(selected), reduce = mq.matches;
      if (status) status.textContent = (msg ? msg + ' · ' : '') + x.n + ' ' + x.name + ' · ' + (reduce ? '0 ms (reducir movimiento)' : x.ms + ' ms');
      if (note) {
        var t = reduce ? NOTE_REDUCE : selected === 'glitch' ? NOTE_GLITCH : '';
        note.textContent = t; note.hidden = !t;
      }
    }

    function setNav() {
      box.querySelectorAll('[data-ft-go]').forEach(function (a) {
        if (a.getAttribute('data-ft-go') === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    }

    function fillCase(s) {
      var src = q('[data-ft-page="work"] [data-ft-thumb="' + s + '"]') || q('[data-ft-thumb="' + s + '"]');
      if (!src) return;
      slug = s;
      var n = src.querySelector('[data-ft-name]') || src.querySelector('.ft__label span:last-child');
      var media = src.querySelector('.ft__media');
      var t = q('[data-ft-case-title]'), m = q('[data-ft-case-meta]'), hero = q('[data-ft-hero]');
      if (t) { t.textContent = n ? n.textContent : 'Caso ' + s; t.setAttribute('data-ft-text', t.textContent); }
      if (m) m.textContent = 'Caso ' + s + ' · 2026';
      if (hero && media) hero.style.setProperty('--g', media.style.getPropertyValue('--g'));
    }

    function jump(id, s) { // instant, no animation (used to replay)
      if (s) fillCase(s);
      ['home', 'work', 'case'].forEach(function (p) { if (page(p)) page(p).hidden = p !== id; });
      current = id; setNav();
    }

    function go(id, o) {
      o = o || {};
      if (busy || !page(id)) return;
      if (id === current) return;
      var nextSlug = o.slug || slug;
      var fromId = current, fromSlug = slug, from = page(fromId), to = page(id);
      var srcThumb = o.thumb ? o.thumb.querySelector('.ft__media') : null;
      if (fromId === 'case' && id !== 'case') srcThumb = q('[data-ft-hero]');
      last = { from: fromId, to: id, slug: nextSlug, fromSlug: fromSlug, thumbSlug: o.thumb ? nextSlug : null };
      if (id === 'case') fillCase(nextSlug);
      var useId = mq.matches ? 'instant' : selected;
      busy = true;
      stage.setAttribute('aria-busy', 'true');
      var ctx = active = {
        view: view, fx: fx, from: from, to: to,
        back: ORDER[id] < ORDER[fromId],
        toName: label(id),
        source: srcThumb,
        target: function () {
          if (id === 'case') return q('[data-ft-hero]');
          var th = to.querySelector('[data-ft-thumb="' + fromSlug + '"] .ft__media');
          return th;
        }
      };
      return run(useId, ctx).then(function () {
        active = null; busy = false;
        stage.removeAttribute('aria-busy');
        current = id; setNav();
        render(useId === 'morph' && ctx.fallback ? 'Página: ' + label(id) + ' · fundido' : 'Página: ' + label(id));
        if (note && useId === 'morph' && ctx.fallback) { note.textContent = NOTE_MORPH_FALLBACK; note.hidden = false; }
        if (o.focus) { var h = titleOf(to); if (h) h.focus({ preventScroll: true }); }
      });
    }

    // Plays a representative navigation for the selected transition.
    function preview() {
      if (busy) return;
      if (selected === 'morph') {
        if (current === 'case') return go('work');
        if (current !== 'work') jump('work');
        var th = q('[data-ft-page="work"] [data-ft-thumb="' + slug + '"]');
        return go('case', { slug: slug, thumb: th });
      }
      go(current === 'work' ? 'home' : 'work');
    }

    // Replays the last navigation from the same starting point.
    function again() {
      if (busy) return;
      if (!last) return preview();
      var l = last;
      jump(l.from, l.fromSlug);
      var th = l.thumbSlug ? q('[data-ft-page="' + l.from + '"] [data-ft-thumb="' + l.thumbSlug + '"]') : null;
      go(l.to, { slug: l.slug, thumb: th });
    }

    on(stage, 'click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a || !stage.contains(a)) return;
      e.preventDefault();
      var thumb = a.closest('[data-ft-thumb]');
      if (thumb) return go('case', { slug: thumb.getAttribute('data-ft-thumb'), thumb: thumb, focus: true });
      var to = a.getAttribute('data-ft-go');
      if (to) go(to, { focus: true });
    });
    if (replay) on(replay, 'click', again);
    var onMq = function () { render(); };
    if (mq.addEventListener) { mq.addEventListener('change', onMq); offs.push(function () { mq.removeEventListener('change', onMq); }); }

    fillCase(slug); setNav(); render();

    return function () {
      offs.forEach(function (f) { f(); });
      if (active) { active.live.forEach(function (a) { a.cancel(); }); active.stops.forEach(function (f) { f(); }); }
      fx.textContent = '';
      if (picker) picker.querySelectorAll('.ft__opts').forEach(function (n) { n.remove(); });
    };
  }

  function fresnoTransitions(root) {
    root = root || document;
    var list = [];
    if (root.matches && root.matches('[data-ft]')) list.push(root);
    root.querySelectorAll('[data-ft]').forEach(function (b) { list.push(b); });
    var cleanups = list.map(wire);
    return function () { cleanups.forEach(function (f) { f(); }); };
  }

  fresnoTransitions.run = run;
  fresnoTransitions.list = LIST;
  fresnoTransitions.timings = T;
  global.fresnoTransitions = fresnoTransitions;
  var me = document.currentScript;
  if (!(me && me.hasAttribute('data-manual'))) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { fresnoTransitions(); });
    else fresnoTransitions();
  }
})(window);
