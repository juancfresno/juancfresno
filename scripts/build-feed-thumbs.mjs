// Feed canvas: 600px thumbnails (textures for the WebGL canvas on /feed).
// Reads src/content/generated/feed.json and public/feed/*.webp (already in the repo)
// and writes public/feed/t/<id>.webp. Run after scripts/build-media.mjs:
//   node scripts/build-feed-thumbs.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const feed = JSON.parse(fs.readFileSync(path.join(root, 'src/content/generated/feed.json'), 'utf8'))
const out = path.join(root, 'public/feed/t')
fs.mkdirSync(out, { recursive: true })

let n = 0
for (const f of feed) {
  const src = path.join(root, 'public', f.src)
  const dest = path.join(out, `${f.id}.webp`)
  if (!fs.existsSync(src) || fs.existsSync(dest)) continue
  await sharp(src).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 74 }).toFile(dest)
  n++
}
console.log(`${n} new thumbnails → public/feed/t/ (${feed.length} pieces)`)
