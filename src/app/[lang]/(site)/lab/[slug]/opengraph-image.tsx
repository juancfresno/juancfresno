import { EXPERIMENT_SLUGS } from '@/content/site'
import { defaultOg, OG_SIZE, OG_TYPE } from '@/lib/og'
import { isLocale, LOCALES, DEFAULT_LOCALE } from '@/i18n/config'

// Same default card as (site)/opengraph-image (built at build time).
export const alt = 'Juan C. Fresno — Independent Art Director & Interactive Designer'
export const size = OG_SIZE
export const contentType = OG_TYPE

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => EXPERIMENT_SLUGS.map((slug) => ({ lang, slug })))
}

export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return defaultOg(isLocale(lang) ? lang : DEFAULT_LOCALE)
}
