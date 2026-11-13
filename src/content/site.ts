// ─── Site content ─────────────────────────────────────────────────────────────
// Locale-neutral data (socials, clips, lab files) + getSite(locale), the
// entry point to the copy. The copy itself lives per language in
// i18n/site.en.ts and i18n/site.es.ts (same shape, SiteDict), UI strings in
// i18n/ui.*.ts (getUi). Source of the English copy: copy-web-v1.md; of the
// Spanish: copy-web-v1-es.md.
import type { Locale } from '@/i18n/config'
import { SITE_EN, type SiteDict } from './i18n/site.en'
import { SITE_ES } from './i18n/site.es'
export { getUi, type UiDict } from './ui'

export { PERSON_BASE } from './person'

export { SOCIALS, SOCIAL_PREVIEWS, type SocialId, type PreviewId } from './socials'

// Lab experiment files (public/lab/<slug>/): css, js, snippet.html, prompt.md.
// `init` = global init fn: window[init](root) → cleanup. `repo` = public
// GitHub folder, once the repo exists.
// `demo: 'react'` = the piece is built from this site's own components (no
// public files, no copy-code block): 006 Carruseles = home/LatestFeed, all three.
export type ExperimentFiles =
  | { demo?: 'static'; css: string; js: string; init: string; files: string[]; repo: string | null }
  | { demo: 'react'; repo: string | null }
export const EXPERIMENT_FILES: Record<string, ExperimentFiles> = {
  botones: { css: 'buttons.css', js: 'buttons.js', init: 'fresnoButtons', files: ['buttons.css', 'buttons.js', 'snippet.html'], repo: null },
  transiciones: { css: 'transitions.css', js: 'transitions.js', init: 'fresnoTransitions', files: ['transitions.css', 'transitions.js', 'snippet.html'], repo: null },
  galerias: { css: 'galleries.css', js: 'galleries.js', init: 'fresnoGalleries', files: ['galleries.css', 'galleries.js', 'snippet.html'], repo: null },
  'entradas-pixel': { css: 'pixels.css', js: 'pixels.js', init: 'fresnoPixels', files: ['pixels.css', 'pixels.js', 'snippet.html'], repo: null },
  cursores: { css: 'cursors.css', js: 'cursors.js', init: 'fresnoCursors', files: ['cursors.css', 'cursors.js', 'snippet.html'], repo: null },
  carruseles: { demo: 'react', repo: null },
}

const SITES: Record<Locale, SiteDict> = { en: SITE_EN, es: SITE_ES }

const built = new Map<Locale, ReturnType<typeof build>>()
function build(l: Locale) {
  const d = SITES[l]
  return { ...d, EXPERIMENTS: d.EXPERIMENTS.map((e) => ({ ...e, ...EXPERIMENT_FILES[e.slug] })) }
}

// All page copy for a locale (EXPERIMENTS merged with their files).
export function getSite(l: Locale) {
  let s = built.get(l)
  if (!s) built.set(l, (s = build(l)))
  return s
}
export type Site = ReturnType<typeof getSite>

export type { SiteDict }

// Slugs of the lab experiments (same in every language).
export const EXPERIMENT_SLUGS = Object.keys(EXPERIMENT_FILES)
