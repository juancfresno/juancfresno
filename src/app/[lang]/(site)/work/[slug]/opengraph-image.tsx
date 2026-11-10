import { getCases, CASE_PROJECT_SLUGS, caseMedia, projectNumber, projectTotal } from '@/content/cases'
import { caseOg, defaultOg, OG_SIZE, OG_TYPE } from '@/lib/og'
import { isLocale, LOCALES, DEFAULT_LOCALE } from '@/i18n/config'

// One card per case and language, built at build time from its cover.
export const alt = 'Case study by Juan C. Fresno · Caso de estudio de Juan C. Fresno'
export const size = OG_SIZE
export const contentType = OG_TYPE

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => CASE_PROJECT_SLUGS.map((slug) => ({ lang, slug })))
}

export const dynamicParams = false

export default async function CaseOpengraphImage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params
  const l = isLocale(lang) ? lang : DEFAULT_LOCALE
  const c = getCases(l)[slug]
  if (!c) return defaultOg(l)
  return caseOg({ locale: l, n: projectNumber(slug), total: projectTotal(), title: c.title, chips: c.chips, year: c.ficha.year, cover: caseMedia(slug)?.cover, slug })
}
