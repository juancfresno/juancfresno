/* Fresno Lab · 001 · Buttons — https://juancfresno.com/lab/botones
   fresnoButtons(root?) wires every .fb inside root and returns a cleanup function.
   Auto-runs on load unless the script tag has data-manual. MIT. */
(function (global) {
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/';

  function fresnoButtons(root) {
    root = root || document;
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var offs = [];
    var on = function (el, type, fn) { el.addEventListener(type, fn); offs.push(function () { el.removeEventListener(type, fn); }); };

    // Columns: inject the 12 fill columns once.
    root.querySelectorAll('.fb--cols').forEach(function (b) {
      if (b.querySelector('.fb__cols')) return;
      var w = document.createElement('span');
      w.className = 'fb__cols';
      w.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < 12; i++) { var c = document.createElement('span'); c.style.setProperty('--i', i); w.appendChild(c); }
      b.prepend(w);
    });

    if (reduce) return function () { offs.forEach(function (f) { f(); }); };

    // Magnet.
    root.querySelectorAll('.fb--magnet').forEach(function (b) {
      var label = b.querySelector('.fb__label');
      on(b, 'pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        b.style.transform = 'translate(' + x * 0.25 + 'px,' + y * 0.35 + 'px)';
        if (label) label.style.transform = 'translate(' + x * 0.12 + 'px,' + y * 0.18 + 'px)';
      });
      on(b, 'pointerleave', function () { b.style.transform = ''; if (label) label.style.transform = ''; });
      offs.push(function () { b.style.transform = ''; if (label) label.style.transform = ''; });
    });

    // Scramble.
    root.querySelectorAll('.fb--scramble').forEach(function (b) {
      var label = b.querySelector('.fb__label');
      if (!label) return;
      var text = label.textContent, raf = 0;
      b.setAttribute('aria-label', b.getAttribute('aria-label') || text);
      var run = function () {
        cancelAnimationFrame(raf);
        var start = performance.now();
        var tick = function (now) {
          var p = Math.min(1, (now - start) / 450), n = Math.floor(p * text.length);
          label.textContent = text.split('').map(function (ch, i) {
            return i < n || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }).join('');
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      };
      on(b, 'pointerenter', run);
      on(b, 'focus', run);
      offs.push(function () { cancelAnimationFrame(raf); label.textContent = text; });
    });

    return function () { offs.forEach(function (f) { f(); }); };
  }

  global.fresnoButtons = fresnoButtons;
  var me = document.currentScript;
  if (!(me && me.hasAttribute('data-manual'))) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { fresnoButtons(); });
    else fresnoButtons();
  }
})(window);
