# Panel Fresno → FDS theme v1 · handoff

Owner: FDS (Diseño) → Operaciones (Sistema) applies it to code.
Rule: visual only. No changes to structure, views, data or app.js.

## Files

| File | URL | Role |
|---|---|---|
| fds-tokens.css | https://juancfresno.vercel.app/FDS/fds-tokens.css | FDS tokens v1.2.0 (Brand Fresno, Light/Dark). Source: Figma `01 · FDS — Foundations`. Do not edit. |
| fds-panel.css | https://juancfresno.vercel.app/FDS/panel/fds-panel.css | Maps the Panel's alias layer (`--bg`, `--ink`, `--accent`…) to FDS tokens. No hex values. |

Copy both into the Panel root (do not hot-link: the Panel CSP is `'self'`).

## 1. index.html — `<head>`

Replace the current Google Fonts link and stylesheets with:

```html
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400&family=Instrument+Serif:ital@0;1&display=swap">
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=switzer@300,400&display=swap">
<link rel="stylesheet" href="/fds-tokens.css?v=1">
<link rel="stylesheet" href="/app.css?v=1">
<link rel="stylesheet" href="/views.css?v=2">
<link rel="stylesheet" href="/fds-panel.css?v=1">
```

Remove the two `@import` lines at the top of `fds-tokens.css` (fonts load from `<head>`).

theme-color:

```html
<meta name="theme-color" content="#e2e2d6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#242625" media="(prefers-color-scheme: dark)">
```

## 2. vercel.json — CSP

Switzer is served by Fontshare. In `Content-Security-Policy`:

- `style-src`: add `https://api.fontshare.com`
- `font-src`: add `https://cdn.fontshare.com`

Without this Switzer is blocked and the Panel falls back to the system sans.

## 3. Service worker

Add `/fds-tokens.css?v=1` and `/fds-panel.css?v=1` to `SHELL` in `sw.js` and bump the cache name (`panel-v5`).

## 4. Icons

The PNG icons are generated at build time by `make-icons.js`. Keep them as they are — the icon is a brand decision for Juan, not part of this theme.

## What the theme does

- Type: Switzer Regular for reading text and headings; Geist Mono uppercase for nav, labels, table heads and numbers. No bold — hierarchy by size and color.
- Color: FDS neutrals; brand blue only on the primary action (`.btn.pri`, active timer). Selected nav/pills use the inverse surface.
- Radius, focus ring, checkbox, chips and toast from FDS component tokens.

## Don't

- No new hex in app.css / views.css. Need a color → it is an FDS token or a request to FDS.
- Don't use the primary blue for text or borders.

## Known gaps (tracked in FDS)

- Space hues (`--sp-*`) are not FDS tokens yet (categorical data palette).
- `.tl-bar{color:#fff}` hardcoded in app.css.
- `manifest.webmanifest` theme/background colors.

## Next

Screen-by-screen redesign in Figma (`Panel Fresno — Control`, page «Patterns del Panel» → «Pantallas»). Each approved screen comes with its own handoff task for Operaciones.
