# juancfresno.vercel.app

Personal portfolio for Juan C. Fresno, deployed at juancfresno.vercel.app.

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript.
- Package manager: npm (`package-lock.json`).
- Fonts: Geist Mono (`geist/font/mono`) for UI text, Switzer (self-hosted via `next/font/local`, files in `src/fonts/switzer/`) for body text.
- `@vercel/analytics` wired into the root layout (`<Analytics />` in `src/app/layout.tsx`).

## Routing (App Router, route group `(site)`) — v2 (branch `web-v2`)

All real pages live under `src/app/(site)/`. Pages only lay content out; copy lives in `src/content/`:

- `site.ts` — person, socials, home hero (`HOME`), page intros (`INTROS`), Lab (`LAB`, `EXPERIMENTS`), About (`ABOUT`), contact.
- `cases.ts` — the Work data model: `PROJECTS` (index rows, newest first; `nda`, `caseStudy`, `featured`), `CASES` (copy and Behance stats per case, from each "Caso · …" frame in Figma ↪ Casos; `notes` = annotations over the image block), `ARCHIVE` (compact list), helpers `toRow`, `caseMedia`, `projectNumber`, `CASE_PROJECTS`.
- `feed.ts` — feed items + `groupFeed()` (sessions of the same project within 60 days; the rest in "Sueltos").
- `generated/cases-media.json`, `generated/feed.json` — image paths and sizes, written by `scripts/build-media.mjs`. Do not edit by hand.

Placeholder copy renders a dashed `<Pending />` tag so gaps are visible on the preview.

| Route | File | Notes |
|---|---|---|
| `/` | `(site)/page.tsx` | Figma "Home · v0". Hero, featured cases as an index with floating cursor preview, links to `/work` and `/work#archivo`, latest 7 feed pieces, Lab rows, contact. |
| `/work` | `(site)/work/page.tsx` | Figma "Work · v0". Index (Nº · proyecto · disciplina · cliente/estudio · año) with floating preview; NDA rows blurred with a pill, no link. Lista / Portadas toggle (`?view=portadas`, remembered in `localStorage['work:view']`). `#archivo` section at the end. `/projects` redirects here. |
| `/work/[slug]` | `(site)/work/[slug]/page.tsx` | Case template ("Caso · Shoeciety · Rediseño" + "· v0"): case header, question, context, decisions, ONE continuous image block (`components/case/CaseBlock`: Behance order, content width, gap 0, intrinsic ratio, no captions), result (Behance stats), credits, next case. `Notas: ON/OFF` when the case has `notes` (Shoeciety; hidden under 900px). Only `caseStudy: true` with an entry in `CASES` is generated (`dynamicParams = false`). |
| `/about` | `(site)/about/page.tsx` | Figma "About · Desktop": bio, services + photos (`public/images/about/`), studios and brands, process, experience, dossier (pending). |
| `/contact` | `(site)/contact/page.tsx` | Figma "Contact · Desktop": title line + shared `ContactBlock`. No form. |
| `/feed` | `(site)/feed/page.tsx` | Figma "Feed · Desktop". Dribbble + Instagram pieces minus duplicates and Biako; sessions; CSS-columns masonry 3/2/1; title + MM/AAAA inside each image; monochrome + 4×4 dither overlay at rest, colour on hover/focus. Each item opens the original post. |
| `/lab` | `(site)/lab/page.tsx` | Figma "Lab · Desktop". Experiments (001 Botones, 002 Transiciones: 22 options, 11–16 grid-based, 11a–11f variants of 11 Wireframe grouped as "Wireframe · variantes" (11a = Juan's idea: grid lines fall, gutters open, columns fill, then boxes morph; ★ 11a and 11d), 06 glitch ruled out because Biakone uses glitch; the mock stage uses the site grid (margin 64 / gutter 16 at 1680, liquid); files in `public/lab/<slug>/`, mirrored to github.com/juancfresno/fresno-lab → `/lab/[slug]`), own products with status, "Código abierto · GitHub" (pending until the repo is public). `/playground` redirects here. |
| `/journal` | `(site)/journal/page.tsx` | Writing. Placeholder (no Figma frame yet). |

Shared v0 blocks: `components/blocks/V0Section` (ElasticLine + mono `{ label ↘`) and `v0.module.scss` (page shell, intro line, segmented toggles, closing block); `components/work/HoverIndex` (index + floating preview; on touch/small screens each row shows a small fixed thumbnail instead).

**Media.** `node scripts/build-media.mjs` (needs the source folders, outside the repo: `CASES_DIR`, `FEED_DIR`, and `SHOE_DIR` for the Shoeciety originals exported from Figma) converts to WebP with sharp: cases max 1600px q80 into `public/work/<slug>/NN.webp` (+ `cover.webp`, 800px), feed max 900px q78 into `public/feed/<id>.webp`, plus `public/feed/_dither.png`. Image count and order per case match its "Behance · bloque" in Figma (Dinamo without its 12th image, Google without its 17th; GIFs as first frame). Pages use `next/image` with explicit sizes and `unoptimized`.

Nav (desktop and mobile bottom bar share `NAV_LINKS`): About · Work · Feed · Lab · Journal · Contact. The FRESNO wordmark is vertical in the top-right corner on every breakpoint and hangs over the header line (the header keeps its 72px height). Next to it: local time `VLC HH:MM CET/CEST` (`components/ui/NavClock`, Europe/Madrid, aria-hidden) and a `?` button.

**Social hover clips.** `components/ui/SocialPreview` (one global instance in `layout.tsx`) is ONE shared 256×160 preview for every link with `data-social="<id>"` (footer wordmarks via `GlitchSocialIcon social={id}`, `ContactBlock` text links via `SOCIALS[].id`). The clip is drawn on a `<canvas>`; the DOM only gets transform/opacity, one rAF loop. Entry: the clip drops in through 12 columns (16 ms stagger outwards from the column under the cursor, 210 ms each, orange scan line on each column's edge); exit: columns retract (9 ms / 140 ms). Moving to another network the same preview travels on a spring (k 380, ζ 0.62, slight overshoot), skews with its own velocity (≤ 9°) and swaps the clip with a Bayer-ordered pixel dissolve (240 ms, transition 05's pattern, front flashes in `--c-text`). Over a link it follows the cursor horizontally (65 % towards the cursor from the link centre) and sits anchored above the link row (below if there's no room), so it never covers the row; keyboard focus anchors it centred. Mono label chip under it: `BEHANCE ↗ @juancfresno · 03/05` (index within the row; handle from the link's URL), scrambles on change. Leaving a link waits 110 ms for the next one before hiding; Esc, blur, scroll, any outside click or a route change hides it. Files: `public/social/<id>.{webm,mp4,jpg}` (640×400, ~5 s loop, no audio); map in `SOCIAL_PREVIEWS` (`src/content/site.ts`). No bytes until the first hover (a network's video + poster load on its first activation and stay, in a hidden pool); touch / `hover: none` = nothing; reduced motion = poster only, no spring, skew, wipe, dissolve or scramble. Timings are the `T`/`SPRING` constants at the top of the file. To replace a clip: drop the three files in `public/social/` and keep its `SOCIAL_PREVIEWS` entry (a poster alone shows the still). Networks without an entry show nothing.

**Keyboard.** **G** toggles the layout grid overlay (`src/components/ui/GridOverlay`), **D** toggles the theme, **?** opens the shortcuts legend (`src/components/ui/Shortcuts`; Esc closes; the `?` button dispatches `fresno:shortcuts`), **M** (modes) shows "próximamente". All ignore keys typed in form fields.

**Themes.** Dark (default) and light. Colors are CSS custom properties (`--c-*`, defined in `globals.scss` under `:root` and `:root[data-theme="light"]`); the Sass `$color-*` tokens point at them, so never use `rgba($color-*, …)` — add a new `--c-*` var instead. v0 added `--c-text-hi` (heading tint), `--c-text-dim`, `--c-line`, `--c-line-hi`, `--c-overlay` (chips over images). Brand constants that must not change with the theme are `$raw-ink`, `$raw-pearl`, `$raw-chip` (the note cards and dots in case blocks use `$raw-chip`). `ThemeToggle` (`src/components/ui/ThemeToggle`) sits after the nav links (next to the face on mobile), saves to `localStorage.theme`; an inline script in `layout.tsx` applies the saved theme before paint. `THEMES` is a list so extra art-direction modes can be added later.

**Fonts in Figma vs code.** The Figma frames use Geist because the plugin can't load Switzer: Figma Geist (non-mono) → `$font-body` (Switzer), Geist Mono → `$font-mono`.

**Site transition.** `src/providers/PageTransition.tsx` owns `navigate` and runs the page transition: it catches same-origin left clicks on any `<a>`/`<Link>` (capture on `window`; skips modifier keys, `target`, `download`, `data-no-transition`, same-path hash/query links and file URLs), then cover → `router.push` → wait for the new pathname (hard cap 3 s) + 2 frames → reveal → focus the new `h1` (or `main`) with `preventScroll`. Back/forward covers at once and runs the effect mirrored; the provider keeps an in-memory pathname stack to tell back from forward. `prefers-reduced-motion` = instant. The effect lives in `src/components/transition/effects.ts`: one fixed `<canvas>` over the content area (top = bottom of `[data-site-header]`; z 15: above `main` (10), under the footer (20) and the nav/tab bar), so nav, wordmark, header line and footer never move. Current: `SITE_TRANSITION = 'wireframe-grid'` = Lab 002 option 11a "Cae la retícula" on the real pages: before navigating it collects up to 40 visible blocks in `<main>` (headings, paragraphs measured by their text, media, rows/cards/links as one box unless taller than half the screen) and labels them (`H1 · 40/46`, `P · 18`, `P · 11 MONO`, `IMG 16:9`, `ROW · 03`); 0–186 ms grid lines drop, 120–286 gutters split open, 190–355 columns fill, 300–390 the old page fades under outlined boxes → route change (the wireframe holds until the new page is there) → new blocks measured, boxes travel FLIP-style (230 ms + ≤ 28 ms stagger, labels re-type, extra boxes fade in/out) → 110 ms content shows and the grid fades. ≈ 750 ms + route wait. The grid is a hidden copy of the G overlay (`GridOverlay.module.scss`) measured live, so it is the real 12-col grid (64/16 at 1680, liquid, 4 cols ≤ 768). Grid in the G orange; boxes/labels from `--c-text`/`--c-bg`. `'pixels'` (Lab 05, 560 ms) and `'instant'` stay in `EFFECTS`; to switch, change that constant.

`src/app/layout.tsx` renders the global `Nav` (top bar + mobile bottom tab bar) and `Footer` around `{children}`, inside `PageTransitionProvider` (owns the `navigate` seam), plus `GridOverlay` and `Shortcuts`. Older shared page blocks live in `src/components/blocks/` (`blocks.module.scss`, `ContactBlock`, `Pending`, `Section`).

Removed in v2: the old `/index2` home and its Instagram/Dribbble feed + cron, the coming-soon home, custom cursor, grain overlay, Lenis smooth scroll (native scroll for usability), the contact form, the placeholder galleries and the placeholder cases (bbva, google, la-liga as fake case pages).

## Styling system

**CSS Modules + SCSS** — no Tailwind, no CSS-in-JS. Every component's styles live in a sibling `Component.module.scss` file.

- `src/styles/_variables.scss` — design tokens ($color-*, $font-*, $space-*, $fs-* fluid type scale, breakpoints, motion durations/easings, z-index scale).
- `src/styles/_mixins.scss` — `respond-to()`/`respond-min()` breakpoint mixins, layout/typography/visual helpers.
- `src/styles/globals.scss` — resets, custom scrollbar, selection color, Lenis smooth-scroll classes.
- Import convention: `@use '../../styles/variables' as *;` (relative path depth depends on component location) — no path alias in Sass, only in TS (`@/*` → `src/*` in `tsconfig.json`).

## ElasticLine

`src/components/ui/ElasticLine/ElasticLine.tsx` — an interactive divider: an SVG line that deforms toward the cursor with spring physics on hover/proximity and eases back on release (rAF-driven, no dependencies). Renders `stroke="currentColor"`, so its color is set by the parent's `color` CSS property.

This is the **only** divider implementation in the app — every horizontal rule in the UI (nav bottom border, footer top border, section rules in `V0Section` and the case modules) is an `<ElasticLine />`, never a static `<hr>`. Reuse it for any new divider rather than adding a plain line. Exception: the row separators inside tables/indexes (Work index, Lab and experience rows, feed session headers) are CSS borders, since dozens of animated lines per page would be heavy.

## Figma

v2 source: file `AXxkCCuckrXGKDUCk8lNyQ`, pages ↪ Visual (Home · v0, Work · v0, Feed · Desktop, Lab · Desktop, About · Desktop, Contact · Desktop, Caso · Shoeciety · Rediseño) and ↪ Casos (one "Caso · …" frame per case; "Caso · Shoeciety · v0" has the notes).

v1 (historic): the `/` homepage (and its home-specific Nav/Footer chrome) was rebuilt 1:1 from Figma:

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
