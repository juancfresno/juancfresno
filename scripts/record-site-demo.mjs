// Records a walkthrough of a live site as a looping project thumbnail video
// for the home featured module (content/featured-preview.ts → `video`).
//
//   npm i --no-save playwright-core ffmpeg-static
//   node scripts/record-site-demo.mjs <demo> [out.mp4]      demo = biakone | prolicht | zorrogris
//
// Drives the system Google Chrome headless at the ratio of the screen inside
// the exported frame (the piece's `video.box`), with eased mouse moves, clicks
// and wheel scrolls so the site's own cursor, hovers and transitions show.
// Frames come from the DevTools screencast with their timestamps; ffmpeg turns
// them into a 30 fps, 1024 px, muted h264 (faststart). Every route starts and
// ends on the same view, so the loop is close to seamless. To add a site, add
// an entry to DEMOS (coordinates are viewport px; check them with a screenshot
// first, live sites change).
import { chromium } from 'playwright-core'
import ffmpeg from 'ffmpeg-static'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const DEMOS = {
  // biakone.com: Home → Work (row hovers) → Stickers → Posters → Lab → Manifesto → Home. Frame box 508 × 279.
  biakone: {
    url: 'https://biakone.com/',
    size: [1440, 790],
    out: 'public/home/featured/04-found.mp4',
    crf: 30,
    async run({ p, W, H, move, scroll, wait }) {
      const HREF = { home: '/', work: '/work', stickers: '/stickers', posters: '/posters', lab: '/lab', manifesto: '/about' }
      const nav = async (label) => {
        const href = HREF[label]
        const r = await p.evaluate((href) => {
          const as = [...document.querySelectorAll(`a[href="${href}"]`)].map((a) => a.getBoundingClientRect()).filter((r) => r.width > 0 && r.top < 60 && r.left > 300)
          const r = as.sort((a, b) => a.top - b.top)[0]
          return r && { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        }, href)
        if (!r) throw new Error('no nav link ' + label)
        await move(r.x, r.y, 650); await wait(180)
        await p.mouse.down(); await p.mouse.up()
        await p.waitForURL((u) => u.pathname === href, { timeout: 8000 }).catch(() => {})
        await p.waitForLoadState('networkidle').catch(() => {})
      }
      await move(W * 0.4, H * 0.5, 900); await wait(700)
      await move(W * 0.62, H * 0.4, 900); await wait(900)
      await scroll(1400, 2600); await wait(900)
      await move(W * 0.3, H * 0.55, 800); await wait(500)
      await scroll(1100, 2000); await wait(900)
      await scroll(-2500, 1600); await wait(500)
      await nav('work'); await wait(900)
      for (const row of (await p.locator('li').all()).slice(0, 7)) {
        const bb = await row.boundingBox(); if (!bb || bb.y > H - 60) continue
        await move(Math.min(W * 0.35, bb.x + 200), bb.y + bb.height / 2, 260); await wait(330)
      }
      await wait(500)
      await nav('stickers'); await wait(1100)
      await move(W * 0.5, H * 0.5, 600); await scroll(2600, 3800); await wait(600)
      await nav('posters'); await wait(1100)
      await move(W * 0.62, H * 0.55, 600); await scroll(2000, 3000); await wait(600)
      await nav('lab'); await wait(1000)
      await move(W * 0.15, H * 0.55, 600); await move(W * 0.42, H * 0.62, 900)
      await move(W * 0.25, H * 0.4, 800); await move(W * 0.48, H * 0.5, 900); await wait(700)
      await nav('manifesto'); await wait(1300)
      await move(W * 0.7, H * 0.75, 1000); await wait(1400)
      await nav('home'); await wait(1800)
    },
  },

  // prolicht.at/es: hero slide → Productos mega menu → manifesto → the two panels
  // that trade size on hover → projects carousel (the active one grows) →
  // Soluciones → back up to the hero. Frame box 508 × 324.
  prolicht: {
    url: 'https://www.prolicht.at/es/',
    size: [1440, 918],
    out: 'public/home/featured/01-prolicht.mp4',
    crf: 28,
    async prepare(p) {
      // Hide the floating feedback widget (bottom-left dot).
      await p.evaluate(() => {
        let e = [...document.querySelectorAll('button')].find((x) => /^Feeli/.test(x.textContent.trim()))
        while (e && e !== document.body) { if (getComputedStyle(e).position === 'fixed') { e.style.display = 'none'; break } e = e.parentElement }
      })
    },
    async run({ p, W, H, move, click, scrollToY, wait }) {
      await move(W * 0.45, H * 0.55, 800); await wait(1000)
      await click(1380, 705, 900); await wait(2000) // hero arrow → next slide
      await click(666, 38, 800); await wait(1000) // Productos
      await move(240, 160, 600); await wait(400)
      await move(620, 160, 600); await wait(300)
      await move(950, 160, 600); await wait(400)
      await click(666, 38, 600); await wait(600) // close the menu
      await move(W * 0.55, H * 0.6, 500)
      await scrollToY(900, 2000); await wait(700)
      await scrollToY(1750, 2000); await wait(500)
      await scrollToY(2420, 1800); await wait(300)
      await move(1080, 450, 800); await wait(1300)
      await move(360, 450, 900); await wait(1300)
      await move(1080, 450, 900); await wait(1100)
      await scrollToY(3330, 1700); await wait(500)
      const arrowY = 3599 - (await p.evaluate(() => scrollY)) // carousel arrow, page y 3599
      for (let i = 0; i < 4; i++) { await click(1380, arrowY, i ? 360 : 800); await wait(1250) }
      await move(W * 0.5, H * 0.55, 500)
      await scrollToY(4880, 2200); await wait(900)
      await scrollToY(5800, 2000); await wait(800)
      await scrollToY(0, 2400); await wait(1600)
    },
  },

  // elzorrogris.es: the home hero, then each section's home through the main
  // nav (its dropdown shows on hover; clicking the label opens the section):
  // Finanzas → Salud → Cultura → Ocio, a scroll through the top of each, and
  // the logo back to the home. The home's lower modules are skipped (a layout
  // gap in "Bienestar"). Frame box 421 × 232.
  zorrogris: {
    url: 'https://elzorrogris.es/',
    size: [1440, 792],
    out: 'public/home/featured/07-zorrogris.mp4',
    crf: 28,
    async run({ p, W, H, move, click, scrollToY, wait }) {
      const NAV = [['finance', 272], ['health', 446], ['culture', 626], ['leisure', 826]]
      const toTop = async () => { if ((await p.evaluate(() => scrollY)) > 0) { await scrollToY(0, 1100); await wait(250) } }
      await move(W * 0.4, H * 0.55, 900); await wait(1200)
      for (const [path, x] of NAV) {
        await toTop()
        await move(x, 33, 700); await wait(900) // dropdown
        await click(x, 33, 200)
        await p.waitForURL((u) => u.pathname === '/' + path, { timeout: 8000 }).catch(() => {})
        await p.waitForLoadState('networkidle').catch(() => {})
        await move(W * 0.55, H * 0.55, 600); await wait(700)
        await scrollToY(700, 1800); await wait(700)
        await scrollToY(1500, 1800); await wait(800)
      }
      await toTop()
      await click(93, 33, 800) // logo → home
      await p.waitForURL((u) => u.pathname === '/', { timeout: 8000 }).catch(() => {})
      await move(W * 0.4, H * 0.55, 800); await wait(1400)
    },
  },
}

const name = process.argv[2]
const demo = DEMOS[name]
if (!demo) { console.error(`usage: node scripts/record-site-demo.mjs <${Object.keys(DEMOS).join(' | ')}> [out.mp4]`); process.exit(1) }
const DEST = process.argv[3] || demo.out
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'site-demo-'))
const [W, H] = demo.size

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--hide-scrollbars'] })
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const p = await ctx.newPage()
const wait = (ms) => p.waitForTimeout(ms)
let mx = W * 0.55, my = H * 0.45
// Time-based (not step-based) so pacing holds whatever each CDP round trip costs.
async function move(x, y, ms = 700) {
  const x0 = mx, y0 = my, st = Date.now()
  for (;;) { const k = Math.min(1, (Date.now() - st) / ms); const e = ease(k); await p.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e); if (k >= 1) break; await wait(8) }
  mx = x; my = y
}
async function scroll(px, ms) {
  let done = 0; const st = Date.now()
  for (;;) { const k = Math.min(1, (Date.now() - st) / ms); const t = Math.round(px * ease(k)); if (t !== done) await p.mouse.wheel(0, t - done); done = t; if (k >= 1) break; await wait(8) }
}
const scrollToY = async (y, ms) => scroll(y - (await p.evaluate(() => scrollY)), ms)
const click = async (x, y, ms = 650) => { await move(x, y, ms); await wait(160); await p.mouse.down(); await wait(60); await p.mouse.up() }

await p.goto(demo.url, { waitUntil: 'networkidle' })
await demo.prepare?.(p)
await wait(1500)

const cdp = await ctx.newCDPSession(p)
const frames = []
let t0 = null
cdp.on('Page.screencastFrame', (f) => {
  const ts = f.metadata.timestamp
  if (t0 === null) t0 = ts
  const file = `f${String(frames.length).padStart(5, '0')}.jpg`
  frames.push({ file, t: ts - t0 })
  fs.writeFileSync(`${OUT}/${file}`, Buffer.from(f.data, 'base64'))
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
})
await p.mouse.move(mx, my)
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
await demo.run({ p, W, H, move, scroll, scrollToY, click, wait })
await cdp.send('Page.stopScreencast')
await wait(200)
await b.close()

// Frames → concat list with real durations → constant 30 fps video.
const end = frames[frames.length - 1].t + 0.1
let list = 'ffconcat version 1.0\n'
frames.forEach((f, i) => { list += `file ${f.file}\nduration ${Math.max(0.001, (frames[i + 1]?.t ?? end) - f.t).toFixed(4)}\n` })
list += `file ${frames[frames.length - 1].file}\n`
fs.writeFileSync(`${OUT}/list.txt`, list)
execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'concat', '-i', `${OUT}/list.txt`,
  '-vf', 'fps=30,scale=1024:-2:flags=lanczos', '-an', '-c:v', 'libx264', '-crf', String(demo.crf ?? 30), '-preset', 'veryslow',
  '-tune', 'film', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', DEST], { stdio: 'inherit' })
fs.rmSync(OUT, { recursive: true, force: true })
console.log(`${DEST} · ${frames.length} frames · ${end.toFixed(1)} s`)
