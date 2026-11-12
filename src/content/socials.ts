// Social profiles and their hover clips (locale-neutral, safe for client bundles).

export const SOCIALS = [
  { id: 'behance', label: 'Behance', href: 'https://www.behance.net/juancfresno' },
  { id: 'dribbble', label: 'Dribbble', href: 'https://dribbble.com/JuanCFresno' },
  { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/juanc.fresno' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/juancfresno' },
  { id: 'x', label: 'X', href: 'https://x.com/JuanCFresno' },
] as const

export type SocialId = (typeof SOCIALS)[number]['id']

// Anything with `data-social="<id>"` can show a preview: the social links plus
// the footer location ("valencia", no link) and the About photo ("juan").
export type PreviewId = SocialId | 'valencia' | 'juan'

export type PreviewMeta = {
  webm?: string
  mp4?: string
  poster?: string
  // Display size in css px (default 256 × 160). Encode the files at 2x.
  w?: number
  h?: number
  // Fixed chip text. Without it the chip is built from the link
  // ("BEHANCE ↗ @juancfresno · 03/05").
  label?: string
}

// Hover previews of each profile (footer + close/contact links, see
// components/ui/SocialPreview). Files live in public/social/. A network with
// no entry shows nothing; one with only a poster shows the still image.
export const SOCIAL_PREVIEWS: Partial<Record<PreviewId, PreviewMeta>> = {
  behance:   { webm: '/social/behance.webm',   mp4: '/social/behance.mp4',   poster: '/social/behance.jpg' },
  dribbble:  { webm: '/social/dribbble.webm',  mp4: '/social/dribbble.mp4',  poster: '/social/dribbble.jpg' },
  instagram: { webm: '/social/instagram.webm', mp4: '/social/instagram.mp4', poster: '/social/instagram.jpg' },
  linkedin:  { webm: '/social/linkedin.webm',  mp4: '/social/linkedin.mp4',  poster: '/social/linkedin.jpg' },
  x:         { webm: '/social/x.webm',         mp4: '/social/x.mp4',         poster: '/social/x.jpg' },
  // Footer location: vertical 9:16 clip (448 × 800 files, shown at 224 × 400).
  valencia:  { webm: '/social/valencia.webm',  mp4: '/social/valencia.mp4',  poster: '/social/valencia.jpg', w: 224, h: 400, label: 'VALENCIA · 39.6649° N, 0.2126° W' },
  // About, "working independently": a still photo (poster only, 16:9, 640 × 360 file shown at 320 × 180).
  juan:      { poster: '/social/juan.webp', w: 320, h: 180, label: 'JUAN C. FRESNO · VALENCIA' },
}
