import type { Img } from '@/content/cases'

// One row of the /work list (Figma 6951:13221, "03 · Archive"): the 30 cases
// in ALL_PROJECTS order, with what the three open views need (ficha + media).
export type WorkItem = {
  slug: string
  n: string // "04"
  name: string // row name (index name, disambiguated when two rows share it)
  title: string // case title
  kind: string // "Rebrand" (the meta after the year)
  via: string // studio, "Direct" or "Personal project"
  category: string
  role: string
  year: string
  client: string
  studio?: string // ficha.via, only when it came through a studio
  chips: string[]
  lead: string
  cover: Img
  images: Img[]
  open: 'drawer' | 'expand' // per case, see `open` in content/cases.ts
}

// Per-case mode is `WorkItem.open`. ?open=drawer|expand|stage is a dev override
// that forces one mode for every row (not linked anywhere).
export type OpenMode = 'drawer' | 'expand' | 'stage'
export const OPEN_MODES: OpenMode[] = ['drawer', 'expand', 'stage']
