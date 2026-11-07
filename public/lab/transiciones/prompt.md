Add page transitions to this project, based on "Fresno Lab · 002 · Transitions".

Source (no dependencies, MIT): https://juancfresno.com/lab/transiciones
- transitions.js — fresnoTransitions.run(id, ctx) runs one transition between two page elements (ctx: view, fx overlay, from, to, swap, back, source, target). The twenty-two ids: instant, columns, scramble, morph, pixels, glitch, curtain, zoom, words, slide; the grid explorations wireframe, modular, fold, cells, blueprint, step; and the wireframe variants wf-drop (grid lines fall in, gutters open, columns fill, then the boxes morph), wf-rise, wf-boxes, wf-labels, wf-hold, wf-base. The grid ones read the page's 12-column grid: margin = page padding, gutter = grid gap.
- transitions.css — the overlay pieces (.ft__fx, .ft__col, .ft__px, .ft__ghost, .ft__curtain, and the grid layers .ft__gfx, .ft__gl, .ft__gfill, .ft__wf, .ft__mod, .ft__slice, .ft__cell, .ft__band) and the --ft-* color variables (--ft-accent colors the visible grid).

What I want:
1. Base: no transition. Content swaps instantly; nav, header and footer live in the persistent layout and never move or re-render.
2. Entering a case (thumbnail → case page): morph the thumbnail into the case hero while the rest fades, ~420 ms. If the stack supports View Transitions (React ≥ 19.3 <ViewTransition name share="morph">, or document.startViewTransition), use that; otherwise port the FLIP "morph" from transitions.js. No morph on other navigations.
3. Signature, only between top-level sections: the 12-column wipe (columns drop with a 30 ms stagger, cover, swap the route while covered, retract; under 700 ms total), then the title scramble on the new page's h1. Columns must line up with this project's grid if it has one.
4. Hook it into the router's navigation (cover → push → reveal), not into each page. Browser back/forward may stay instant.
5. Accessibility: under prefers-reduced-motion everything is instant. After each navigation move focus to the new h1 (preventScroll) and keep its real text in the DOM/aria-label while it scrambles. Don't block clicks for longer than the transition.
6. Map the --ft-* variables (or the overlay color) to this project's color tokens so it follows its theme. Don't hardcode colors.
7. Don't add the glitch or curtain transitions unless I ask; glitch is a photosensitivity risk and must never run under reduced motion.
Match the project's stack (React/Vue/Svelte → a small provider/hook with cleanup) and show me the plan before touching the router.
