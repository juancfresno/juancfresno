import { defaultOg, OG_SIZE, OG_TYPE } from '@/lib/og'

// Same default card as (site)/opengraph-image: a page that sets its own
// openGraph object doesn't inherit the parent's file-based image.
export const alt = 'Juan C. Fresno — Independent Art Director & Interactive Designer'
export const size = OG_SIZE
export const contentType = OG_TYPE

export default function OpengraphImage() {
  return defaultOg()
}
