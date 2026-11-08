import { EXPERIMENTS } from '@/content/site'
import { defaultOg, OG_SIZE, OG_TYPE } from '@/lib/og'

// Same default card as (site)/opengraph-image (built at build time).
export const alt = 'Juan C. Fresno — Independent Art Director & Interactive Designer'
export const size = OG_SIZE
export const contentType = OG_TYPE

export function generateStaticParams() {
  return EXPERIMENTS.map((e) => ({ slug: e.slug }))
}

export default function OpengraphImage() {
  return defaultOg()
}
