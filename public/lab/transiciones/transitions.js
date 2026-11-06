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
    slide: { dist: 60, out: 160, inn: 240 }
  };
  var c = T.columns;

  var LIST = [
    { id: 'instant', n: '01', name: 'Sin transición', star: true, ms: 0, tag: 'chrome quieto' },
    { id: 'columns', n: '02', name: 'Barrido 12 columnas', star: true, ms: (c.n - 1) * c.stagger + c.drop + (c.n - 1) * c.backStagger + c.back },
    { id: 'scramble', n: '03', name: 'Scramble del título', star: true, ms: T.scramble.out + T.scramble.decode },
    { id: 'morph', n: '04', name: 'Morph miniatura → hero', star: true, ms: T.morph.move, tag: 'al entrar en un caso' },
    { id: 'pixels', n: '05', name: 'Disolución en píxeles', ms: 2 * (T.pixels.spread + T.pixels.step) },
    { id: 'glitch', n: '06', name: 'Corte con glitch RGB', ms: T.glitch.dur, tag: '⚠ fotosensibilidad' },
    { id: 'curtain', n: '07', name: 'Cortina con clip-path', ms: T.curtain.up + T.curtain.hold + T.curtain.off, tag: 'cliché' },
    { id: 'zoom', n: '08', name: 'Zoom de portada', ms: T.zoom.out + T.zoom.inn },
    { id: 'words', n: '09', name: 'Titular palabra a palabra', ms: '≈ 600' },
    { id: 'slide', n: '10', name: 'Slide direccional', ms: T.slide.out + T.slide.inn, tag: 'inverso al volver' }
  ];

  var NOTE_REDUCE = 'Tienes activado «reducir movimiento»: todas las transiciones caen a instantáneo.';
  var NOTE_GLITCH = 'Aviso: unos 200 ms de franjas desplazadas. Si eres sensible a los destellos, sáltatela. Con «reducir movimiento» no se reproduce nunca.';
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
    }
  };

  // Runs one transition. ctx needs view, fx, from, to; swap/back/source/target/toName are optional.
  function run(id, ctx) {
    ctx.live = ctx.live || [];
    ctx.stops = ctx.stops || [];
    if (!ctx.swap) ctx.swap = function () { ctx.from.hidden = true; ctx.to.hidden = false; };
    var once = false, swap = ctx.swap;
    ctx.swap = function () { if (!once) { once = true; swap(); } };
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
      var name = 'ft-' + (++uid);
      LIST.forEach(function (x) {
        var l = document.createElement('label');
        l.className = 'ft__opt';
        l.innerHTML = '<input type="radio" name="' + name + '" value="' + x.id + '"' + (x.id === selected ? ' checked' : '') + '>' +
          '<span class="ft__n">' + x.n + '</span>' +
          '<span class="ft__name">' + x.name + (x.star ? ' <span aria-hidden="true">★</span><span class="ft__sr"> (recomendada)</span>' : '') + '</span>' +
          '<span class="ft__ms">' + x.ms + ' ms</span>' +
          (x.tag ? '<span class="ft__tag">' + x.tag + '</span>' : '');
        opts.appendChild(l);
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
  global.fresnoTransitions = fresnoTransitions;
  var me = document.currentScript;
  if (!(me && me.hasAttribute('data-manual'))) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { fresnoTransitions(); });
    else fresnoTransitions();
  }
})(window);
