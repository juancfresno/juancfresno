// Lab 003 · Galerías: items.json + 600px thumbnails from the feed media.
// Reads src/content/generated/feed.json and public/feed/*.webp (already in the repo).
// Run: node scripts/build-lab-galerias.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const feed = JSON.parse(fs.readFileSync(path.join(root, 'src/content/generated/feed.json'), 'utf8'))
const out = path.join(root, 'public/lab/galerias')
fs.mkdirSync(path.join(out, 't'), { recursive: true })

const items = []
for (const f of feed) {
  const src = path.join(root, 'public', f.src)
  if (!fs.existsSync(src)) continue
  const th = `/lab/galerias/t/${f.id}.webp`
  const dest = path.join(root, 'public', th)
  if (!fs.existsSync(dest)) await sharp(src).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 72 }).toFile(dest)
  const [y, m] = f.date.split('-')
  items.push({ id: f.id, t: f.title.trim(), d: `${m}/${y}`, src: f.src, th, w: f.w, h: f.h, url: f.url })
}
fs.writeFileSync(path.join(out, 'items.json'), JSON.stringify(items))
console.log(`${items.length} items → public/lab/galerias/items.json`)
