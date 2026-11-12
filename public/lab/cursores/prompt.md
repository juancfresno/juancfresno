Add one of the "Fresno Lab · 005 · Cursors" custom cursors to this project.

Source (no dependencies, MIT): https://juancfresno.com/lab/cursores
- cursors.js — fresnoCursors(root) builds the comparison demo; each cursor is one entry in `IMPL` (ring, pixel, cross, blend, speed, label, neg) with `build()` and `frame()`; the shared spring, velocity and state resolution live in `wire()` / `step()`
- cursors.css — demo and cursor styles, themed with the --fc-* variables

Variants: 01 dot + ring (pill morph), 02 pixel bitmap (Bayer dissolve), 03 crosshair on the 24-col grid (brackets snap to boxes), 04 difference blob, 05 velocity RGB split, 06 label only (scramble), 07 label negative (difference box, knocked-out text).

What I want:
1. Ask me which variant, lag and size to use.
2. Port only that variant as one small client component mounted once in the root layout: a fixed, pointer-events: none layer, one requestAnimationFrame loop that sleeps at rest, per-frame updates on transform and opacity only.
3. Context comes from the markup: data-cursor="link | view | drag | play | copy | text" plus optional data-cursor-label, found with closest() from the pointer target. Add those attributes to the real elements (nav links, case covers, galleries that drag, videos, the copy-email button, body text); don't change their behaviour.
4. Hide the native cursor only under (hover: hover) and (pointer: fine), and only while the custom one is mounted; touch and coarse pointers keep theirs and get no custom cursor.
5. prefers-reduced-motion: no lag, no trails, no scramble (snap). Keyboard focus and focus rings stay untouched; hide the cursor on page transitions and when the pointer leaves the window.
6. Map the colours to this project's tokens; don't hardcode them if tokens exist.
Show me the diff before applying it.
