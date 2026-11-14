// ─── Work: index, cases and archive ───────────────────────────────────────────
// Locale-neutral data model for /work (order, flags, media) + per-locale
// getters. The copy lives in i18n/cases.en.ts and i18n/cases.es.ts (WorkDict):
// index rows, archive and cases. Behance stats are gone from the site
// (decision 11). Images and their order: the "Behance · bloque" of each case
// frame; files are built by scripts/build-media.mjs into public/work/<slug>/.
import media from './generated/cases-media.json'
import { localePath, type Locale } from '@/i18n/config'
import { WORK_EN } from './i18n/cases.en'
import { WORK_ES } from './i18n/cases.es'
import { getUi } from './ui'

export type Img = { src: string; w: number; h: number }

export type Note = {
  title: string
  text: string
  // Coordinates in the Figma block (1552 px wide), top-left origin.
  dot: [number, number]
  end: [number, number]
  card: [number, number]
}

export type Case = {
  meta: string // "2018 · Personal project"
  title: string // big title on the case page (may differ from the index name)
  chips: string[] // disciplines, under the title
  lead: string // one-sentence description (also the meta description)
  // Ficha: Client · Via · Year · Role (+ Team). `via` only when it came through
  // a studio; `role: null` renders <Pending />.
  ficha: { client: string; via?: string; year: string; role: string | null; team?: string }
  question?: string
  context?: { lead: string; text: string }
  decisions?: { title: string; text: string }[]
  hindsight: string | null // Juan writes it; null renders the guideline + <Pending />
  // Context and decisions render only when the copy doc approves them for this
  // locale (English v1.0: only Shoeciety). The rest keep a draft, hidden.
  copyEn?: boolean
  credits: string // kept from the copy doc; the page renders creditsLine()
  recognition?: string
  live?: string // "Live site ↗" only when there is something live to see
  draft?: boolean
  behance?: string
  notes?: { blockHeight: number; items: Note[] }
}

// Neutral row data; the visible text (name, discipline, client) is per locale.
type ProjectBase = {
  slug: string
  year: string
  nda?: boolean
  caseStudy?: boolean
  featured?: boolean
  personal?: boolean // personal project: credits say so instead of Client
  unlisted?: boolean // not in the Figma list: hidden everywhere, like NDA rows
  // How /work opens this case (neutral, same in every language):
  //   'drawer' — side drawer (long cases); 'expand' — in place under its row.
  // Unset = by length: 'expand' when the case has <= EXPAND_MAX_IMAGES images
  // in caseMedia, else 'drawer'. To force one, add `open: 'expand'` (or
  // 'drawer') to its row in ALL_PROJECTS below, e.g. after cutting images.
  open?: 'drawer' | 'expand'
}
export type OpenKind = 'drawer' | 'expand'
export const EXPAND_MAX_IMAGES = 6
export const openKind = (p: { open?: OpenKind }, imageCount: number): OpenKind =>
  p.open ?? (imageCount <= EXPAND_MAX_IMAGES ? 'expand' : 'drawer')
// `listName` / `listVia`: what the /work list prints when it differs from the
// index name or the ficha (Figma rows: "15 Bodegas · Website", via "Various").
export type ProjectCopy = { name: string; discipline: string; client: string /* client / studio column */; listName?: string; listVia?: string }
export type Project = ProjectBase & ProjectCopy

const M0 = media as Record<string, { cover: Img; images: Img[] }>
// Images a case leaves out, by file number (public/work/<slug>/NN.webp): the
// "Behance · bloque" of each frame in Figma "v1 · Casos" (6891:1517, 14 Nov
// 2026) no longer has them. The files stay on disk; rebuild-safe (by number).
const DROP_IMAGES: Record<string, number[]> = {
  'signflow': [1],
  'access': [1],
  'educa-projects': [1],
  'likitech': [1],
  'awen': [8],
  'casa-carbon': [6, 7, 14, 28, 32],
  'google': [3],
  'bunkr-branding': [1, 2, 4, 6],
  'roadis': [17],
  'icommunity': [2],
  'drip': [1],
}
const fileNo = (src: string) => Number(src.slice(src.lastIndexOf('/') + 1, src.lastIndexOf('.')))
const M: typeof M0 = Object.fromEntries(
  Object.entries(M0).map(([slug, m]) => {
    const drop = DROP_IMAGES[slug]
    return [slug, drop ? { ...m, images: m.images.filter((im) => !drop.includes(fileNo(im.src))) } : m]
  }),
)
export const caseMedia = (slug: string) => M[slug]

// NDA rows don't match the invoices yet (copy doc, question 3): kept in the
// data, hidden until Juan confirms them.
export const SHOW_NDA = false

// ─── Index (Work · v0, newest first) ──────────────────────────────────────────
// Order = the Figma list, row by row ("work" 6951:13221 · 03 · Archive, 14 Nov
// 2026; the same order as the frames in "v1 · Casos" 6891:1517): 28 cases.
// Figma rules here: to reorder, move the row in Figma and then in this array.
// NDA rows sit by year (hidden). Numbers, Next links and projectTotal() follow
// this array.
// Home selections (Arco, short index) are ARCO / FEATURED below.
const ALL_PROJECTS = [
  { slug: 'signflow', year: '2026', caseStudy: true, featured: true },
  { slug: 'drip', year: '2026', caseStudy: true },
  { slug: 'access', year: '2024—2025', caseStudy: true },
  { slug: 'educa-projects', year: '2024—2025', caseStudy: true },
  { slug: 'wubalu', year: '2025', caseStudy: true },
  { slug: 'nda-banca', year: '2024', nda: true },
  { slug: 'bonamar', year: '2024', caseStudy: true },
  { slug: 'awen', year: '2024', caseStudy: true },
  { slug: 'dinamo', year: '2024', caseStudy: true, featured: true },
  { slug: 'likitech', year: '2023—2024', caseStudy: true, featured: true },
  { slug: 'entradium', year: '2023—2024', caseStudy: true },
  { slug: 'correos', year: '2024', caseStudy: true },
  { slug: 'selected-logos', year: '2024', caseStudy: true },
  { slug: 'workout-app', year: '2023', caseStudy: true },
  { slug: 'casa-carbon', year: '2022', caseStudy: true, featured: true },
  { slug: 'nda-moda', year: '2022', nda: true },
  { slug: 'nda-energia', year: '2021', nda: true },
  { slug: '15-bodegas-web', year: '2021', caseStudy: true },
  { slug: '15-bodegas-branding', year: '2021', caseStudy: true },
  { slug: 'bunkr-app', year: '2020', caseStudy: true },
  { slug: 'dior-backstage', year: '2020', caseStudy: true },
  { slug: 'hm', year: '2020', caseStudy: true },
  { slug: 'roadis', year: '2019—2020', caseStudy: true },
  { slug: 'bunkr-branding', year: '2019', caseStudy: true },
  { slug: 'murmur', year: '2019', caseStudy: true },
  { slug: 'icommunity', year: '2018', caseStudy: true },
  { slug: 'erare', year: '2018', caseStudy: true },
  { slug: 'shoeciety', year: '2018', caseStudy: true, featured: true, personal: true },
  { slug: 'push-for-burger', year: '2018', caseStudy: true },
  { slug: 'super-nintendo', year: '2016', caseStudy: true, personal: true },
  { slug: 'google', year: '2016', caseStudy: true, featured: true, personal: true },
  // Not in the Figma list or in "v1 · Casos" (14 Nov 2026): kept in the data,
  // off the site (no row, no case page, no number) while `unlisted`.
  { slug: 'madrid-buildings', year: '2016', caseStudy: true, personal: true, unlisted: true },
  { slug: 'biako-poster', year: '2024', caseStudy: true, personal: true, unlisted: true },
] as const satisfies readonly ProjectBase[]

export type ProjectSlug = (typeof ALL_PROJECTS)[number]['slug']
export type CaseSlug = Extract<(typeof ALL_PROJECTS)[number], { caseStudy: true }>['slug']

export type ArchiveRow = { project: string; via: string; category: string; role: string; year: string; nda?: boolean; viaUnconfirmed?: boolean }
export const ARCHIVE_CATEGORY_DRAFT = true

const WORK = { en: WORK_EN, es: WORK_ES }

const VISIBLE: readonly ProjectBase[] = ALL_PROJECTS.filter((p) => (SHOW_NDA || !('nda' in p && p.nda)) && !('unlisted' in p && p.unlisted))
const CASE_SLUGS = VISIBLE.filter((p) => p.caseStudy && p.slug in WORK_EN.CASES).map((p) => p.slug)

// Visible index rows for a locale (NDA rows hidden while SHOW_NDA = false).
export const getProjects = (l: Locale): Project[] => VISIBLE.map((p) => ({ ...p, ...WORK[l].PROJECTS[p.slug as ProjectSlug] }))
export const getCases = (l: Locale): Record<string, Case> => WORK[l].CASES as Record<string, Case>
export const getArchive = (l: Locale): ArchiveRow[] => WORK[l].ARCHIVE
// Projects with a case page (same slugs in every language).
export const getCaseProjects = (l: Locale) => getProjects(l).filter((p) => CASE_SLUGS.includes(p.slug))
export const CASE_PROJECT_SLUGS = CASE_SLUGS
export const isPersonal = (slug: string) => !!VISIBLE.find((p) => p.slug === slug)?.personal

// Credits line (Figma v1.0, decision 9): uniform format built from the ficha.
export const creditsLine = (l: Locale, slug: string, c: Case) => {
  const t = getUi(l).case
  const parts = [`${t.cDesign}: Juan C. Fresno`]
  // Personal projects: "Personal project" (or the ficha client when it extends
  // it, e.g. "Personal project · Biako").
  if (isPersonal(slug)) parts.push(c.ficha.client.startsWith(t.cPersonal) ? c.ficha.client : t.cPersonal)
  else {
    if (c.ficha.via) parts.push(`${t.cStudio}: ${c.ficha.via}`)
    parts.push(`${t.cClient}: ${c.ficha.client}`)
  }
  parts.push(c.ficha.year)
  return parts.join(' · ') + (c.recognition ? ` · ${c.recognition}` : '')
}

// Home (Figma Home v1.0, 6882:437): the Arco shows 7 cases with Shoeciety
// centred (ARCO_START), and a 5-row short index under it.
const bySlug = (l: Locale, slugs: string[]) => {
  const all = getProjects(l)
  return slugs.map((sl) => all.find((p) => p.slug === sl)).filter((p): p is Project => !!p && !!getCases(l)[p.slug])
}
export const getArco = (l: Locale) => bySlug(l, ['signflow', 'likitech', 'casa-carbon', 'shoeciety', 'dinamo', 'google', 'super-nintendo'])
export const ARCO_START = 3
export const getFeatured = (l: Locale) => bySlug(l, ['signflow', 'likitech', 'dinamo', 'casa-carbon', 'shoeciety'])
const pad = (n: number) => String(n).padStart(2, '0')
// Numbers follow the visible index (hidden NDA rows leave no gaps).
export const projectNumber = (slug: string) => pad(VISIBLE.findIndex((p) => p.slug === slug) + 1)
export const projectTotal = () => pad(VISIBLE.length)

// Rows for the index/hover components.
export const toRow = (l: Locale, p: Project) => ({
  key: p.slug,
  n: projectNumber(p.slug),
  name: p.name,
  discipline: p.discipline,
  client: p.client,
  year: p.year,
  nda: p.nda,
  href: p.caseStudy && getCases(l)[p.slug] ? localePath(l, `/work/${p.slug}`) : undefined,
  cover: p.caseStudy ? caseMedia(p.slug)?.cover : undefined,
})
