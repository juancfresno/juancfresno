import { defaultOg, OG_SIZE, OG_TYPE } from '@/lib/og'

// Default card for every page; cases override it in work/[slug]/.
export const alt = 'Juan C. Fresno — Independent Art Director & Interactive Designer'
export const size = OG_SIZE
export const contentType = OG_TYPE

export default function OpengraphImage() {
  return defaultOg()
}
