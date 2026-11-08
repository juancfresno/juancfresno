import fs from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'

// Open Graph cards (1200 × 630), rendered at build time with next/og.
// Fresno style: ink background, pearl text, Fragment Mono only (no bold),
// thin rules, G orange as the single accent. Used by (site)/opengraph-image
// (default card) and work/[slug]/opengraph-image (case cover card).

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_TYPE = 'image/png'

const INK = '#10100e'
const PEARL = '#fcfcf7'
const MID = 'rgba(252, 252, 247, 0.6)'
const FAINT = 'rgba(252, 252, 247, 0.38)'
const LINE = '#3c3c3a'
const G = '#ff5c1f'

async function mono() {
  // Fragment Mono (OFL), latin subset in WOFF: satori can't read woff2.
  return fs.readFile(path.join(process.cwd(), 'src/fonts/fragment-mono/fragment-mono-latin-400-normal.woff'))
}

// Case covers are WebP, which satori can't decode: convert to PNG with sharp.
async function coverPng(src: string, w: number, h: number) {
  const sharp = (await import('sharp')).default
  const file = path.join(process.cwd(), 'public', src.replace(/^\//, ''))
  const buf = await sharp(file).resize(w, h, { fit: 'cover', position: 'centre' }).png().toBuffer()
  return `data:image/png;base64,${buf.toString('base64')}`
}

function Frame({ top, children, foot }: { top: [string, string]; children: React.ReactNode; foot: [string, string] }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: INK, color: PEARL, fontFamily: 'Fragment Mono', padding: '48px 56px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', color: MID }}>
        <span>{top[0]}</span>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ width: 10, height: 10, borderRadius: 10, background: G, marginRight: 12 }} />
          {top[1]}
        </span>
      </div>
      <div style={{ display: 'flex', height: 1, background: LINE, marginTop: 20 }} />
      <div style={{ display: 'flex', flex: 1 }}>{children}</div>
      <div style={{ display: 'flex', height: 1, background: LINE, marginBottom: 20 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', color: FAINT }}>
        <span>{foot[0]}</span>
        <span>{foot[1]}</span>
      </div>
    </div>
  )
}

export async function defaultOg() {
  return new ImageResponse(
    (
      <Frame top={['Juan C. Fresno', 'Valencia · Remote']} foot={['juancfresno.com', 'Just enough, done right.']}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 2, textTransform: 'uppercase', color: G, marginBottom: 28 }}>{'{ Hello, I’m Juan C. Fresno'}</div>
          <div style={{ display: 'flex', fontSize: 64, lineHeight: 1.12, letterSpacing: -1.5, maxWidth: 1000 }}>Independent Art Director &amp; Interactive Designer</div>
          <div style={{ display: 'flex', fontSize: 20, letterSpacing: 1.5, textTransform: 'uppercase', color: MID, marginTop: 36 }}>Studios · Agencies · Brands</div>
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts: [{ name: 'Fragment Mono', data: await mono(), weight: 400, style: 'normal' }] }
  )
}

export async function caseOg({ n, total, title, chips, year, cover, slug }: { n: string; total: string; title: string; chips: string[]; year: string; cover?: { src: string }; slug: string }) {
  const IMG_W = 600
  const IMG_H = 438
  const img = cover ? await coverPng(cover.src, IMG_W, IMG_H) : null
  const size = title.length > 14 ? 56 : 72
  return new ImageResponse(
    (
      <Frame top={['Juan C. Fresno', `Work · ${n} / ${total}`]} foot={[`juancfresno.com/work/${slug}`, year]}>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 460 }}>
            <div style={{ display: 'flex', fontSize: 22, color: G, marginBottom: 20 }}>{n}</div>
            <div style={{ display: 'flex', fontSize: size, lineHeight: 1.05, letterSpacing: -1.5 }}>{title}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 28 }}>
              {chips.slice(0, 3).map((c) => (
                <span key={c} style={{ display: 'flex', fontSize: 16, letterSpacing: 1.5, textTransform: 'uppercase', color: MID, border: `1px solid ${LINE}`, borderRadius: 4, padding: '6px 10px', marginRight: 8, marginBottom: 8 }}>{c}</span>
              ))}
            </div>
          </div>
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} width={IMG_W} height={IMG_H} alt="" style={{ width: IMG_W, height: IMG_H, objectFit: 'cover', borderRadius: 4 }} />
          )}
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts: [{ name: 'Fragment Mono', data: await mono(), weight: 400, style: 'normal' }] }
  )
}
