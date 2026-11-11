Add one of the "Fresno Lab · 004 · Pixel entrances" effects to a hover preview in this project.

Source (no dependencies, MIT): https://juancfresno.com/lab/entradas-pixel
- pixels.js — fresnoPixels(root) builds the comparison demo; the effects themselves are the fragment shader `FS` (one `uMode` branch per variant) plus the timeline in `go()` / `tick()`
- pixels.css — demo styles, themed with the --fp-* variables

Variants (uMode): 0 twelve columns (reference), 1 fine bitmap (8×8 Bayer sweep), 2 depixelate (32 → 1 px, mipmapped blocks), 3 1-bit to colour, 4 from the cursor (radial, dithered blue edge), 5 CRT sweep.

What I want:
1. Ask me which variant, pixel size, duration and easing to use (the demo shows the values next to each card).
2. Find the component that shows the preview (a small video/image that appears on hover). Keep its media loading, positioning and accessibility as they are; replace only how it appears and disappears.
3. Port just the chosen branch of the shader. Use WebGL2 with one fullscreen triangle and the clip as a texture (video frames uploaded per frame, mipmaps for variant 2); keep a 2D-canvas fallback that does a plain fade.
4. Snap the cell size to device pixels: round(px × devicePixelRatio). Exit = the entry played backwards in time (p = ease(1 − t)); switching direction mid-way must stay continuous.
5. Respect prefers-reduced-motion: no animation, poster image only.
6. Map the colours (frame line, accent, 1-bit ink/paper) to this project's tokens; don't hardcode them if tokens exist.
Show me the diff before applying it.
