import { CASES, CASE_PROJECTS, caseMedia, projectNumber, projectTotal } from '@/content/cases'
import { caseOg, defaultOg, OG_SIZE, OG_TYPE } from '@/lib/og'

// One card per case, built at build time from its cover (Fresno style).
export const alt = 'Case study by Juan C. Fresno'
export const size = OG_SIZE
export const contentType = OG_TYPE

export function generateStaticParams() {
  return CASE_PROJECTS.map((p) => ({ slug: p.slug }))
}

export const dynamicParams = false

export default async function CaseOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = CASES[slug]
  if (!c) return defaultOg()
  return caseOg({ n: projectNumber(slug), total: projectTotal(), title: c.title, chips: c.chips, year: c.ficha.year, cover: caseMedia(slug)?.cover, slug })
}
