// Builds the WebP media for /work/[slug] and /feed from the local source
// folders (outside the repo) and writes the dimension manifests the pages read.
//
//   node scripts/build-media.mjs
//
// Sources (not committed):
//   CASES_DIR  (default /home/claude/cases)  <slug>/manifest.json + 01…NN
//   FEED_DIR   (default /home/claude/feed)   manifest.json + dribbble/ instagram/
//   SHOE_DIR   Shoeciety originals exported from Figma (raw_NN_1)
//
// Output (committed):
//   public/work/<slug>/NN.webp   max 1600 px wide, q80 (+ cover.webp, 800 px)
//   public/feed/<id>.webp        max 900 px wide, q78
//   public/feed/_dither.png      tiny tile for the monochrome feed overlay
//   src/content/generated/cases-media.json, feed.json
//
// The image order and count of each case follow its "Behance · bloque" in
// Figma (file AXxkCCuckrXGKDUCk8lNyQ, page ↪ Casos). Dropped there, dropped
// here: Dinamo without its 12th image, Google without its 17th, and the pure
// "Thanks for watching" slides of the Behance imports (DROP below). GIFs use
// the first frame, as in Figma.
//
//   ONLY=murmur,drip node scripts/build-media.mjs cases   rebuild some slugs,
//   keeping every other entry of cases-media.json (and its files) as it is.

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const CASES_DIR = process.env.CASES_DIR || '/home/claude/cases'
const FEED_DIR = process.env.FEED_DIR || '/home/claude/feed'
const SHOE_DIR = process.env.SHOE_DIR || ''
const CASE_W = 1600, CASE_Q = 80
const FEED_W = 900, FEED_Q = 78

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const ensure = (d) => fs.mkdirSync(d, { recursive: true })
const pad = (n) => String(n).padStart(2, '0')

async function toWebp(src, out, maxW, q) {
  const img = sharp(src, { animated: false, pages: 1 }).rotate()
  const meta = await img.metadata()
  const w = Math.min(maxW, meta.width)
  const info = await img.resize({ width: w, withoutEnlargement: true }).webp({ quality: q, effort: 5 }).toFile(out)
  return { w: info.width, h: info.height, bytes: info.size }
}

function caseFiles(slug) {
  // Returns ordered absolute source paths for one case.
  const pick = (dir, list) => list.map((f) => path.join(dir, f))
  const gif = (dir, f) => {
    const frame0 = path.join(dir, f.replace(/\.gif$/, '-frame0.png'))
    return f.endsWith('.gif') && fs.existsSync(frame0) ? frame0 : path.join(dir, f)
  }
  if (slug === 'shoeciety') {
    if (!SHOE_DIR) return null
    return Array.from({ length: 13 }, (_, i) => path.join(SHOE_DIR, `raw_${pad(i + 1)}_1`))
  }
  if (slug === 'access' || slug === 'educa-projects') {
    const sub = slug === 'access' ? 'access' : 'educa'
    const m = readJSON(path.join(CASES_DIR, 'access-educa/manifest.json'))
    const imgs = m.projects.flatMap((p) => p.images).filter((i) => i.file.startsWith(sub + '/'))
    return pick(path.join(CASES_DIR, 'access-educa'), imgs.map((i) => i.file))
  }
  const dir = path.join(CASES_DIR, slug)
  const m = readJSON(path.join(dir, 'manifest.json'))
  let imgs = m.images ?? m.projects.flatMap((p) => p.images)
  imgs = [...imgs].sort((a, b) => a.order - b.order)
  if (slug === 'dinamo') imgs = imgs.slice(0, 11)
  if (slug === 'google') imgs = imgs.slice(0, 16)
  if (DROP[slug]) imgs = imgs.filter((i) => !DROP[slug].includes(i.order))
  return imgs.map((i) => gif(dir, i.file))
}

// Behance order numbers of pure "Thanks for watching" slides (dropped in Figma).
const DROP = { '15-bodegas-web': [10], '15-bodegas-branding': [10], 'bunkr-branding': [12], 'push-for-burger': [11] }

// Cover = image 01 unless a cleaner one is set here (1-based, after DROP).
// Bunkr: 01 is a text slide over a photo; 07 is the wordmark on black.
const COVER = { 'bunkr-branding': 7 }

const CASE_SLUGS = [
  'shoeciety', 'signflow', 'likitech', 'access', 'educa-projects', 'dinamo', 'bonamar', 'awen', 'correos', 'selected-logos', 'casa-carbon', 'google', 'super-nintendo',
  // Behance imports, 10 Nov 2026 (refs/casos-nuevos-grupo1.md, grupo2.md)
  'murmur', 'dior-backstage', 'hm', 'workout-app', 'drip', 'wubalu', 'entradium', '15-bodegas-web', '15-bodegas-branding',
  'bunkr-app', 'bunkr-branding', 'roadis', 'push-for-burger', 'icommunity', 'erare', 'madrid-buildings', 'biako-poster',
]
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map((x) => x.trim()) : null

async function buildCases() {
  const outJSON = path.join(ROOT, 'src/content/generated/cases-media.json')
  const prev = fs.existsSync(outJSON) ? readJSON(outJSON) : {}
  const result = {}
  let total = 0
  for (const slug of CASE_SLUGS) {
    if (ONLY && !ONLY.includes(slug)) { result[slug] = prev[slug]; continue }
    const files = caseFiles(slug)
    if (!files) { result[slug] = prev[slug]; console.log(`skip ${slug} (no source, kept previous)`); continue }
    const outDir = path.join(ROOT, 'public/work', slug)
    ensure(outDir)
    const images = []
    for (const [i, src] of files.entries()) {
      const name = `${pad(i + 1)}.webp`
      const r = await toWebp(src, path.join(outDir, name), CASE_W, CASE_Q)
      total += r.bytes
      images.push({ src: `/work/${slug}/${name}`, w: r.w, h: r.h })
    }
    const c = await toWebp(files[(COVER[slug] ?? 1) - 1], path.join(outDir, 'cover.webp'), 800, 76)
    total += c.bytes
    result[slug] = { cover: { src: `/work/${slug}/cover.webp`, w: c.w, h: c.h }, images }
    console.log(`${slug}: ${images.length} images`)
  }
  ensure(path.dirname(outJSON))
  fs.writeFileSync(outJSON, JSON.stringify(result, null, 1) + '\n')
  return total
}

// ─── Feed ────────────────────────────────────────────────────────────────────
const isBiako = (i) => /biak/i.test(`${i.title} ${i.url}`)

async function buildFeed() {
  const m = readJSON(path.join(FEED_DIR, 'manifest.json'))
  const items = m.items.filter((i) => !i.duplicate_of && !isBiako(i))
  const outDir = path.join(ROOT, 'public/feed')
  ensure(outDir)
  const out = []
  let total = 0
  for (const i of items) {
    const id = path.basename(i.file).replace(/\.[a-z0-9]+$/i, '')
    const r = await toWebp(path.join(FEED_DIR, i.file), path.join(outDir, `${id}.webp`), FEED_W, FEED_Q)
    total += r.bytes
    const d = new Date(i.date)
    out.push({
      id,
      title: i.title.trim(),
      url: i.url,
      source: i.source,
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      src: `/feed/${id}.webp`,
      w: r.w,
      h: r.h,
    })
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  // Dither tile: 4×4 Bayer matrix, scaled ×1, used as a multiply overlay.
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
  const px = Buffer.alloc(4 * 4 * 4)
  bayer.forEach((v, k) => { const g = 140 + Math.round((v / 15) * 115); px.set([g, g, g, 255], k * 4) })
  await sharp(px, { raw: { width: 4, height: 4, channels: 4 } }).png().toFile(path.join(outDir, '_dither.png'))
  fs.writeFileSync(path.join(ROOT, 'src/content/generated/feed.json'), JSON.stringify(out, null, 1) + '\n')
  console.log(`feed: ${out.length} items`)
  return total
}

const which = process.argv[2]
let bytes = 0
if (!which || which === 'cases') bytes += await buildCases()
if (!which || which === 'feed') bytes += await buildFeed()
console.log(`written: ${(bytes / 1024 / 1024).toFixed(1)} MB`)
