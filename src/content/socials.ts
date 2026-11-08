// Social profiles and their hover clips (locale-neutral, safe for client bundles).

export const SOCIALS = [
  { id: 'behance', label: 'Behance', href: 'https://www.behance.net/juancfresno' },
  { id: 'dribbble', label: 'Dribbble', href: 'https://dribbble.com/JuanCFresno' },
  { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/juanc.fresno' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/juancfresno' },
  { id: 'x', label: 'X', href: 'https://x.com/JuanCFresno' },
] as const

export type SocialId = (typeof SOCIALS)[number]['id']

// Hover previews of each profile (footer + close/contact links, see
// components/ui/SocialPreview). Files live in public/social/. A network with
// no entry shows nothing; one with only a poster shows the still image.
export const SOCIAL_PREVIEWS: Partial<Record<SocialId, { webm?: string; mp4?: string; poster?: string }>> = {
  behance:   { webm: '/social/behance.webm',   mp4: '/social/behance.mp4',   poster: '/social/behance.jpg' },
  dribbble:  { webm: '/social/dribbble.webm',  mp4: '/social/dribbble.mp4',  poster: '/social/dribbble.jpg' },
  instagram: { webm: '/social/instagram.webm', mp4: '/social/instagram.mp4', poster: '/social/instagram.jpg' },
  linkedin:  { webm: '/social/linkedin.webm',  mp4: '/social/linkedin.mp4',  poster: '/social/linkedin.jpg' },
  x:         { webm: '/social/x.webm',         mp4: '/social/x.mp4',         poster: '/social/x.jpg' },
}
