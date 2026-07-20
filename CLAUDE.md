# juancfresno.vercel.app

Personal portfolio for Juan C. Fresno, deployed at juancfresno.vercel.app.

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript.
- Package manager: npm (`package-lock.json`).
- Fonts: Geist Mono (`geist/font/mono`) for UI text, Switzer (self-hosted via `next/font/local`, files in `src/fonts/switzer/`) for body text.
- `@vercel/analytics` wired into the root layout (`<Analytics />` in `src/app/layout.tsx`).

## Routing (App Router, route group `(site)`)

All real pages live under `src/app/(site)/` — the `(site)` segment doesn't add a URL prefix.

| Route | File | Notes |
|---|---|---|
| `/` | `src/app/(site)/page.tsx` | Current homepage — static "coming soon" page (`ComingSoon` component), built from Figma node `9:170`. |
| `/index2` | `src/app/(site)/index2/page.tsx` | The **previous** homepage (hero + Dribbble/Instagram feed, `HomeContent` component). Kept reachable but excluded from indexing/sitemap (`robots: {index:false}`) to avoid duplicate-content with `/`. |
| `/about` | `src/app/(site)/about/page.tsx` | |
| `/contact` | `src/app/(site)/contact/page.tsx` | Light-background page; `Nav`/`Footer` render their inverted "light" variant here (and on `/`). |
| `/playground` | `src/app/(site)/playground/page.tsx` | |
| `/projects`, `/projects/[slug]` | `src/app/(site)/projects/` | Project list + detail (detail page is a stub, no real data source yet). |
| `/api/cron/refresh-ig` | `src/app/api/cron/refresh-ig/route.ts` | Vercel cron (see `vercel.json`), refreshes the Instagram feed cache used by `/index2`. |

`src/app/layout.tsx` is the root layout — it always renders the global `Nav` and `Footer` components around `{children}`, plus `Grain`, `Cursor`, `SmoothScroll`, and `PageTransitionProvider` (the pixel-dissolve page transition + initial `LoadingScreen`).

**Home-specific chrome:** `Nav` and `Footer` both branch on `pathname === '/'` to render a reduced "home" variant (wordmark + face icon only, no link menu, no footer social row — see the Figma header/footer for `/`) instead of the full site chrome used everywhere else.

## Styling system

**CSS Modules + SCSS** — no Tailwind, no CSS-in-JS. Every component's styles live in a sibling `Component.module.scss` file.

- `src/styles/_variables.scss` — design tokens ($color-*, $font-*, $space-*, $fs-* fluid type scale, breakpoints, motion durations/easings, z-index scale).
- `src/styles/_mixins.scss` — `respond-to()`/`respond-min()` breakpoint mixins, layout/typography/visual helpers.
- `src/styles/globals.scss` — resets, custom scrollbar, selection color, Lenis smooth-scroll classes.
- Import convention: `@use '../../styles/variables' as *;` (relative path depth depends on component location) — no path alias in Sass, only in TS (`@/*` → `src/*` in `tsconfig.json`).
- Page-local color overrides (e.g. a light-background page on an otherwise dark-themed site) are declared as `$_`-prefixed local Sass variables inside that component's own module file rather than polluting the global tokens (see `ContactForm.module.scss`, `ComingSoon.module.scss`).

## ElasticLine

`src/components/ui/ElasticLine/ElasticLine.tsx` — an interactive divider: an SVG line that deforms toward the cursor with spring physics on hover/proximity and eases back on release (rAF-driven, no dependencies). Renders `stroke="currentColor"`, so its color is set by the parent's `color` CSS property.

This is the **only** divider implementation in the app — every horizontal rule in the UI (nav bottom border, footer top border, home hero dividers) is an `<ElasticLine />`, never a static `<hr>`. Reuse it for any new divider rather than adding a plain line.

## Figma

The `/` homepage (and its home-specific Nav/Footer chrome) was rebuilt 1:1 from Figma:

- File key: `0ycaVZcPchp6EejZFSBRt1` ("Portfolio")
- Source node: `9:170` ("Home" frame)

Design tokens pulled from that file (colors, spacing, type scale) are documented inline as comments in `ComingSoon.module.scss` and `Footer.module.scss`. Assets (reel photo, decorative pixel glyph) were downloaded from Figma's export URLs and committed locally under `public/images/` and `public/icons/` — Figma's asset URLs are short-lived, so nothing in the app references them directly.

## Fresno Design System (FDS)

`public/FDS/index.html` is a **static, self-contained styleguide artifact** served at `/FDS`. It is not an npm package and no component in `src/` imports from it — this app does not consume FDS as a dependency, it just hosts a copy of the styleguide page for reference. `vercel.json` disables CDN caching for `/FDS/*` so updates to that static file show up immediately.
