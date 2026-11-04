# juancfresno.vercel.app

Personal portfolio for Juan C. Fresno, deployed at juancfresno.vercel.app.

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript.
- Package manager: npm (`package-lock.json`).
- Fonts: Geist Mono (`geist/font/mono`) for UI text, Switzer (self-hosted via `next/font/local`, files in `src/fonts/switzer/`) for body text.
- `@vercel/analytics` wired into the root layout (`<Analytics />` in `src/app/layout.tsx`).

## Routing (App Router, route group `(site)`) — v2 (branch `web-v2`)

All real pages live under `src/app/(site)/`. Copy lives in **one file**, `src/content/site.ts`; pages only lay it out. Placeholder copy renders a dashed `<Pending />` tag so gaps are visible on the preview.

| Route | File | Notes |
|---|---|---|
| `/` | `(site)/page.tsx` | One line + 3 featured cases + short index + Lab teaser + clients + contact. |
| `/projects` | `(site)/projects/page.tsx` | Full index (year, name, studio, discipline). |
| `/projects/[slug]` | `(site)/projects/[slug]/page.tsx` | Case template (ficha, hard question, context, decisions, discarded, result, process, credits, next). Only projects with `caseStudy: true` are generated. |
| `/about` | `(site)/about/page.tsx` | Bio, modes of work with studios, services, studios, clients, tools. |
| `/contact` | `(site)/contact/page.tsx` | Light page; Nav/Footer render their light variant. No form. |
| `/playground` | `(site)/playground/page.tsx` | Lab: own products + experiments. |

`src/app/layout.tsx` renders the global `Nav` (top bar + mobile bottom tab bar) and `Footer` around `{children}`, inside `PageTransitionProvider` (owns the `navigate` seam). Shared page blocks live in `src/components/blocks/` (one `blocks.module.scss`).

Removed in v2: the old `/index2` home and its Instagram/Dribbble feed + cron, the coming-soon home, custom cursor, grain overlay, Lenis smooth scroll (native scroll for usability), the contact form and the placeholder galleries.

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

`public/FDS/index.html` is a **static, self-contained styleguide artifact** (owned by Diseño / FDS). It is not an npm package and no component in `src/` imports from it — this app does not consume FDS as a dependency, it just hosts the styleguide.

Since 2 Nov 2026 it is served at **https://fds.juancfresno.com** behind a password cover:

- `src/proxy.ts` — on host `fds.juancfresno.com`: no valid cookie → rewrite to `public/FDS/login.html` (cover); valid cookie → `/` serves `/FDS/index.html`, `/fds-tokens.css` serves `/FDS/fds-tokens.css`, `/logout` clears the cookie. On any other host, `/FDS` and `/FDS/*` redirect (308) to the subdomain, so there is no open copy.
- `src/app/api/fds-login/route.ts` — POST from the cover; sets the `fds_auth` cookie (HttpOnly, 30 days).
- `src/lib/fds-auth.ts` — cookie = HMAC-SHA256 of a fixed label keyed with the `FDS_PASSWORD` env var (Vercel, production + preview). Changing the password signs everyone out. No password set → nobody gets in.
- `public/FDS/fds-tokens.css` is generated from Figma (`01 · FDS — Foundations`), never edited by hand. The FDS changelog lives only in `index.html` (`CHANGELOG` array).
- DNS: `fds` CNAME → `987eb5c3be8f14af.vercel-dns-017.com` (same target as `www`) at cdmon (juancfresno.com nameservers).

`vercel.json` disables CDN caching for `/FDS/*` so updates show up immediately.
