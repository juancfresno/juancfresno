Add a gallery to this project, based on "Fresno Lab · 003 · Galleries".

Source (no dependencies, MIT): https://juancfresno.com/lab/galerias
- galleries.js — fresnoGalleries(root) wires every [data-fg] block and returns a cleanup. Eight layouts over one list of images ({ t: title, d: 'MM/YYYY', src, th: thumbnail, w, h, url }): arco (cards on a rotating drum, page scroll + drag, snaps to one), canvas (endless 2D plane that wraps both ways, capped inertia, minimap, "Rejilla" static-grid toggle), laminas (open grid with gaps; each image cut in 8 slats that slide in on scroll and shift with the cursor), tira (horizontal strip driven by vertical scroll, velocity skew/scale), mazo (draggable deck), rejilla (dense grid + FLIP zoom), barras (all pieces as date-ordered strips with a fisheye under the cursor), pasarela (cards standing on a perspective floor that bend with speed). One shared zoom (FLIP from the tile, ← → to browse, Esc / click outside / drag down to close).
- galleries.css — layout per view and the --fg-* variables (colors, --fg-gutter, --fg-top for a fixed header, --fg-accent for grid lines).

What I want: [say which layout and where, e.g. "the canvas for the /feed page and the arc for the home with 10 featured pieces"].
1. Port only the layouts I name, as a small component for this stack (React/Vue/Svelte → component + hook with cleanup). Keep one rAF loop per gallery that sleeps when idle, transforms/opacity only, and virtualize (only visible tiles exist).
2. Feed it with this project's real images and data (title, date, size, link); generate thumbnails (~600 px) for dense layouts and use full images only in the zoom and in large cards.
3. Keep the zoom: FLIP from the tile, focus trapped in the dialog, Esc closes, focus returns to the tile.
4. Accessibility: keyboard for every layout (arrows, Enter opens, Esc closes); under prefers-reduced-motion show the static grid; touch drag must work and must never block vertical page scroll except inside the canvas.
5. Map --fg-* to this project's color tokens and grid (columns, gutter, margin). Don't hardcode colors.
Show me the plan before writing code.
